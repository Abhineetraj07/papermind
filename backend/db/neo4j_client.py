import logging
from neo4j import GraphDatabase, Driver
from config import settings

logger = logging.getLogger(__name__)


class Neo4jClient:
    def __init__(self):
        self._driver: Driver | None = None

    def connect(self):
        self._driver = GraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password),
        )
        self._driver.verify_connectivity()
        logger.info("Neo4j connected.")

    def disconnect(self):
        if self._driver:
            self._driver.close()

    @property
    def driver(self) -> Driver:
        if not self._driver:
            raise RuntimeError("Neo4j not connected")
        return self._driver

    def run(self, query: str, **params) -> list[dict]:
        with self._driver.session() as session:
            result = session.run(query, **params)
            return [record.data() for record in result]


neo4j_client = Neo4jClient()
