from db.neo4j_client import neo4j_client


def build_graph(metadata: dict, chunks: list[dict], user_id: str | None = None):
    title = metadata.get("title", "Untitled")
    arxiv_id = metadata.get("arxiv_id")
    authors = metadata.get("authors", [])
    keywords = metadata.get("keywords", [])

    if arxiv_id:
        # arXiv paper node
        neo4j_client.run(
            """
            MERGE (p:Paper {arxiv_id: $arxiv_id})
            SET p.title = $title, p.abstract = $abstract, p.published_date = $published_date
            """,
            arxiv_id=arxiv_id,
            title=title,
            abstract=metadata.get("abstract", ""),
            published_date=metadata.get("published_date", ""),
        )
        for author in authors:
            neo4j_client.run(
                """
                MERGE (a:Author {name: $name})
                WITH a
                MATCH (p:Paper {arxiv_id: $arxiv_id})
                MERGE (p)-[:AUTHORED_BY]->(a)
                """,
                name=author,
                arxiv_id=arxiv_id,
            )
        for keyword in keywords:
            neo4j_client.run(
                """
                MERGE (c:Concept {name: $name})
                WITH c
                MATCH (p:Paper {arxiv_id: $arxiv_id})
                MERGE (p)-[:HAS_KEYWORD]->(c)
                """,
                name=keyword,
                arxiv_id=arxiv_id,
            )
    else:
        # User-uploaded document node
        doc_id = metadata.get("doc_id", title)
        neo4j_client.run(
            """
            MERGE (d:Document {id: $doc_id})
            SET d.title = $title, d.user_id = $user_id, d.page_count = $page_count
            """,
            doc_id=doc_id,
            title=title,
            user_id=user_id or "",
            page_count=metadata.get("page_count", 0),
        )
        for keyword in (keywords.split(",") if isinstance(keywords, str) else keywords):
            keyword = keyword.strip()
            if keyword:
                neo4j_client.run(
                    """
                    MERGE (c:Concept {name: $name})
                    WITH c
                    MATCH (d:Document {id: $doc_id})
                    MERGE (d)-[:HAS_KEYWORD]->(c)
                    """,
                    name=keyword,
                    doc_id=doc_id,
                )
