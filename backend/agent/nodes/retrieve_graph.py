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
    for entity in entities[:3]:  # limit to top 3 entities
        records = neo4j_client.run(
            """
            MATCH (n)
            WHERE n.name CONTAINS $entity OR n.title CONTAINS $entity
            WITH n LIMIT 1
            MATCH (n)-[r]-(m)
            RETURN n.name AS source_name, n.title AS source_title,
                   type(r) AS relationship,
                   m.name AS target_name, m.title AS target_title,
                   labels(m)[0] AS target_type
            LIMIT 20
            """,
            entity=entity,
        )
        results.extend(records)

    return {"graph_results": results}
