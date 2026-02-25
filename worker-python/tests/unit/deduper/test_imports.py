import pytest


@pytest.mark.unit
def test_imports_for_phase2_scaffold() -> None:
    import src.modules.deduper as deduper_pkg
    import src.modules.deduper.config as config
    import src.modules.deduper.errors as errors
    import src.modules.deduper.logging_adapter as logging_adapter
    import src.modules.deduper.orchestrator as orchestrator
    import src.modules.deduper.processors.content_hash as content_hash
    import src.modules.deduper.processors.embedding as embedding
    import src.modules.deduper.processors.load as load
    import src.modules.deduper.processors.states as states
    import src.modules.deduper.processors.url_check as url_check
    import src.modules.deduper.repository as repository
    import src.modules.deduper.types as types
    import src.modules.deduper.utils.csv_input as csv_input
    import src.modules.deduper.utils.text_norm as text_norm

    assert deduper_pkg
    assert config
    assert errors
    assert logging_adapter
    assert orchestrator
    assert repository
    assert types
    assert load
    assert states
    assert url_check
    assert content_hash
    assert embedding
    assert csv_input
    assert text_norm
