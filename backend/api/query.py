import hashlib
import json
import uuid
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from db.redis_client import redis_client
from middleware.auth import get_current_user
from models.user import User
from agent.graph_agent import run_agent

router = APIRouter()


class QueryRequest(BaseModel):
    question: str
    session_id: str | None = None


class Source(BaseModel):
    title: str
    source: str
    chunk_text: str


class ScoresOut(BaseModel):
    context_relevance: float
    faithfulness: float
    answer_relevance: float
    hallucination_detected: bool


class QueryResponse(BaseModel):
    answer: str
    session_id: str
    sources: list[Source]
    scores: ScoresOut
    retries: int
    cached: bool = False


@router.post("/query", response_model=QueryResponse)
async def query(body: QueryRequest, current_user: User = Depends(get_current_user)):
    session_id = body.session_id or str(uuid.uuid4())

    # Check cache
    cache_key = f"cache:{hashlib.md5(f'{current_user.id}:{body.question}'.encode()).hexdigest()}"
    cached = await redis_client.get_json(cache_key)
    if cached:
        cached["cached"] = True
        cached["session_id"] = session_id
        return QueryResponse(**cached)

    # Load conversation history
    history = await redis_client.get_list(f"session:{current_user.id}:{session_id}")

    result = await run_agent(
        question=body.question,
        user_id=current_user.id,
        session_id=session_id,
        history=history,
    )

    # Save to session history
    await redis_client.append_to_list(
        f"session:{current_user.id}:{session_id}",
        {"role": "user", "content": body.question},
    )
    await redis_client.append_to_list(
        f"session:{current_user.id}:{session_id}",
        {"role": "assistant", "content": result["answer"]},
    )

    response = QueryResponse(
        answer=result["answer"],
        session_id=session_id,
        sources=[Source(**s) for s in result["sources"]],
        scores=ScoresOut(**result["scores"]),
        retries=result["retry_count"],
    )

    # Cache for 1 hour
    await redis_client.set_json(cache_key, response.model_dump(), ttl=3600)
    return response
