# PaperMind — CLAUDE.md

## What This Project Is

PaperMind is an agentic RAG platform. Users can ingest arXiv papers by topic or upload their own PDFs, then query a LangGraph agent that routes between semantic vector search (ChromaDB) and graph traversal (Neo4j) to answer questions. Multi-user from day one — each user's uploaded documents are private; arXiv papers are shared globally.

Full PRD is in `PRD.md`.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| API | FastAPI + Nginx | Async, typed, production-ready |
| Agent | LangGraph | Stateful agent graph with conditional routing and retry loops |
| LLM + Embeddings | OpenAI GPT-4o + text-embedding-3-small | Generation and embeddings |
| Vector DB | ChromaDB | Semantic similarity search over document chunks |
| Graph DB | Neo4j | Entity relationships — authors, concepts, citations, multi-hop queries |
| Cache + Sessions | Redis | Query result cache, per-user conversation history, refresh token store |
| User Data | PostgreSQL + SQLAlchemy (async) | User accounts, document metadata |
| PDF Processing | pymupdf4llm + PyMuPDF | PDF → clean Markdown + metadata extraction |
| arXiv Ingestion | arxiv Python library | Fetch papers by topic, no dataset needed |
| Chunking | LangChain MarkdownTextSplitter | Parent-child chunks, respects Markdown headers |

---

## Architecture at a Glance

```
Request → Nginx (port 80) → FastAPI (port 8000)
                                  ↓
                          JWT Auth Middleware
                                  ↓
                          LangGraph Agent
                         ↙              ↘
                    ChromaDB           Neo4j
                    (semantic)         (relational)
                         ↘              ↙
                          Merge + Grade
                                ↓
                          GPT-4o Answer
                                ↓
                    Redis (cache + session store)
```

---

## Directory Structure

```
papermind/
├── CLAUDE.md
├── PRD.md
├── docker-compose.yml
├── .env.example
├── nginx/
│   └── nginx.conf
├── uploads/                      # user-uploaded PDFs (gitignored)
└── backend/
    ├── Dockerfile
    ├── requirements.txt
    ├── main.py                   # FastAPI app, router registration
    ├── config.py                 # Pydantic Settings, all env vars
    ├── api/
    │   ├── auth.py               # register, login, refresh, logout
    │   ├── ingest.py             # POST /ingest (arXiv)
    │   ├── documents.py          # POST /documents/upload, GET, DELETE
    │   ├── query.py              # POST /query
    │   ├── graph.py              # GET /graph/explore, authors, concepts
    │   ├── sessions.py           # GET/DELETE /sessions
    │   └── health.py             # GET /health
    ├── agent/
    │   ├── graph_agent.py        # LangGraph StateGraph definition
    │   ├── state.py              # AgentState TypedDict
    │   └── nodes/
    │       ├── classify.py       # intent: semantic | relational | hybrid
    │       ├── retrieve_vector.py # ChromaDB query
    │       ├── retrieve_graph.py  # Neo4j Cypher query
    │       ├── merge.py           # merge + cosine rerank results
    │       ├── generate.py        # GPT-4o answer generation
    │       └── self_grade.py      # cosine scores + LLM-as-judge
    ├── ingestion/
    │   ├── arxiv_loader.py       # fetch papers from arXiv API
    │   ├── pdf_processor.py      # PDF → Markdown + metadata (pymupdf4llm)
    │   ├── chunker.py            # parent-child chunking + contextual prefix
    │   ├── embedder.py           # embed chunks → ChromaDB
    │   └── graph_builder.py      # extract entities → Neo4j
    ├── db/
    │   ├── neo4j_client.py       # Neo4j driver singleton
    │   ├── chroma_client.py      # ChromaDB client singleton
    │   ├── redis_client.py       # Redis async client singleton
    │   └── postgres.py           # SQLAlchemy async engine + session
    ├── models/
    │   ├── user.py               # SQLAlchemy User ORM model
    │   └── document.py           # SQLAlchemy Document ORM model
    └── middleware/
        └── auth.py               # JWT decode, get_current_user dependency
```

