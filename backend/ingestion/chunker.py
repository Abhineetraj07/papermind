import uuid
from openai import OpenAI
from langchain.text_splitter import MarkdownTextSplitter
from config import settings

_client = OpenAI(api_key=settings.openai_api_key)

PARENT_CHUNK_SIZE = 1000
PARENT_OVERLAP = 100
CHILD_CHUNK_SIZE = 200
CHILD_OVERLAP = 50

_parent_splitter = MarkdownTextSplitter(chunk_size=PARENT_CHUNK_SIZE, chunk_overlap=PARENT_OVERLAP)
_child_splitter = MarkdownTextSplitter(chunk_size=CHILD_CHUNK_SIZE, chunk_overlap=CHILD_OVERLAP)


def _generate_context(full_doc: str, chunk: str) -> str:
    resp = _client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Write 2 sentences situating this chunk within the full document. Be concise."},
            {"role": "user", "content": f"Document (truncated):\n{full_doc[:3000]}\n\nChunk:\n{chunk}"},
        ],
        temperature=0,
        max_tokens=80,
    )
    return resp.choices[0].message.content.strip()


def chunk_document(markdown: str, metadata: dict) -> list[dict]:
    parent_chunks = _parent_splitter.split_text(markdown)
    result = []

    for parent_text in parent_chunks:
        parent_id = str(uuid.uuid4())
        child_texts = _child_splitter.split_text(parent_text)

        for child_text in child_texts:
            text_to_embed = child_text
            if settings.contextual_retrieval:
                context = _generate_context(markdown, child_text)
                text_to_embed = f"{context}\n\n{child_text}"

            result.append({
                "id": str(uuid.uuid4()),
                "text": text_to_embed,
                "parent_id": parent_id,
                "parent_text": parent_text,
                "metadata": {**metadata},
            })

    return result
