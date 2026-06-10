from fastapi import APIRouter
from db.neo4j_client import neo4j_client
from db.chroma_client import chroma_client
from db.redis_client import redis_client

router = APIRouter()


@router.get("/health")
async def health():
    checks = {}

    try:
        neo4j_client.run("RETURN 1")
        checks["neo4j"] = "ok"
    except Exception:
        checks["neo4j"] = "error"

    try:
        chroma_client.papers
        checks["chromadb"] = "ok"
    except Exception:
        checks["chromadb"] = "error"

    try:
        await redis_client.client.ping()
        checks["redis"] = "ok"
    except Exception:
        checks["redis"] = "error"

    overall = "ok" if all(v == "ok" for v in checks.values()) else "degraded"
    return {"status": overall, "services": checks}
