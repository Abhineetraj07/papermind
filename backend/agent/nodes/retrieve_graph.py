from openai import OpenAI
from config import settings
from agent.state import AgentState
from db.neo4j_client import neo4j_client

_client = OpenAI(api_key=settings.openai_api_key)

_SYSTEM = """Extract the main entity names (authors, paper titles, concepts) from the question.
Return as a comma-separated list. Only return the list, nothing else.
Example: "attention mechanism, Vaswani, transformers" """


def retrieve_graph_node(state: AgentState) -> dict:
    # Extract entities from the question using LLM
    resp = _client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": _SYSTEM},
            {"role": "user", "content": state["question"]},
        ],
        temperature=0,
        max_tokens=100,
    )
    entities = [e.strip() for e in resp.choices[0].message.content.split(",")]

    results = []
    for entity in entities[:3]:
        entity_lower = entity.lower()
        records = neo4j_client.run(
            """
            MATCH (n)
            WHERE toLower(n.name) CONTAINS $entity OR toLower(n.title) CONTAINS $entity
            WITH n LIMIT 3
            MATCH (n)-[r]-(m)
            RETURN n.name AS source_name, n.title AS source_title,
                   type(r) AS relationship,
                   m.name AS target_name, m.title AS target_title,
                   labels(m)[0] AS target_type
            LIMIT 20
            """,
            entity=entity_lower,
        )
        results.extend(records)

    # Fallback: if no results, return all papers with their authors
    if not results:
        results = neo4j_client.run(
            """
            MATCH (p:Paper)-[:AUTHORED_BY]->(a:Author)
            RETURN p.title AS source_title, null AS source_name,
                   'AUTHORED_BY' AS relationship,
                   a.name AS target_name, null AS target_title,
                   'Author' AS target_type
            LIMIT 30
            """
        )

    return {"graph_results": results}
