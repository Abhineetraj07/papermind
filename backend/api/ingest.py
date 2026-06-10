import uuid
import logging
from fastapi import APIRouter, BackgroundTasks, Depends, Query
from pydantic import BaseModel

from db.redis_client import redis_client
from middleware.auth import get_current_user
from models.user import User
from ingestion.arxiv_loader import fetch_arxiv_papers
from ingestion.pdf_processor import process_pdf_url
from ingestion.chunker import chunk_document
from ingestion.embedder import embed_and_store
from ingestion.graph_builder import build_graph

logger = logging.getLogger(__name__)
router = APIRouter()


class IngestResponse(BaseModel):
    job_id: str
    message: str


class JobStatus(BaseModel):
    job_id: str
    status: str
    papers_processed: int = 0
    error: str | None = None


async def _run_ingestion(job_id: str, topic: str, limit: int):
    try:
        await redis_client.set_json(f"job:{job_id}", {"status": "running", "papers_processed": 0})
        papers = await fetch_arxiv_papers(topic, limit)

        for i, paper in enumerate(papers):
            markdown, metadata = await process_pdf_url(paper["pdf_url"], paper)
            chunks = chunk_document(markdown, metadata)
            embed_and_store(chunks, source="arxiv")
            build_graph(paper, chunks)
            await redis_client.set_json(f"job:{job_id}", {"status": "running", "papers_processed": i + 1})

        await redis_client.set_json(f"job:{job_id}", {"status": "completed", "papers_processed": len(papers)}, ttl=3600)
    except Exception as e:
        logger.error(f"Ingestion job {job_id} failed: {e}")
        await redis_client.set_json(f"job:{job_id}", {"status": "failed", "papers_processed": 0, "error": str(e)}, ttl=3600)


@router.post("", response_model=IngestResponse)
async def ingest(
    background_tasks: BackgroundTasks,
    topic: str = Query(..., description="Topic to search on arXiv"),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
):
    job_id = str(uuid.uuid4())
    background_tasks.add_task(_run_ingestion, job_id, topic, limit)
    return IngestResponse(job_id=job_id, message=f"Ingestion started for topic '{topic}'")


@router.get("/status/{job_id}", response_model=JobStatus)
async def ingest_status(job_id: str, current_user: User = Depends(get_current_user)):
    status = await redis_client.get_json(f"job:{job_id}")
    if not status:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Job not found")
    return JobStatus(job_id=job_id, **status)
