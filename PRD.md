# PaperMind — Product Requirements Document

## 1. Overview

PaperMind is a production-grade agentic RAG (Retrieval-Augmented Generation) platform that enables users to query AI research papers and their own documents using a hybrid retrieval system combining semantic vector search (ChromaDB) and graph traversal (Neo4j), orchestrated by a LangGraph agent. Multiple users can register, log in, and maintain isolated workspaces from day one.

**Version:** 1.0 (MVP)
**Status:** Planning
**Owner:** Abhineet Raj

---

## 2. Problem Statement

Researchers, students, and engineers working with AI/ML face two core problems:

1. **Information overload** — Hundreds of new papers are published weekly. Reading and cross-referencing them manually is not scalable.
2. **Shallow retrieval** — Existing tools (keyword search, basic vector search) fail at relational queries like "what papers connect concept X to author Y?" or "how does paper A's approach differ from paper B's?"

PaperMind solves both by combining semantic search with knowledge graph traversal and an intelligent routing agent — with each user getting their own isolated document workspace on top of a shared global knowledge base.

---

## 3. Goals

### Must Have (MVP)
- Multi-user authentication (JWT-based register/login)
- User-scoped document isolation: each user's uploaded PDFs are private; arXiv papers are shared globally
- Ingest papers from arXiv by topic via the arXiv public API
- Accept user-uploaded PDF documents, convert to Markdown, extract metadata
- Store content in ChromaDB (semantic) and Neo4j (relational graph)
- LangGraph agent with hybrid retrieval routing (vector / graph / both)
- Cosine similarity based self-grading with three-layer hallucination detection
- Redis-backed query result caching and per-user session (conversation) history
- REST API via FastAPI, reverse proxied through Nginx
- Contextual chunking: parent-child chunks + Contextual Retrieval (LLM-generated context prefix per chunk)

### Should Have (Post-MVP)
- Simple web UI (React or plain HTML) for chat, paper ingestion, and document management
- RAGAS-based automated evaluation dashboard
- Batch ingestion from a list of arXiv IDs or PDF URLs
- Entity hallucination verification via Neo4j cross-reference
- Export conversation + cited sources as PDF/Markdown
- User roles (admin can manage global arXiv ingestion)

### Will Not Do (Out of Scope for v1.0)
- Real-time paper ingestion (polling arXiv continuously)
- Fine-tuning any model
- Mobile app
- OAuth / social login (plain JWT is sufficient for MVP)

---

## 4. User Personas

### Persona 1 — Arjun, The Research Scholar
- **Age:** 25
- **Role:** CS PhD student, researching NLP/LLM systems
- **Goal:** Conduct literature reviews faster. Find which papers cite which, identify key authors, track concept evolution across years.
- **Key queries:** "What papers cite the original Attention is All You Need?", "Summarise contributions across 5 RAG papers", "Which authors publish most on hallucination detection?"
- **Pain point:** Spends 3-4 hours per literature review reading papers that often are not relevant. Misses connections between papers.
- **Uses:** Graph traversal queries, multi-paper summarisation, citation network

### Persona 2 — Priya, The ML Engineer at a Startup
- **Age:** 27
- **Role:** Building LLM-powered products, needs to stay updated on applied AI techniques
- **Goal:** Quickly understand state-of-the-art techniques for a specific problem (e.g., RAG, RLHF, quantisation) without reading full papers.
- **Key queries:** "What are the best chunking strategies from recent papers?", "Compare FAISS vs HNSW based on papers published after 2023"
- **Pain point:** No time to read full papers. Needs distilled, actionable insights fast.
- **Uses:** Semantic search, cross-paper comparison, topic summarisation

### Persona 3 — Rohan, The CS Undergrad
- **Age:** 21
- **Role:** Third-year CS student preparing for AI/ML internships, learning foundations
- **Goal:** Understand core concepts deeply, find foundational papers, explore how ideas connect.
- **Key queries:** "Explain transformers like I am new to it, cite the original paper", "What papers should I read to understand RAG from scratch?"
- **Pain point:** Overwhelming amount of resources. Hard to build a structured learning path. Does not know which papers are foundational vs incremental.
- **Uses:** Concept explanation, learning path discovery, paper upload for assignments

