import logging
import chromadb
from chromadb import Collection
from config import settings

logger = logging.getLogger(__name__)

PAPERS_COLLECTION = "papers"
DOCUMENTS_COLLECTION = "documents"


class ChromaClient:
    def __init__(self):
        self._client = None

    def connect(self):
        self._client = chromadb.HttpClient(
            host=settings.chroma_host,
            port=settings.chroma_port,
        )
        self._client.get_or_create_collection(PAPERS_COLLECTION)
        self._client.get_or_create_collection(DOCUMENTS_COLLECTION)
        logger.info("ChromaDB connected.")

    def get_collection(self, name: str) -> Collection:
        if not self._client:
            raise RuntimeError("ChromaDB not connected")
        return self._client.get_or_create_collection(name)

    @property
    def papers(self) -> Collection:
        return self.get_collection(PAPERS_COLLECTION)

    @property
    def documents(self) -> Collection:
        return self.get_collection(DOCUMENTS_COLLECTION)


chroma_client = ChromaClient()
