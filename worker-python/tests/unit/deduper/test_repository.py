from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest

from src.modules.deduper.config import DeduperConfig
from src.modules.deduper.repository import DeduperRepository


def _init_schema(db_path: Path) -> None:
    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()

    cur.executescript(
        """
        CREATE TABLE Articles (
            id INTEGER PRIMARY KEY,
            url TEXT,
            title TEXT,
            description TEXT,
            publishedDate TEXT
        );

        CREATE TABLE ArticleApproveds (
            articleId INTEGER,
            isApproved INTEGER,
            headlineForPdfReport TEXT,
            textForPdfReport TEXT
        );

        CREATE TABLE ArticleReportContracts (
            articleId INTEGER,
            reportId INTEGER
        );

        CREATE TABLE States (
            id INTEGER PRIMARY KEY,
            abbreviation TEXT
        );

        CREATE TABLE ArticleStateContracts (
            articleId INTEGER,
            stateId INTEGER
        );

        CREATE TABLE ArticleDuplicateAnalyses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            articleIdNew INTEGER,
            articleIdApproved INTEGER,
            reportId INTEGER,
            sameArticleIdFlag INTEGER,
            articleNewState TEXT DEFAULT '',
            articleApprovedState TEXT DEFAULT '',
            sameStateFlag INTEGER DEFAULT 0,
            urlCheck INTEGER DEFAULT 0,
            contentHash REAL DEFAULT 0,
            embeddingSearch REAL DEFAULT 0,
            createdAt TEXT,
            updatedAt TEXT
        );

        CREATE INDEX idx_adr_new ON ArticleDuplicateAnalyses(articleIdNew);
        CREATE INDEX idx_adr_states ON ArticleDuplicateAnalyses(sameStateFlag);
        CREATE INDEX idx_adr_url ON ArticleDuplicateAnalyses(urlCheck);
        CREATE INDEX idx_adr_content ON ArticleDuplicateAnalyses(contentHash);
        CREATE INDEX idx_adr_embedding ON ArticleDuplicateAnalyses(embeddingSearch);
        """
    )

    cur.executemany(
        "INSERT INTO Articles(id, url, title, description, publishedDate) VALUES(?, ?, ?, ?, ?)",
        [
            (1, "https://example.com/a1", "T1", "D1", "2026-01-01"),
            (2, "https://example.com/a2", "T2", "D2", "2026-01-02"),
            (3, "https://example.com/a3", "T3", "D3", "2026-01-03"),
        ],
    )

    cur.executemany(
        "INSERT INTO ArticleApproveds(articleId, isApproved, headlineForPdfReport, textForPdfReport) VALUES(?, ?, ?, ?)",
        [
            (1, 1, "H1", "Text one"),
            (2, 1, "H2", "Text two"),
            (3, 0, "H3", "Text three"),
        ],
    )

    cur.executemany(
        "INSERT INTO ArticleReportContracts(articleId, reportId) VALUES(?, ?)",
        [(1, 10), (2, 10), (3, 11)],
    )

    cur.executemany(
        "INSERT INTO States(id, abbreviation) VALUES(?, ?)",
        [(1, "CA"), (2, "NY")],
    )

    cur.executemany(
        "INSERT INTO ArticleStateContracts(articleId, stateId) VALUES(?, ?)",
        [(1, 1), (2, 2)],
    )

    conn.commit()
    conn.close()


@pytest.fixture
def repo(tmp_path: Path) -> DeduperRepository:
    db_file = tmp_path / "test.db"
    _init_schema(db_file)

    config = DeduperConfig(
        path_to_database=str(tmp_path),
        name_db="test.db",
        path_to_csv=None,
        enable_embedding=True,
        batch_size_load=1000,
        batch_size_states=1000,
        batch_size_url=1000,
        batch_size_content_hash=1000,
        batch_size_embedding=100,
        cache_max_entries=1000,
        checkpoint_interval=100,
    )

    repository = DeduperRepository(config)
    yield repository
    repository.close()


@pytest.mark.unit
def test_repository_healthcheck(repo: DeduperRepository) -> None:
    assert repo.healthcheck() is True