### Persona 4 — Sarah, The Engineering Manager
- **Age:** 33
- **Role:** Tech lead evaluating AI tools and techniques for her team
- **Goal:** Get a confident technical overview of a topic to make architectural decisions without reading 20 papers herself.
- **Key queries:** "What are the trade-offs between GraphRAG and standard RAG?", "Upload this internal doc and tell me if our approach is outdated"
- **Pain point:** Needs enough technical depth to make decisions but not time to go deep.
- **Uses:** Private document upload (internal docs), comparative queries, hallucination-safe answers with cited sources

---

## 5. Functional Requirements

### 5.1 Authentication
- `POST /auth/register` — create account with email + password (bcrypt hashed)
- `POST /auth/login` — returns JWT access token (24h expiry) + refresh token (7d)
- `POST /auth/refresh` — issue new access token using refresh token
- `POST /auth/logout` — invalidate refresh token in Redis
- All protected routes require `Authorization: Bearer <token>` header
- User record stored in a `users` table in PostgreSQL (added to stack for user data)

### 5.2 Paper Ingestion (arXiv) — Shared Global Knowledge Base
- `POST /ingest?topic={query}&limit={n}` fetches up to N papers from arXiv API (admin or any authenticated user can trigger)
- Extracts: title, authors, abstract, keywords, arXiv ID, published date, PDF URL
- Downloads and converts PDF to Markdown using pymupdf4llm
- Chunks using parent-child strategy with LangChain MarkdownTextSplitter
- Generates contextual prefix per chunk using LLM (Contextual Retrieval)
- Embeds child chunks → ChromaDB with `source=arxiv` metadata
- Extracts entities and relationships → Neo4j
- Background task — returns job ID immediately, status checkable via `GET /ingest/status/{job_id}`

### 5.3 Document Upload (User PDFs) — Private Per User
- `POST /documents/upload` accepts multipart PDF file (authenticated)
- Converts PDF → Markdown (pymupdf4llm)
- Extracts metadata: title, author, page count, creation date, keywords (PyMuPDF)
- Runs same chunking + embedding + graph pipeline as arXiv papers
- Tags all chunks with `user_id` in ChromaDB metadata and Neo4j — invisible to other users
- `GET /documents` — list authenticated user's uploaded documents
- `DELETE /documents/{doc_id}` — delete a user's document and all its chunks

### 5.4 Query Agent
- `POST /query` accepts question + optional session_id (authenticated)
- Agent retrieves from: global arXiv collection + user's private documents (filtered by user_id)
- LangGraph agent pipeline:
  1. Classify intent (semantic / relational / hybrid)
  2. Route to ChromaDB and/or Neo4j
  3. Context Relevance check (cosine_sim query vs chunks)
  4. Generate answer (OpenAI GPT-4o)
  5. Faithfulness check (cosine_sim answer vs chunks)
  6. Answer Relevance check (cosine_sim answer vs query)
  7. LLM-as-Judge semantic hallucination check
  8. Retry up to 2 times if below confidence threshold
  9. Return answer + sources + confidence scores
- Conversation history stored in Redis keyed by `user_id:session_id`

### 5.5 Graph Exploration
- `GET /graph/explore?entity={name}` returns related nodes and relationships
- `GET /graph/authors/{name}` returns all papers by an author
- `GET /graph/concepts/{name}` returns all papers tagged with a concept

### 5.6 Session Management
- `GET /sessions` — list all sessions for authenticated user
- `GET /sessions/{session_id}` — get conversation history for a session
- `DELETE /sessions/{session_id}` — clear a session

---

## 6. Technical Architecture

```
Client (HTTP)
     ↓
  Nginx (reverse proxy, port 80)
     ↓
  FastAPI (port 8000)
   ├── Auth middleware (JWT validation)
   └── LangGraph Agent
        ├── ChromaDB  (semantic vector search, user-scoped filtering)
        ├── Neo4j     (graph traversal, Cypher queries)
        └── Redis     (cache + session store, keyed by user_id)
     ↓
  PostgreSQL (user accounts, document metadata)
  OpenAI API (embeddings + generation)
```

### Databases

