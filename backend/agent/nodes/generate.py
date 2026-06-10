from openai import OpenAI
from config import settings
from agent.state import AgentState

_client = OpenAI(api_key=settings.openai_api_key)

_SYSTEM = """You are a research assistant. Answer the user's question using ONLY the provided context.
If the context does not contain enough information, say so clearly — do not fabricate details.
Always cite sources by referring to paper titles or document names from the context."""


def generate_node(state: AgentState) -> dict:
    context = "\n\n".join(
        f"[{i+1}] {chunk['text']}" for i, chunk in enumerate(state["merged_results"])
    )

    history = state.get("history", [])[-6:]  # last 3 turns for context
    messages = [{"role": "system", "content": _SYSTEM}]
    messages.extend(history)
    messages.append({
        "role": "user",
        "content": f"Context:\n{context}\n\nQuestion: {state['question']}",
    })

    response = _client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        temperature=0.2,
        max_tokens=1024,
    )
    return {"answer": response.choices[0].message.content}
