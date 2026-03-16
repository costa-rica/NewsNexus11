"""SQLite repository for location scorer SQL operations."""

from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Any

from src.modules.location_scorer.config import LocationScorerConfig
from src.modules.location_scorer.errors import LocationScorerDatabaseError


class LocationScorerRepository:
    def __init__(self, config: LocationScorerConfig) -> None:
        self.config = config
        self.sqlite_path = Path(self.config.sqlite_path)
        self._connection: sqlite3.Connection | None = None

    def get_connection(self) -> sqlite3.Connection:
        if self._connection is None:
            if not self.sqlite_path.exists():
                raise LocationScorerDatabaseError(
                    f"Database not found at {self.sqlite_path}"
                )
            self._connection = sqlite3.connect(str(self.sqlite_path))
            self._connection.row_factory = sqlite3.Row

        return self._connection

    def close(self) -> None:
        if self._connection is not None:
            self._connection.close()
            self._connection = None

    def healthcheck(self) -> bool:
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            return cursor.fetchone()[0] == 1
        except sqlite3.Error as exc:
            raise LocationScorerDatabaseError(
                f"Repository healthcheck failed: {exc}"
            ) from exc

    def execute_query(
        self,
        query: str,
        params: tuple[Any, ...] = (),
    ) -> list[dict[str, Any]]:
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute(query, params)
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
        except sqlite3.Error as exc:
            raise LocationScorerDatabaseError(f"Query failed: {exc}") from exc

    def get_entity_who_categorized_article_id(self, ai_entity_name: str) -> int | None:
        rows = self.execute_query(
            """
            SELECT ewca.id
            FROM ArtificialIntelligences ai
            JOIN EntityWhoCategorizedArticles ewca
                ON ewca.artificialIntelligenceId = ai.id
            WHERE ai.name = ?
            LIMIT 1
            """,
            (ai_entity_name,),
        )
        return int(rows[0]["id"]) if rows else None

    def get_unscored_articles(
        self,
        entity_id: int,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        query = """
        SELECT a.id, a.title, a.description
        FROM Articles a
        WHERE NOT EXISTS (
            SELECT 1
            FROM ArticleEntityWhoCategorizedArticleContracts contract
            WHERE contract.articleId = a.id
              AND contract.entityWhoCategorizesId = ?
        )
        ORDER BY a.id
        """

        params: tuple[Any, ...]
        if limit is not None:
            query += "\nLIMIT ?"
            params = (entity_id, limit)
        else:
            params = (entity_id,)

        return self.execute_query(query, params)

    def write_scores_batch(
        self,
        entity_id: int,
        scores: list[dict[str, Any]],
    ) -> dict[str, int]:
        if not scores:
            return {"inserted": 0, "duplicates": 0}

        conn = self.get_connection()
        cursor = conn.cursor()
        inserted = 0
        duplicates = 0

        try:
            for score in scores:
                try:
                    cursor.execute(
                        """
                        INSERT INTO ArticleEntityWhoCategorizedArticleContracts (
                            articleId,
                            entityWhoCategorizesId,
                            keyword,
                            keywordRating,
                            createdAt,
                            updatedAt
                        ) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
                        """,
                        (
                            score["article_id"],
                            entity_id,
                            score["rating_for"],
                            score["score"],
                        ),
                    )
                    inserted += 1
                except sqlite3.IntegrityError:
                    duplicates += 1

            conn.commit()
            return {"inserted": inserted, "duplicates": duplicates}
        except sqlite3.Error as exc:
            conn.rollback()
            raise LocationScorerDatabaseError(f"Batch insert failed: {exc}") from exc
