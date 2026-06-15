from fastapi import APIRouter, Depends
from pydantic import BaseModel

from db.neo4j_client import neo4j_client
from middleware.auth import get_current_user
from models.user import User

router = APIRouter()


class GraphNode(BaseModel):
    id: str
    label: str
    type: str


class GraphEdge(BaseModel):
    source: str
    target: str
    relationship: str


class GraphResponse(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]


@router.get("/overview", response_model=GraphResponse)
async def overview(current_user: User = Depends(get_current_user)):
    records = neo4j_client.run("""
        MATCH (n)-[r]->(m)
        RETURN
            coalesce(n.name, n.title, 'unknown') AS source_id,
            coalesce(n.title, n.name, 'unknown') AS source_label,
            labels(n)[0] AS source_type,
            type(r) AS relationship,
            coalesce(m.name, m.title, 'unknown') AS target_id,
            coalesce(m.title, m.name, 'unknown') AS target_label,
            labels(m)[0] AS target_type
        LIMIT 120
    """)
    nodes: dict[str, GraphNode] = {}
    edges: list[GraphEdge] = []
    for rec in records:
        sid, tid = rec["source_id"], rec["target_id"]
        if sid not in nodes:
            nodes[sid] = GraphNode(id=sid, label=rec["source_label"], type=rec["source_type"] or "Unknown")
        if tid not in nodes:
            nodes[tid] = GraphNode(id=tid, label=rec["target_label"], type=rec["target_type"] or "Unknown")
        edges.append(GraphEdge(source=sid, target=tid, relationship=rec["relationship"]))
    return GraphResponse(nodes=list(nodes.values()), edges=edges)


@router.get("/explore", response_model=GraphResponse)
async def explore(entity: str, current_user: User = Depends(get_current_user)):
    records = neo4j_client.run(
        """
        MATCH (n)-[r]-(m)
        WHERE toLower(coalesce(n.name, n.title, '')) CONTAINS toLower($entity)
        RETURN
            coalesce(n.name, n.title, 'unknown') AS source_id,
            coalesce(n.title, n.name, 'unknown') AS source_label,
            labels(n)[0] AS source_type,
            type(r) AS relationship,
            coalesce(m.name, m.title, 'unknown') AS target_id,
            coalesce(m.title, m.name, 'unknown') AS target_label,
            labels(m)[0] AS target_type
        LIMIT 50
        """,
        entity=entity,
    )
    nodes: dict[str, GraphNode] = {}
    edges: list[GraphEdge] = []
    for rec in records:
        sid, tid = rec["source_id"], rec["target_id"]
        if sid not in nodes:
            nodes[sid] = GraphNode(id=sid, label=rec["source_label"], type=rec["source_type"] or "Unknown")
        if tid not in nodes:
            nodes[tid] = GraphNode(id=tid, label=rec["target_label"], type=rec["target_type"] or "Unknown")
        edges.append(GraphEdge(source=sid, target=tid, relationship=rec["relationship"]))
    return GraphResponse(nodes=list(nodes.values()), edges=edges)


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
