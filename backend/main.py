import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from api import auth, documents, graph, health, ingest, query, sessions
from db.chroma_client import chroma_client
from db.neo4j_client import neo4j_client
from db.postgres import create_tables
from db.redis_client import redis_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting PaperMind...")
    await create_tables()
    await redis_client.connect()
    neo4j_client.connect()
    chroma_client.connect()
    logger.info("All services connected.")
    yield
    await redis_client.disconnect()
    neo4j_client.disconnect()
    logger.info("PaperMind shut down.")


app = FastAPI(title="PaperMind", version="1.0.0", lifespan=lifespan)

app.include_router(health.router)
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(ingest.router, prefix="/ingest", tags=["ingest"])
app.include_router(documents.router, prefix="/documents", tags=["documents"])
app.include_router(query.router, tags=["query"])
app.include_router(graph.router, prefix="/graph", tags=["graph"])
app.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
