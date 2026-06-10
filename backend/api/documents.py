import os
import shutil
import logging
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from db.postgres import get_db
from db.redis_client import redis_client
from middleware.auth import get_current_user
from models.document import Document
from models.user import User
from ingestion.pdf_processor import process_pdf_file
from ingestion.chunker import chunk_document
from ingestion.embedder import embed_and_store
from ingestion.graph_builder import build_graph

logger = logging.getLogger(__name__)
router = APIRouter()


class DocumentOut(BaseModel):
    id: str
    filename: str
    title: str | None
    author: str | None
    page_count: int | None
    file_size_kb: int | None


async def _process_document(doc_id: str, file_path: str, user_id: str, db_doc: Document):
    try:
        markdown, metadata = process_pdf_file(file_path)
        metadata["user_id"] = user_id
        metadata["doc_id"] = doc_id
        chunks = chunk_document(markdown, metadata)
        embed_and_store(chunks, source="user_upload", user_id=user_id)
        build_graph(metadata, chunks, user_id=user_id)
        logger.info(f"Document {doc_id} processed successfully.")
    except Exception as e:
        logger.error(f"Document {doc_id} processing failed: {e}")


@router.post("", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    content = await file.read()
    if len(content) > max_bytes:
        raise HTTPException(status_code=413, detail=f"File exceeds {settings.max_upload_size_mb}MB limit")

    os.makedirs(settings.upload_dir, exist_ok=True)
    doc = Document(user_id=current_user.id, filename=file.filename, file_size_kb=len(content) // 1024)
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    file_path = os.path.join(settings.upload_dir, f"{doc.id}.pdf")
    with open(file_path, "wb") as f:
        f.write(content)

    background_tasks.add_task(_process_document, doc.id, file_path, current_user.id, doc)
    return DocumentOut(id=doc.id, filename=doc.filename, title=doc.title, author=doc.author,
                       page_count=doc.page_count, file_size_kb=doc.file_size_kb)


@router.get("", response_model=list[DocumentOut])
async def list_documents(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).where(Document.user_id == current_user.id))
    docs = result.scalars().all()
    return [DocumentOut(id=d.id, filename=d.filename, title=d.title, author=d.author,
                        page_count=d.page_count, file_size_kb=d.file_size_kb) for d in docs]


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(doc_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).where(Document.id == doc_id, Document.user_id == current_user.id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    await db.delete(doc)
    await db.commit()

    file_path = os.path.join(settings.upload_dir, f"{doc_id}.pdf")
    if os.path.exists(file_path):
        os.remove(file_path)
