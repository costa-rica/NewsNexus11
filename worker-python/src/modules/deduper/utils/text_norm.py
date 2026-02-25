"""Text normalization and similarity helpers for deduper processors."""

from __future__ import annotations

import hashlib
import re

HTML_TAG_REGEX = re.compile(r"<[^>]+>")
NON_WORD_SPACE_REGEX = re.compile(r"[^\w\s]")
WHITESPACE_REGEX = re.compile(r"\s+")

STOP_WORDS = {
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "can",
    "this",
    "that",
    "these",
    "those",
}


def normalize_text(text: str | None) -> str:
    if not text:
        return ""

    normalized = text.lower()
    normalized = HTML_TAG_REGEX.sub(" ", normalized)
    normalized = NON_WORD_SPACE_REGEX.sub(" ", normalized)
    normalized = WHITESPACE_REGEX.sub(" ", normalized)

    words = [word for word in normalized.split() if word not in STOP_WORDS and len(word) > 2]
    return " ".join(words)


def prepare_content(headline: str | None, text: str | None) -> str:
    return f"{normalize_text(headline)}|||{normalize_text(text)}"


def sha1_from_normalized(normalized_content: str) -> str:
    if not normalized_content:
        return ""
    return hashlib.sha1(normalized_content.encode("utf-8")).hexdigest()


def simhash_from_normalized(normalized_content: str, hash_bits: int = 64) -> int:
    if not normalized_content:
        return 0

    words = normalized_content.split()
    if not words:
        return 0

    bit_vector = [0] * hash_bits
    for word in words:
        word_hash = hash(word) % (2**hash_bits)
        for i in range(hash_bits):
            if word_hash & (1 << i):
                bit_vector[i] += 1
            else:
                bit_vector[i] -= 1

    simhash = 0
    for i in range(hash_bits):
        if bit_vector[i] > 0:
            simhash |= 1 << i

    return simhash


def hamming_distance(hash1: int, hash2: int) -> int:
    return bin(hash1 ^ hash2).count("1")


def similarity_from_hamming(distance: int, total_bits: int = 64) -> float:
    return 1.0 - (distance / total_bits)
