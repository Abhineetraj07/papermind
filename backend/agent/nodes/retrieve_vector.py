from openai import OpenAI
from config import settings
from agent.state import AgentState
from db.chroma_client import chroma_client, PAPERS_COLLECTION, DOCUMENTS_COLLECTION

_client = OpenAI(api_key=settings.openai_api_key)


def _embed(text: str) -> list[float]:
    resp = _client.embeddings.create(model="text-embedding-3-small", input=text)
    return resp.data[0].embedding


def retrieve_vector_node(state: AgentState) -> dict:
    query_embedding = _embed(state["question"])
    user_id = state["user_id"]

    user_filter = {"$or": [{"source": "arxiv"}, {"user_id": user_id}]}

    # Query both collections, merge results
    chunks = []
    for collection_name in (PAPERS_COLLECTION, DOCUMENTS_COLLECTION):
        collection = chroma_client.get_collection(collection_name)
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=5,
            where=user_filter,
            include=["documents", "metadatas", "distances"],
        )
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            chunks.append({
                "text": doc,
                "metadata": meta,
                "score": 1 - dist,  # convert distance to similarity
            })

    chunks.sort(key=lambda x: x["score"], reverse=True)
    return {"retrieved_chunks": chunks[:8]}
