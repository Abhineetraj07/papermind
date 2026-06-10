from openai import OpenAI
from config import settings
from db.chroma_client import chroma_client, PAPERS_COLLECTION, DOCUMENTS_COLLECTION

_client = OpenAI(api_key=settings.openai_api_key)
_BATCH_SIZE = 100


def _embed_batch(texts: list[str]) -> list[list[float]]:
    resp = _client.embeddings.create(model="text-embedding-3-small", input=texts)
    return [d.embedding for d in resp.data]


def embed_and_store(chunks: list[dict], source: str, user_id: str | None = None):
    collection = chroma_client.papers if source == "arxiv" else chroma_client.documents

    for i in range(0, len(chunks), _BATCH_SIZE):
        batch = chunks[i : i + _BATCH_SIZE]
        texts = [c["text"] for c in batch]
        embeddings = _embed_batch(texts)

        ids = [c["id"] for c in batch]
        metadatas = []
        for c in batch:
            meta = {**c["metadata"], "source": source, "parent_id": c["parent_id"]}
            if user_id:
                meta["user_id"] = user_id
            metadatas.append(meta)

        collection.add(ids=ids, embeddings=embeddings, documents=texts, metadatas=metadatas)
