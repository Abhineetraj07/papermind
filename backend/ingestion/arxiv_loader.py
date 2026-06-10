import asyncio
import arxiv


async def fetch_arxiv_papers(topic: str, limit: int = 10) -> list[dict]:
    def _fetch():
        client = arxiv.Client()
        search = arxiv.Search(query=topic, max_results=limit, sort_by=arxiv.SortCriterion.Relevance)
        papers = []
        for result in client.results(search):
            papers.append({
                "arxiv_id": result.entry_id.split("/")[-1],
                "title": result.title,
                "authors": [a.name for a in result.authors],
                "abstract": result.summary,
                "keywords": [c.term for c in result.categories],
                "published_date": result.published.isoformat(),
                "pdf_url": result.pdf_url,
            })
        return papers

    return await asyncio.to_thread(_fetch)
