import os
import tempfile
import httpx
import fitz  # PyMuPDF
import pymupdf4llm


def _extract_metadata(pdf_path: str) -> dict:
    doc = fitz.open(pdf_path)
    meta = doc.metadata
    return {
        "title": meta.get("title") or "",
        "author": meta.get("author") or "",
        "keywords": meta.get("keywords") or "",
        "page_count": doc.page_count,
        "file_size_kb": os.path.getsize(pdf_path) // 1024,
    }


def _to_markdown(pdf_path: str) -> str:
    return pymupdf4llm.to_markdown(pdf_path)


def process_pdf_file(file_path: str) -> tuple[str, dict]:
    metadata = _extract_metadata(file_path)
    markdown = _to_markdown(file_path)
    return markdown, metadata


async def process_pdf_url(url: str, paper_metadata: dict) -> tuple[str, dict]:
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.get(url)
        response.raise_for_status()

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(response.content)
        tmp_path = tmp.name

    try:
        markdown = _to_markdown(tmp_path)
        pdf_meta = _extract_metadata(tmp_path)
        # arXiv metadata takes precedence over PDF metadata
        merged = {**pdf_meta, **paper_metadata}
        return markdown, merged
    finally:
        os.unlink(tmp_path)
