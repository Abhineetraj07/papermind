from openai import OpenAI
from config import settings
from agent.state import AgentState

_client = OpenAI(api_key=settings.openai_api_key)

_SYSTEM = """Classify the user's question into one of three retrieval intents:
- semantic: needs conceptual/semantic similarity search (explain, summarize, what is)
- relational: needs graph traversal (who authored, how are X and Y connected, cite relationships)
- hybrid: needs both semantic search AND graph traversal

Reply with exactly one word: semantic, relational, or hybrid."""


def classify_node(state: AgentState) -> dict:
    response = _client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": _SYSTEM},
            {"role": "user", "content": state["question"]},
        ],
        temperature=0,
        max_tokens=10,
    )
    intent = response.choices[0].message.content.strip().lower()
    if intent not in ("semantic", "relational", "hybrid"):
        intent = "hybrid"
    return {"intent": intent}
