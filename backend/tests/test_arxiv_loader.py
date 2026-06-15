import pytest
from ingestion.arxiv_loader import fetch_arxiv_papers


@pytest.mark.asyncio
async def test_fetch_arxiv_papers_returns_results():
    papers = await fetch_arxiv_papers("RAG retrieval augmented generation", limit=3)
    assert len(papers) == 3
    assert all("title" in p for p in papers)
    assert all("pdf_url" in p for p in papers)
    assert all("authors" in p for p in papers)


@pytest.mark.asyncio
async def test_fetch_arxiv_papers_structure():
    papers = await fetch_arxiv_papers("transformers attention", limit=1)
    paper = papers[0]
    assert "arxiv_id" in paper
    assert "abstract" in paper
    assert "published_date" in paper
    assert isinstance(paper["authors"], list)
