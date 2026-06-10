from typing import TypedDict


class AgentState(TypedDict):
    question: str
    user_id: str
    session_id: str
    history: list[dict]
    intent: str                      # "semantic" | "relational" | "hybrid"
    retrieved_chunks: list[dict]
    graph_results: list[dict]
    merged_results: list[dict]
    answer: str
    context_relevance: float
    faithfulness: float
    answer_relevance: float
    hallucination_detected: bool
    retry_count: int
    sources: list[dict]
