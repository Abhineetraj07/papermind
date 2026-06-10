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
    chunks = [c["text"] for c in state["merged_results"]] if state["merged_results"] else [""]

    all_texts = [question, answer] + chunks
    embeddings = _embed(all_texts)

    q_emb = embeddings[0:1]
    a_emb = embeddings[1:2]
    c_embs = embeddings[2:]

    context_relevance = float(np.max(cosine_similarity(q_emb, c_embs)))
    faithfulness = float(np.max(cosine_similarity(a_emb, c_embs)))
    answer_relevance = float(cosine_similarity(q_emb, a_emb)[0][0])

    # LLM-as-judge for semantic hallucination
    context_text = "\n".join(chunks[:4])
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