| Database    | Purpose                                           | Port |
|-------------|---------------------------------------------------|------|
| ChromaDB    | Vector store for document chunk embeddings        | 8001 |
| Neo4j       | Knowledge graph (entities + relationships)        | 7474 |
| Redis       | Query cache + session history (user-scoped keys)  | 6379 |
| PostgreSQL  | User accounts, document metadata, refresh tokens  | 5432 |

### Data Isolation Strategy

- **arXiv papers:** No user_id tag — visible to all authenticated users
- **User documents:** Tagged with `user_id` in ChromaDB metadata and as Neo4j node property
- ChromaDB queries always apply `where={"$or": [{"source": "arxiv"}, {"user_id": current_user_id}]}` filter
- Neo4j queries for user documents always include `WHERE d.user_id = $user_id`

### Neo4j Graph Schema

```
(User {id, email})
(Paper {id, title, arxiv_id, published_date, abstract})
(Document {id, title, filename, page_count, uploaded_at, user_id})
(Author {name})
(Concept {name})

(Paper)-[:AUTHORED_BY]->(Author)
(Paper)-[:HAS_KEYWORD]->(Concept)
(Paper)-[:CITES]->(Paper)
(Author)-[:COLLABORATES_WITH]->(Author)
(Concept)-[:RELATED_TO]->(Concept)
(Document)-[:UPLOADED_BY]->(User)
(Document)-[:HAS_KEYWORD]->(Concept)
```

---

## 7. API Specification

| Method | Endpoint                    | Auth | Description                           |
|--------|-----------------------------|------|---------------------------------------|
| POST   | `/auth/register`            | No   | Register new user                     |
| POST   | `/auth/login`               | No   | Login, receive JWT                    |
| POST   | `/auth/refresh`             | No   | Refresh access token                  |
| POST   | `/auth/logout`              | Yes  | Invalidate refresh token              |
| POST   | `/ingest`                   | Yes  | Ingest arXiv papers by topic          |
| GET    | `/ingest/status/{job_id}`   | Yes  | Check ingestion job status            |
| POST   | `/documents/upload`         | Yes  | Upload a user PDF                     |
| GET    | `/documents`                | Yes  | List user's uploaded documents        |
| DELETE | `/documents/{doc_id}`       | Yes  | Delete a user document                |
| POST   | `/query`                    | Yes  | Query the agent                       |
| GET    | `/graph/explore`            | Yes  | Explore entity relationships          |
| GET    | `/graph/authors/{name}`     | Yes  | Papers by author                      |
| GET    | `/graph/concepts/{name}`    | Yes  | Papers by concept                     |
| GET    | `/sessions`                 | Yes  | List user's sessions                  |
| GET    | `/sessions/{session_id}`    | Yes  | Get conversation history              |
| DELETE | `/sessions/{session_id}`    | Yes  | Clear a session                       |
| GET    | `/health`                   | No   | Health check for all services         |

---

## 8. Non-Functional Requirements

- **Response time:** Query responses under 10 seconds (excluding first cold retrieval)
- **Cache hit rate:** Repeated identical queries served from Redis within 100ms
- **Hallucination safety:** All responses include confidence score; below 0.70 flagged as uncertain
- **Chunking:** Child chunks 200 tokens, overlap 50 tokens; parent chunks 1000 tokens
- **Retry logic:** Max 2 self-grade retries before returning uncertain response
- **Containerised:** Full stack runnable via `docker-compose up`
- **Security:** Passwords bcrypt-hashed, JWT signed with HS256, refresh tokens stored in Redis with TTL

---

## 9. Hallucination Detection Strategy

Three-layer detection in the self-grading node:

| Layer                  | Type Caught           | Method                                  |
|------------------------|-----------------------|-----------------------------------------|
| Answer Relevance score | Intent hallucination  | cosine_sim(answer, query)               |
| Faithfulness score     | Entity hallucination  | cosine_sim(answer, retrieved chunks)    |
| LLM-as-Judge           | Semantic hallucination| Separate LLM call with judge prompt     |

All three scores returned as metadata with every query response.

---

## 10. Success Metrics (Portfolio)

- Multi-user auth works end-to-end: user A cannot see user B's documents
- Hybrid retrieval demonstrably outperforms pure vector search on relational queries
- Self-grading loop catches and corrects at least one hallucination in demo scenarios
- Full stack runnable with single `docker-compose up` command
- README includes architecture diagram, demo GIF, and RAGAS evaluation results
