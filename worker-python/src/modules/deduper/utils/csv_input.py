"""CSV input helpers for deduper article-id ingestion."""

from __future__ import annotations

import csv
from pathlib import Path

from src.modules.deduper.errors import DeduperProcessorError


def read_article_ids_from_csv(path_to_csv: str) -> list[int]:
    csv_file = Path(path_to_csv)
    if not csv_file.exists():
        raise DeduperProcessorError(f"CSV file not found at {path_to_csv}")

    article_ids: list[int] = []

    with csv_file.open("r", encoding="utf-8") as file:
        sample = file.read(1024)
        file.seek(0)

        delimiter = ","
        try:
            sniffer = csv.Sniffer()
            delimiter = sniffer.sniff(sample, delimiters=",;\t|").delimiter
        except csv.Error:
            for test_delimiter in [",", ";", "\t", "|"]:
                if test_delimiter in sample:
                    delimiter = test_delimiter
                    break

        reader = csv.reader(file, delimiter=delimiter)
        first_row = next(reader, [])
        file.seek(0)

        has_header = False
        try:
            int(first_row[0].strip())
        except (ValueError, IndexError):
            has_header = True

        if has_header:
            dict_reader = csv.DictReader(file, delimiter=delimiter)
            fieldnames = dict_reader.fieldnames or []
            id_column = _resolve_id_column(fieldnames)

            if id_column is None:
                raise DeduperProcessorError("Could not determine article ID column in CSV")

            for row in dict_reader:
                try:
                    article_id = int(str(row[id_column]).strip())
                    article_ids.append(article_id)
                except (ValueError, KeyError, TypeError):
                    continue
        else:
            reader = csv.reader(file, delimiter=delimiter)
            for row in reader:
                if not row:
                    continue
                try:
                    article_ids.append(int(row[0].strip()))
                except (ValueError, IndexError):
                    continue

    unique_ids: list[int] = []
    seen: set[int] = set()
    for article_id in article_ids:
        if article_id not in seen:
            unique_ids.append(article_id)
            seen.add(article_id)

    return unique_ids


def _resolve_id_column(fieldnames: list[str]) -> str | None:
    possible_names = ["articleId", "article_id", "id", "ArticleId", "ID"]
    for name in possible_names:
        if name in fieldnames:
            return name
    if fieldnames:
        return fieldnames[0]
    return None
