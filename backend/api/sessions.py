from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from db.redis_client import redis_client
from middleware.auth import get_current_user
from models.user import User

router = APIRouter()


class Message(BaseModel):
    role: str
    content: str


@router.get("/{session_id}", response_model=list[Message])
async def get_session(session_id: str, current_user: User = Depends(get_current_user)):
    messages = await redis_client.get_list(f"session:{current_user.id}:{session_id}")
    if not messages:
        raise HTTPException(status_code=404, detail="Session not found")
    return [Message(**m) for m in messages]


@router.delete("/{session_id}", status_code=204)
async def delete_session(session_id: str, current_user: User = Depends(get_current_user)):
    await redis_client.delete(f"session:{current_user.id}:{session_id}")
