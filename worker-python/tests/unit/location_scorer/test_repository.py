from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest

from src.modules.location_scorer.config import LocationScorerConfig
from src.modules.location_scorer.errors import LocationScorerDatabaseError
from src.modules.location_scorer.repository import LocationScorerRepository


def _init_schema(db_path: Path) -> None:
    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()

    cur.executescript(
        """
        CREATE TABLE Articles (
            id INTEGER PRIMARY KEY,
            title TEXT,
            description TEXT
        );

        CREATE TABLE ArtificialIntelligences (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL
        );

        CREATE TABLE EntityWhoCategorizedArticles (
            id INTEGER PRIMARY KEY,
            artificialIntelligenceId INTEGER
        );

        CREATE TABLE ArticleEntityWhoCategorizedArticleContracts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            articleId INTEGER NOT NULL,
            entityWhoCategorizesId INTEGER NOT NULL,
            keyword TEXT,
            keywordRating REAL,
            createdAt TEXT,
            updatedAt TEXT
        );

        CREATE UNIQUE INDEX idx_location_scores_unique
        ON ArticleEntityWhoCategorizedArticleContracts(articleId, entityWhoCategorizesId, keyword);
        """
    )

    cur.executemany(
        "INSERT INTO Articles(id, title, description) VALUES(?, ?, ?)",
        [
            (1, "California storm", "Heavy rains hit the coast."),
            (2, "Berlin summit", "Leaders met in Germany."),
            (3, "Texas drought", "Dry weather continues."),
        ],
    )
    cur.executemany(
        "INSERT INTO ArtificialIntelligences(id, name) VALUES(?, ?)",
        [
            (10, "NewsNexusClassifierLocationScorer01"),
            (11, "OtherScorer"),
        ],
    )
    cur.executemany(
        "INSERT INTO EntityWhoCategorizedArticles(id, artificialIntelligenceId) VALUES(?, ?)",
        [
            (100, 10),
            (101, 11),
        ],
    )
    cur.execute(
        """
        INSERT INTO ArticleEntityWhoCategorizedArticleContracts(
            articleId, entityWhoCategorizesId, keyword, keywordRating, createdAt, updatedAt
        ) VALUES(?, ?, ?, ?, datetime('now'), datetime('now'))
        """,
        (1, 100, "Occurred in the United States", 0.95),
    )

    conn.commit()
    conn.close()


@pytest.fixture
def repo(tmp_path: Path) -> LocationScorerRepository:
    db_file = tmp_path / "location-scorer.db"
    _init_schema(db_file)

    config = LocationScorerConfig(
        path_database=str(tmp_path),
        name_db="location-scorer.db",
        ai_entity_name="NewsNexusClassifierLocationScorer01",
        batch_size=10,
        checkpoint_interval=10,
    )

    repository = LocationScorerRepository(config)
    yield repository
    repository.close()


@pytest.mark.unit
def test_repository_healthcheck_success(repo: LocationScorerRepository) -> None:
    assert repo.healthcheck() is True


@pytest.mark.unit
def test_repository_healthcheck_failure_for_missing_db(tmp_path: Path) -> None:
    config = LocationScorerConfig(
        path_database=str(tmp_path),
        name_db="missing.db",
        ai_entity_name="NewsNexusClassifierLocationScorer01",
        batch_size=10,
        checkpoint_interval=10,
    )
    repository = LocationScorerRepository(config)

    with pytest.raises(LocationScorerDatabaseError, match="Database not found"):
        repository.healthcheck()


@pytest.mark.unit
def test_get_entity_who_categorized_article_id_existing_and_missing(
    repo: LocationScorerRepository,
) -> None:
    assert (
        repo.get_entity_who_categorized_article_id("NewsNexusClassifierLocationScorer01")
        == 100
    )
    assert repo.get_entity_who_categorized_article_id("MissingScorer") is None


@pytest.mark.unit
def test_get_unscored_articles_and_limit(repo: LocationScorerRepository) -> None:
    articles = repo.get_unscored_articles(entity_id=100)

    assert [article["id"] for article in articles] == [2, 3]

    limited_articles = repo.get_unscored_articles(entity_id=100, limit=1)

    assert [article["id"] for article in limited_articles] == [2]


@pytest.mark.unit
def test_write_scores_batch_counts_inserted_and_duplicates(
    repo: LocationScorerRepository,
) -> None:
    result = repo.write_scores_batch(
        entity_id=100,
        scores=[
            {
                "article_id": 1,
                "score": 0.95,
                "rating_for": "Occurred in the United States",
            },
            {
                "article_id": 2,
                "score": 0.12,
                "rating_for": "Occurred in the United States",
            },
            {
                "article_id": 3,
                "score": 0.87,
                "rating_for": "Occurred in the United States",
            },
        ],
    )

    assert result == {"inserted": 2, "duplicates": 1}

    persisted = repo.execute_query(
        """
        SELECT articleId, entityWhoCategorizesId, keyword
        FROM ArticleEntityWhoCategorizedArticleContracts
        WHERE entityWhoCategorizesId = ?
        ORDER BY articleId
        """,
        (100,),
    )

    assert persisted == [
        {
            "articleId": 1,
            "entityWhoCategorizesId": 100,
            "keyword": "Occurred in the United States",
        },
        {
            "articleId": 2,
            "entityWhoCategorizesId": 100,
            "keyword": "Occurred in the United States",
        },
        {
            "articleId": 3,
            "entityWhoCategorizesId": 100,
            "keyword": "Occurred in the United States",
        },
    ]
