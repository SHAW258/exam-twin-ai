"""Unit tests for the Gemini LLM service abstraction and MockLLMService."""

import pytest

from src.llm.gemini_service import (
    BaseLLMService,
    GeminiService,
    LLMAPIError,
    LLMEmptyResponseError,
    LLMError,
    MockLLMService,
    get_llm_service,
)


def test_mock_llm_successful_generation():
    """Verify MockLLMService returns configured default response."""
    llm = MockLLMService(model_name="mock-gemini-2.5-flash")
    assert llm.model_name == "mock-gemini-2.5-flash"

    result = llm.generate("Explain stacks.")
    assert "stack" in result.lower()
    assert len(llm.call_history) == 1
    assert llm.call_history[0]["prompt"] == "Explain stacks."


def test_mock_llm_custom_response_and_generator():
    """Verify custom default response and dynamic response generator function."""
    custom_text = "Custom academic tutor response."
    llm = MockLLMService(default_response=custom_text)
    assert llm.generate("Any prompt") == custom_text

    dynamic_llm = MockLLMService(response_generator=lambda p: f"Echo: {p[:10]}")
    assert dynamic_llm.generate("1234567890EXTRA") == "Echo: 1234567890"


def test_mock_llm_empty_response_handling():
    """Verify MockLLMService raises LLMEmptyResponseError when return_empty=True."""
    llm = MockLLMService(return_empty=True)
    with pytest.raises(LLMEmptyResponseError):
        llm.generate("Explain binary search.")


def test_mock_llm_api_error_handling():
    """Verify MockLLMService raises LLMAPIError when configured with error."""
    llm = MockLLMService(raise_error=LLMAPIError("Simulated Gemini quota exceeded."))
    with pytest.raises(LLMAPIError) as exc_info:
        llm.generate("Explain deadlocks.")
    assert "quota exceeded" in str(exc_info.value)


def test_llm_empty_prompt_raises():
    """Verify empty prompt raises LLMError."""
    llm = MockLLMService()
    with pytest.raises(LLMError):
        llm.generate("")

    with pytest.raises(LLMError):
        llm.generate("   \n\t  ")


def test_gemini_service_requires_api_key(monkeypatch):
    """Verify GeminiService raises LLMError if initialized without API key."""
    from src.config.settings import get_settings
    settings = get_settings()
    monkeypatch.setattr(settings, "GEMINI_API_KEY", None)
    with pytest.raises(LLMError) as exc_info:
        GeminiService(api_key=None)
    assert "API key is not configured" in str(exc_info.value)


def test_get_llm_service_factory():
    """Verify get_llm_service returns a valid BaseLLMService instance."""
    svc = get_llm_service(use_mock=True, mock_default_response="Mock answer.")
    assert isinstance(svc, BaseLLMService)
    assert svc.generate("Test prompt") == "Mock answer."