---

## Key Patterns

### Agent State
All agent nodes read from and write to `AgentState` (TypedDict in `agent/state.py`). Never pass data between nodes through side effects — always return a state update dict.

### User Isolation
Every ChromaDB query must include a metadata filter:
```python
where={"$or": [{"source": "arxiv"}, {"user_id": str(current_user.id)}]}
```
Every Neo4j query for user documents must include `WHERE d.user_id = $user_id`. Never query without this filter on user-owned data.

### Background Tasks
Ingestion (arXiv fetch + PDF processing + embedding) runs as a FastAPI `BackgroundTask`. The route returns a `job_id` immediately. Job status is tracked in Redis with key `job:{job_id}`.

### Chunking Strategy
1. Convert PDF → Markdown (pymupdf4llm)
2. Split into parent chunks (1000 tokens, 100 overlap) — stored in memory only
3. Split each parent into child chunks (200 tokens, 50 overlap) — stored in ChromaDB
4. Each child chunk stores `parent_id` in metadata
5. Optionally prepend LLM-generated context to each child before embedding (Contextual Retrieval — controlled by `CONTEXTUAL_RETRIEVAL=true` env var, off by default to save tokens)

### Hallucination Detection (self_grade node)
Three scores computed, all returned in the API response:
1. `context_relevance` — cosine_sim(query_embedding, chunk_embeddings) — did we retrieve relevant chunks?
2. `faithfulness` — cosine_sim(answer_embedding, chunk_embeddings) — is the answer grounded?
3. `answer_relevance` — cosine_sim(answer_embedding, query_embedding) — does it answer the question?
4. `llm_judge` — separate GPT-4o-mini call returns `{"hallucination": bool, "reason": str}`

If composite score < `GRADE_THRESHOLD` (default 0.70), agent retries up to `MAX_RETRIES` (default 2) times with a rewritten query.

### Redis Key Conventions
```
session:{user_id}:{session_id}    → list of message dicts (chat history)
cache:{query_hash}                → cached response JSON
job:{job_id}                      → ingestion job status
refresh:{user_id}                 → refresh token
```

---

## Environment Variables

All defined in `config.py` as a Pydantic `Settings` class. Never hardcode secrets. See `.env.example` for all required vars.

Key vars:
- `OPENAI_API_KEY` — required for embeddings and generation
- `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`
- `CHROMA_HOST`, `CHROMA_PORT`
- `REDIS_URL`
- `DATABASE_URL` — PostgreSQL async URL (`postgresql+asyncpg://...`)
- `JWT_SECRET` — sign access tokens
- `CONTEXTUAL_RETRIEVAL` — `true`/`false`, default `false`
- `GRADE_THRESHOLD` — float, default `0.70`
- `MAX_RETRIES` — int, default `2`

---

## Running Locally

```bash
cp .env.example .env
# fill in OPENAI_API_KEY and other secrets
docker-compose up --build
```

API available at `http://localhost/` (via Nginx).
Neo4j browser at `http://localhost:7474`.

---

## Conventions

- All route handlers are async
- DB clients are singletons initialised at startup via FastAPI lifespan
- Type hints on every function signature
- Pydantic models for all request/response bodies (in `api/*.py`)
- No print statements — use Python `logging`
- Errors raise `HTTPException` with appropriate status codes
- Never catch bare `Exception` — catch specific exceptions

---

## What NOT To Do

- Do not query ChromaDB without a user_id filter on user-uploaded content
- Do not run ingestion synchronously in a route handler — always use BackgroundTasks
- Do not store plaintext passwords — always bcrypt hash
- Do not add Contextual Retrieval (LLM call per chunk) unless `CONTEXTUAL_RETRIEVAL=true` — it costs tokens
- Do not return raw Neo4j `Record` objects — always serialize to dicts before returning
- Do not use `langchain` chains where a direct OpenAI call is simpler — only use LangChain for document processing and embeddings
