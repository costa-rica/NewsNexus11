from __future__ import annotations

import json
import sqlite3
from pathlib import Path

import pytest

from src.modules.deduper.config import DeduperConfig
from src.modules.deduper.processors.content_hash import ContentHashProcessor
from src.modules.deduper.processors.embedding import EmbeddingProcessor
from src.modules.deduper.processors.load import LoadProcessor
from src.modules.deduper.processors.states import StatesProcessor
from src.modules.deduper.processors.url_check import UrlCheckProcessor
from src.modules.deduper.repository import DeduperRepository


class _FakeSentenceTransformer:
    def __init__(self, model_name: str) -> None:
        self.model_name = model_name
        self.max_seq_length = 256

    def get_sentence_embedding_dimension(self) -> int:
        return 3

    def encode(self, texts, normalize_embeddings=True, convert_to_numpy=True):
        vecs = []
        for text in texts:
            if "match" in text.lower():
                vecs.append([1.0, 0.0, 0.0])
            else:
                vecs.append([0.0, 1.0, 0.0])
        return vecs


class _FakeNumpy:
    float32 = float

    @staticmethod
    def dot(a, b):
        return sum(x * y for x, y in zip(a, b))

    @staticmethod
    def zeros(dim, dtype=None):
        return [0.0] * dim


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
        """
    )

    cur.executemany(
        "INSERT INTO Articles(id, url, title, description, publishedDate) VALUES(?, ?, ?, ?, ?)",
        [
            (1, "https://www.example.com/story?utm_source=x&id=1", "T1", "D1", "2026-01-01"),
            (2, "http://example.com/story?id=1", "T2", "D2", "2026-01-02"),
            (3, "https://example.com/story-b", "T3", "D3", "2026-01-03"),
        ],
    )

    cur.executemany(
        "INSERT INTO ArticleApproveds(articleId, isApproved, headlineForPdfReport, textForPdfReport) VALUES(?, ?, ?, ?)",
        [
            (1, 1, "Major update announced", "The city council approved the same budget today."),
            (2, 1, "Major update announced", "The city council approved the same budget today."),
            (3, 1, "Weather report", "Heavy rain expected this weekend."),
        ],
    )

    cur.executemany(
        "INSERT INTO ArticleReportContracts(articleId, reportId) VALUES(?, ?)",
        [(1, 10), (2, 10)],
    )

    cur.executemany(
        "INSERT INTO States(id, abbreviation) VALUES(?, ?)",
        [(1, "CA"), (2, "CA"), (3, "NY")],
    )

    cur.executemany(
        "INSERT INTO ArticleStateContracts(articleId, stateId) VALUES(?, ?)",
        [(1, 1), (2, 2), (3, 3)],
    )

    conn.commit()
    conn.close()


@pytest.fixture
def repo_and_config(tmp_path: Path):
    db_file = tmp_path / "test.db"
    _init_schema(db_file)

    csv_file = tmp_path / "article_ids.csv"
    csv_file.write_text("articleId\n1\n2\n", encoding="utf-8")

    config = DeduperConfig(
        path_to_database=str(tmp_path),
        name_db="test.db",
        path_to_csv=str(csv_file),
        enable_embedding=True,
        batch_size_load=2,
        batch_size_states=2,
        batch_size_url=2,
        batch_size_content_hash=2,
        batch_size_embedding=2,
    )

    repository = DeduperRepository(config)
    yield repository, config
    repository.close()


@pytest.mark.unit
def test_load_processor_report_mode(repo_and_config) -> None:
    repository, config = repo_and_config
    processor = LoadProcessor(repository, config)

    summary = processor.execute(report_id=10)

    assert summary["new_articles"] == 2
    assert summary["approved_articles"] == 3
    assert summary["processed"] == 6


@pytest.mark.unit
def test_load_processor_csv_mode(repo_and_config) -> None:
    repository, config = repo_and_config
    processor = LoadProcessor(repository, config)

    summary = processor.execute()

    assert summary["empty"] is False
    rows = repository.execute_query("SELECT COUNT(*) AS c FROM ArticleDuplicateAnalyses")
    assert rows[0]["c"] == 6


@pytest.mark.unit
def test_states_processor_updates_flags(repo_and_config) -> None:
    repository, config = repo_and_config
    LoadProcessor(repository, config).execute(report_id=10)

    summary = StatesProcessor(repository, config).execute()

    assert summary["processed"] == 6
    assert summary["same_state_count"] >= 2


@pytest.mark.unit
def test_url_processor_and_golden_cases(repo_and_config) -> None:
    repository, config = repo_and_config
    LoadProcessor(repository, config).execute(report_id=10)

    processor = UrlCheckProcessor(repository, config)
    summary = processor.execute()
    assert summary["processed"] == 6

    cases = json.loads(
        Path("tests/fixtures/deduper/golden_cases.json").read_text(encoding="utf-8")
    )["url_cases"]
    for case in cases:
        assert processor._compare_urls(case["new_url"], case["approved_url"]) is case["expected_match"]


@pytest.mark.unit
def test_content_hash_processor_and_golden_cases(repo_and_config) -> None:
    repository, config = repo_and_config
    LoadProcessor(repository, config).execute(report_id=10)

    processor = ContentHashProcessor(repository, config)
    summary = processor.execute()

    assert summary["processed"] == 6

    cases = json.loads(
        Path("tests/fixtures/deduper/golden_cases.json").read_text(encoding="utf-8")
    )["content_cases"]

    exact = processor._compare_content_with_details(
        cases[0]["headline_new"],
        cases[0]["text_new"],
        cases[0]["headline_approved"],
        cases[0]["text_approved"],
        1,
        2,
    )
    assert exact == cases[0]["expected"]

    loose = processor._compare_content_with_details(
        cases[1]["headline_new"],
        cases[1]["text_new"],
        cases[1]["headline_approved"],
        cases[1]["text_approved"],
        11,
        22,
    )
    assert loose <= cases[1]["expected_max"]


@pytest.mark.unit
def test_embedding_processor_safeguard_skip_when_disabled(repo_and_config) -> None:
    repository, config = repo_and_config
    config.enable_embedding = False

    summary = EmbeddingProcessor(repository, config).execute()

    assert summary["status"] == "skipped"


@pytest.mark.unit
def test_embedding_processor_with_fake_model(repo_and_config, monkeypatch: pytest.MonkeyPatch) -> None:
    from src.modules.deduper.processors import embedding as embedding_mod

    repository, config = repo_and_config
    LoadProcessor(repository, config).execute(report_id=10)

    monkeypatch.setattr(embedding_mod, "SentenceTransformer", _FakeSentenceTransformer)
    monkeypatch.setattr(embedding_mod, "np", _FakeNumpy)

    summary = EmbeddingProcessor(repository, config).execute()

    assert summary["status"] == "ok"
    assert summary["processed"] == 6
