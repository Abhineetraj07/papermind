from fastapi import APIRouter, Depends
from pydantic import BaseModel

from db.neo4j_client import neo4j_client
from middleware.auth import get_current_user
from models.user import User

router = APIRouter()


class GraphNode(BaseModel):
    name: str
    type: str


class GraphEdge(BaseModel):
    source: str
    target: str
    relationship: str


class GraphResponse(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]


@router.get("/explore", response_model=GraphResponse)
async def explore(entity: str, current_user: User = Depends(get_current_user)):
    records = neo4j_client.run(
        """
        MATCH (n {name: $name})-[r]-(m)
        RETURN n.name AS source, type(r) AS relationship, m.name AS target, labels(m)[0] AS target_type
        LIMIT 50
        """,
        name=entity,
    )
    nodes, edges = {entity: "Unknown"}, []
    for r in records:
        nodes[r["target"]] = r["target_type"]
        edges.append(GraphEdge(source=r["source"], target=r["target"], relationship=r["relationship"]))
    return GraphResponse(
        nodes=[GraphNode(name=n, type=t) for n, t in nodes.items()],
        edges=edges,
    )


@router.get("/authors/{name}")
async def papers_by_author(name: str, current_user: User = Depends(get_current_user)):
    return neo4j_client.run(
        "MATCH (p:Paper)-[:AUTHORED_BY]->(a:Author {name: $name}) RETURN p.title AS title, p.arxiv_id AS arxiv_id",
        name=name,
    )


@router.get("/concepts/{name}")
async def papers_by_concept(name: str, current_user: User = Depends(get_current_user)):
    return neo4j_client.run(
        "MATCH (p:Paper)-[:HAS_KEYWORD]->(c:Concept {name: $name}) RETURN p.title AS title, p.arxiv_id AS arxiv_id",
        name=name,
    )
