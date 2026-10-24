"""Gemini LLM Service abstraction and client interface for ExamTwin.

Encapsulates all interaction with the Google GenAI SDK, providing an isolated,
testable interface with mock support for offline unit testing.
"""

from abc import ABC, abstractmethod
import logging
from typing import Callable, Optional

from src.config.settings import get_settings

logger = logging.getLogger(__name__)


class LLMError(Exception):
    """Base exception for all language model service errors."""
    pass


class LLMAPIError(LLMError):
    """Raised when an external LLM API call fails or encounters network/quota errors."""
    pass


class LLMEmptyResponseError(LLMError):
    """Raised when the LLM returns an empty or unparseable response."""
    pass


class BaseLLMService(ABC):
    """Abstract interface defining LLM text generation capabilities."""

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Identifier of the configured language model."""
        pass

    @abstractmethod
    def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
    ) -> str:
        """Generate a textual completion for the given prompt.

        Args:
            prompt: Formatted user or composite prompt.
            system_instruction: Optional system instruction directive.

        Returns:
            Generated text string.

        Raises:
            LLMError: On generation or API failure.
        """
        pass


class GeminiService(BaseLLMService):
    """Production LLM client utilizing Google Gemini via google-genai SDK."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
    ):
        settings = get_settings()
        self._api_key = api_key if api_key is not None else (
            settings.GEMINI_API_KEY.get_secret_value() if settings.GEMINI_API_KEY else None
        )
        self._model_name = model_name or settings.GEMINI_MODEL

        if not self._api_key:
            raise LLMError(
                "Gemini API key is not configured. Set GEMINI_API_KEY in .env or pass api_key explicitly."
            )

        try:
            from google import genai
            self._client = genai.Client(api_key=self._api_key)
        except Exception as exc:
            raise LLMError(f"Failed to initialize Google GenAI Client: {exc}") from exc

    @property
    def model_name(self) -> str:
        return self._model_name

    def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
    ) -> str:
        if not prompt or not prompt.strip():
            raise LLMError("Prompt cannot be empty or whitespace-only.")

        try:
            config = {}
            if system_instruction:
                config["system_instruction"] = system_instruction

            response = self._client.models.generate_content(
                model=self._model_name,
                contents=prompt,
                config=config if config else None,
            )

            text_result = getattr(response, "text", None)
            if not text_result or not text_result.strip():
                raise LLMEmptyResponseError("Gemini returned an empty text completion.")

            return text_result.strip()

        except LLMEmptyResponseError:
            raise
        except Exception as exc:
            logger.error("Gemini API call failed for model %s: %s", self._model_name, exc)
            raise LLMAPIError(f"Gemini API generation error: {exc}") from exc


class MockLLMService(BaseLLMService):
    """Mock LLM implementation for deterministic, offline testing without network or API costs."""

    def __init__(
        self,
        model_name: str = "mock-gemini-2.5-flash",
        default_response: Optional[str] = None,
        response_generator: Optional[Callable[[str], str]] = None,
        raise_error: Optional[Exception] = None,
        return_empty: bool = False,
    ):
        self._model_name = model_name
        self.default_response = default_response or (
            "Based on the provided course material (data_structures.pdf, Page 5), "
            "a stack is a linear data structure following Last-In-First-Out (LIFO) order."
        )
        self.response_generator = response_generator
        self.raise_error = raise_error
        self.return_empty = return_empty
        self.call_history = []

    @property
    def model_name(self) -> str:
        return self._model_name

    def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
    ) -> str:
        if not prompt or not prompt.strip():
            raise LLMError("Prompt cannot be empty or whitespace-only.")

        self.call_history.append({"prompt": prompt, "system_instruction": system_instruction})

        if self.raise_error:
            raise self.raise_error

        if self.return_empty:
            raise LLMEmptyResponseError("Mock LLM returned empty response.")

        if self.response_generator:
            return self.response_generator(prompt)

        return self.default_response


def get_llm_service(
    use_mock: bool = False,
    api_key: Optional[str] = None,
    model_name: Optional[str] = None,
    mock_default_response: Optional[str] = None,
) -> BaseLLMService:
    """Factory creating the appropriate LLM service implementation.

    Args:
        use_mock: If True, returns MockLLMService.
        api_key: Optional API key override.
        model_name: Optional model name override.
        mock_default_response: Canned response if using mock.

    Returns:
        BaseLLMService instance.
    """
    settings = get_settings()
    configured_key = api_key or (
        settings.GEMINI_API_KEY.get_secret_value() if settings.GEMINI_API_KEY else None
    )

    if use_mock or not configured_key:
        return MockLLMService(
            model_name=model_name or settings.GEMINI_MODEL,
            default_response=mock_default_response,
        )

    return GeminiService(
        api_key=configured_key,
        model_name=model_name or settings.GEMINI_MODEL,
    )
