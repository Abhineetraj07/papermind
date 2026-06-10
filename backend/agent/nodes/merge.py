from agent.state import AgentState


def merge_node(state: AgentState) -> dict:
    merged = list(state.get("retrieved_chunks", []))

    # Convert graph results to chunk-like dicts for uniform handling
    for record in state.get("graph_results", []):
        text = (
            f"{record.get('source_name') or record.get('source_title', '')} "
            f"--[{record.get('relationship', '')}]--> "
            f"{record.get('target_name') or record.get('target_title', '')}"
        )
        merged.append({
            "text": text,
            "metadata": {"source": "graph", "type": record.get("target_type", "")},
            "score": 0.5,  # graph results get a baseline score; reranked below
        })

    # Deduplicate by text content
    seen, unique = set(), []
    for chunk in merged:
        if chunk["text"] not in seen:
            seen.add(chunk["text"])
            unique.append(chunk)

    unique.sort(key=lambda x: x["score"], reverse=True)

    sources = [
        {
            "title": c["metadata"].get("title", "Unknown"),
            "source": c["metadata"].get("source", "unknown"),
            "chunk_text": c["text"][:300],
        }
        for c in unique[:6]
    ]

    return {"merged_results": unique[:6], "sources": sources}