@pytest.mark.unit
def test_report_and_approved_queries(repo: DeduperRepository) -> None:
    assert repo.get_article_ids_by_report_id(10) == [1, 2]
    assert repo.get_all_approved_article_ids() == [1, 2]


@pytest.mark.unit
def test_insert_and_clear_scoped_rows(repo: DeduperRepository) -> None:
    inserted = repo.insert_article_duplicate_analysis_batch(
        [
            {"articleIdNew": 1, "articleIdApproved": 2, "sameArticleIdFlag": 0},
            {"articleIdNew": 2, "articleIdApproved": 1, "sameArticleIdFlag": 0},
        ]
    )
    assert inserted == 2

    rows = repo.execute_query("SELECT COUNT(*) AS c FROM ArticleDuplicateAnalyses")
    assert rows[0]["c"] == 2

    repo.clear_existing_analysis_for_articles([1])
    rows_after = repo.execute_query("SELECT articleIdNew FROM ArticleDuplicateAnalyses ORDER BY articleIdNew")
    assert [r["articleIdNew"] for r in rows_after] == [2]


@pytest.mark.unit
def test_state_update_flow(repo: DeduperRepository) -> None:
    repo.insert_article_duplicate_analysis_batch(
        [{"articleIdNew": 1, "articleIdApproved": 2, "sameArticleIdFlag": 0}]
    )

    candidates = repo.get_analysis_records_for_state_update()
    assert len(candidates) == 1

    assert repo.get_article_state(1) == "CA"
    assert repo.get_article_state(2) == "NY"

    updated = repo.update_analysis_states_batch(
        [
            {
                "id": candidates[0]["id"],
                "articleNewState": "CA",
                "articleApprovedState": "NY",
                "sameStateFlag": 0,
            }
        ]
    )
    assert updated == 1

    stats = repo.get_state_processing_stats()
    assert stats["different_state_count"] == 1


@pytest.mark.unit
def test_url_update_flow(repo: DeduperRepository) -> None:
    repo.insert_article_duplicate_analysis_batch(
        [{"articleIdNew": 1, "articleIdApproved": 2, "sameArticleIdFlag": 0}]
    )
    candidates = repo.get_analysis_records_for_url_update()

    assert repo.get_article_url(1) == "https://example.com/a1"

    updated = repo.update_analysis_url_check_batch(
        [{"id": candidates[0]["id"], "urlCheck": 1}]
    )
    assert updated == 1

    stats = repo.get_url_check_processing_stats()
    assert stats["url_match_count"] == 1


@pytest.mark.unit
def test_content_hash_and_embedding_flows(repo: DeduperRepository) -> None:
    repo.insert_article_duplicate_analysis_batch(
        [{"articleIdNew": 1, "articleIdApproved": 2, "sameArticleIdFlag": 0}]
    )

    content_candidates = repo.get_analysis_records_for_content_hash_update()
    assert len(content_candidates) == 1

    with_content = repo.get_analysis_records_for_content_hash_update_with_contents(limit=10)
    assert len(with_content) == 1
    assert with_content[0]["headlineNew"] == "H1"

    assert repo.get_article_content(1) == "Text one"

    ch_updated = repo.update_analysis_content_hash_batch(
        [{"id": content_candidates[0]["id"], "contentHash": 0.92}]
    )
    assert ch_updated == 1

    content_stats = repo.get_content_hash_processing_stats()
    assert content_stats["high_similarity_count"] == 1

    emb_candidates = repo.get_analysis_records_for_embedding_update()
    assert len(emb_candidates) == 1

    emb_updated = repo.update_analysis_embedding_batch(
        [{"id": emb_candidates[0]["id"], "embeddingSearch": 0.81}]
    )
    assert emb_updated == 1

    emb_stats = repo.get_embedding_processing_stats()
    assert emb_stats["high_similarity_count"] == 1


@pytest.mark.unit
def test_clear_all_analysis_data(repo: DeduperRepository) -> None:
    repo.insert_article_duplicate_analysis_batch(
        [{"articleIdNew": 1, "articleIdApproved": 2, "sameArticleIdFlag": 0}]
    )

    deleted = repo.clear_all_analysis_data()
    assert deleted == 1

    remaining = repo.execute_query("SELECT COUNT(*) AS c FROM ArticleDuplicateAnalyses")
    assert remaining[0]["c"] == 0
