from langgraph.graph import StateGraph, END

from agent.state import AgentState
from agent.nodes.classify import classify_node
from agent.nodes.retrieve_vector import retrieve_vector_node
from agent.nodes.retrieve_graph import retrieve_graph_node
from agent.nodes.merge import merge_node
from agent.nodes.generate import generate_node
from agent.nodes.self_grade import self_grade_node
from config import settings


def _route_by_intent(state: AgentState) -> list[str]:
    intent = state["intent"]
    if intent == "semantic":
        return ["retrieve_vector"]
    if intent == "relational":
        return ["retrieve_graph"]
    return ["retrieve_vector", "retrieve_graph"]


def _should_retry(state: AgentState) -> str:
    composite = (state["context_relevance"] + state["faithfulness"] + state["answer_relevance"]) / 3
    if (composite < settings.grade_threshold or state["hallucination_detected"]) and state["retry_count"] < settings.max_retries:
        return "retry"
    return "done"


def _increment_retry(state: AgentState) -> dict:
    return {"retry_count": state["retry_count"] + 1, "retrieved_chunks": [], "graph_results": [], "merged_results": []}


builder = StateGraph(AgentState)

builder.add_node("classify", classify_node)
builder.add_node("retrieve_vector", retrieve_vector_node)
builder.add_node("retrieve_graph", retrieve_graph_node)
builder.add_node("merge", merge_node)
builder.add_node("generate", generate_node)
builder.add_node("self_grade", self_grade_node)
builder.add_node("retry", _increment_retry)

builder.set_entry_point("classify")
builder.add_conditional_edges("classify", _route_by_intent, {"retrieve_vector": "retrieve_vector", "retrieve_graph": "retrieve_graph"})
builder.add_edge("retrieve_vector", "merge")
builder.add_edge("retrieve_graph", "merge")
builder.add_edge("merge", "generate")
builder.add_edge("generate", "self_grade")
builder.add_conditional_edges("self_grade", _should_retry, {"retry": "retry", "done": END})
builder.add_edge("retry", "classify")

graph = builder.compile()


async def run_agent(question: str, user_id: str, session_id: str, history: list[dict]) -> dict:
    initial_state: AgentState = {
        "question": question,
        "user_id": user_id,
        "session_id": session_id,
        "history": history,
        "intent": "",
        "retrieved_chunks": [],
        "graph_results": [],
        "merged_results": [],
        "answer": "",
        "context_relevance": 0.0,
        "faithfulness": 0.0,
        "answer_relevance": 0.0,
        "hallucination_detected": False,
        "retry_count": 0,
        "sources": [],
    }
    final_state = await graph.ainvoke(initial_state)
    return {
        "answer": final_state["answer"],
        "sources": final_state["sources"],
        "scores": {
            "context_relevance": final_state["context_relevance"],
            "faithfulness": final_state["faithfulness"],
            "answer_relevance": final_state["answer_relevance"],
            "hallucination_detected": final_state["hallucination_detected"],
        },
        "retry_count": final_state["retry_count"],
    }
