from src.modules.deduper.types import PipelineRunMode, PipelineStep, PipelineSummary, StepProgress

import pytest


@pytest.mark.unit
def test_step_progress_defaults() -> None:
    step = StepProgress(step=PipelineStep.LOAD)

    assert step.status == "pending"
    assert step.processed == 0
    assert step.total == 0


@pytest.mark.unit
def test_pipeline_summary_defaults() -> None:
    summary = PipelineSummary(mode=PipelineRunMode.ANALYZE_FAST)

    assert summary.mode == PipelineRunMode.ANALYZE_FAST
    assert summary.status == "pending"
    assert summary.started_at
    assert summary.steps == []
