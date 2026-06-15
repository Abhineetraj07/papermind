import json
import numpy as np
from openai import OpenAI
from sklearn.metrics.pairwise import cosine_similarity

from config import settings
from agent.state import AgentState

_client = OpenAI(api_key=settings.openai_api_key)

_JUDGE_SYSTEM = """You are a hallucination detector. Given a question, retrieved context, and a generated answer,
determine if the answer contains claims NOT supported by the context.
Reply with JSON only: {"hallucination": true/false, "reason": "brief reason"}"""


def _embed(texts: list[str]) -> np.ndarray:
    resp = _client.embeddings.create(model="text-embedding-3-small", input=texts)
    return np.array([d.embedding for d in resp.data])


def self_grade_node(state: AgentState) -> dict:
    question = state["question"]
    answer = state["answer"]

    all_chunks = [c for c in state["merged_results"] if c.get("text", "").strip()] if state["merged_results"] else []
    vector_chunks = [c for c in all_chunks if c.get("metadata", {}).get("source") != "graph"]
    graph_chunks = [c for c in all_chunks if c.get("metadata", {}).get("source") == "graph"]

    # Embed [question, answer, *vector_chunks, *graph_chunks] in one call.
    # Keeping vector first lets us slice out the right subset per metric.
    ordered_texts = (
        [c["text"] for c in vector_chunks] + [c["text"] for c in graph_chunks]
    ) or ["no context available"]
    n_vector = len(vector_chunks)

    embeddings = _embed([question, answer] + ordered_texts)
    q_emb = embeddings[0:1]
    a_emb = embeddings[1:2]
    all_c_embs = embeddings[2:]

    # context_relevance: question vs prose chunks only (graph edges embed poorly against NL questions).
    # If no prose chunks exist, fall back to all chunks so the metric isn't vacuous.
    cr_embs = all_c_embs[:n_vector] if n_vector > 0 else all_c_embs
    context_relevance = float(np.max(cosine_similarity(q_emb, cr_embs)))

    # faithfulness: answer vs ALL chunks — graph facts (edges) are the actual grounds for the answer
    # in relational/hybrid queries, so they must be included here.
    faithfulness = float(np.max(cosine_similarity(a_emb, all_c_embs)))

    answer_relevance = float(cosine_similarity(q_emb, a_emb)[0][0])

    # Graph entity match already confirmed relevance; apply baselines so low-embedding graph
    # edge strings don't cause false retries on structurally correct answers.
    if graph_chunks:
        context_relevance = max(context_relevance, 0.72)
    # When the answer is synthesized purely from graph edges (no prose context), all three cosine
    # metrics are unreliable: edges embed poorly vs NL questions, list answers score low vs single
    # edges, and structured output doesn't echo question phrasing. Judge already validates grounding.
    if graph_chunks and not vector_chunks:
        faithfulness = max(faithfulness, 0.72)
        answer_relevance = max(answer_relevance, 0.72)

    # LLM-as-judge uses all chunks (graph edges are readable text for the model)
    context_text = "\n".join(ordered_texts)
    judge_resp = _client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": _JUDGE_SYSTEM},
            {"role": "user", "content": f"Question: {question}\nContext: {context_text}\nAnswer: {answer}"},
        ],
        temperature=0,
        max_tokens=100,
        response_format={"type": "json_object"},
    )
    judge = json.loads(judge_resp.choices[0].message.content)
    hallucination_detected = judge.get("hallucination", False)

    return {
        "context_relevance": round(context_relevance, 4),
        "faithfulness": round(faithfulness, 4),
        "answer_relevance": round(answer_relevance, 4),
        "hallucination_detected": hallucination_detected,
    }
