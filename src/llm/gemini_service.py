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


class GeminiService(BaseLLMService):
    """Production LLM client utilizing Google Gemini via google-genai SDK with automatic offline fallback."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        enable_fallback: bool = True,
        fallback_service: Optional[BaseLLMService] = None,
    ):
        settings = get_settings()
        self._api_key = api_key if api_key is not None else (
            settings.GEMINI_API_KEY.get_secret_value() if settings.GEMINI_API_KEY else None
        )
        self._model_name = model_name or settings.GEMINI_MODEL
        is_prod = settings.APP_ENV.lower() == "production"
        # In production, mock fallback is strictly disabled to prevent silent degradation
        self._enable_fallback = False if is_prod else enable_fallback
        self._fallback_service = fallback_service or (
            MockLLMService(model_name=self._model_name) if self._enable_fallback else None
        )

        if not self._api_key:
            raise LLMError(
                "Gemini API key is not configured. Set GEMINI_API_KEY in .env or pass api_key explicitly."
            )

        try:
            from google import genai
            self._client = genai.Client(
                api_key=self._api_key,
            )
        except Exception as exc:
            if self._enable_fallback and self._fallback_service:
                logger.warning("Failed to initialize Google GenAI Client: %s. Will fallback to offline mode.", exc)
                self._client = None
            else:
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

        if self._client is None and self._enable_fallback and self._fallback_service:
            return self._fallback_service.generate(prompt, system_instruction=system_instruction)

        config = {}
        if system_instruction:
            config["system_instruction"] = system_instruction

        max_attempts = 3
        last_exc = None

        for attempt in range(1, max_attempts + 1):
            try:
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
                last_exc = exc
                is_transient = "503" in str(exc) or "unavailable" in str(exc).lower() or "timeout" in str(exc).lower()
                if is_transient and attempt < max_attempts:
                    import random
                    import time
                    sleep_time = (2 ** attempt) + random.uniform(0.1, 0.5)
                    logger.warning(
                        "Gemini API transient failure on model %s (attempt %d/%d): %s. Retrying in %.2fs...",
                        self._model_name,
                        attempt,
                        max_attempts,
                        exc,
                        sleep_time,
                    )
                    time.sleep(sleep_time)
                    continue

                if self._enable_fallback and self._fallback_service:
                    logger.warning(
                        "Gemini API generation failed (%s). Gracefully falling back to offline deterministic mode.",
                        exc,
                    )
                    return self._fallback_service.generate(prompt, system_instruction=system_instruction)

                logger.error("Gemini API call failed for model %s after %d attempts: %s", self._model_name, attempt, exc)
                raise LLMAPIError(f"Gemini API generation error: {exc}") from exc





def get_llm_service(
    use_mock: Optional[bool] = None,
    api_key: Optional[str] = None,
    model_name: Optional[str] = None,
    mock_default_response: Optional[str] = None,
) -> BaseLLMService:
    """Factory creating the appropriate LLM service implementation.

    Args:
        use_mock: Explicitly choose mock (True) or live (False). If None, defaults to live in production, or checks API key.
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
    is_prod = settings.APP_ENV.lower() == "production"

    if is_prod:
        if use_mock:
            raise LLMError("MockLLMService cannot be enabled in production environment.")
        if not configured_key:
            raise LLMError("GEMINI_API_KEY is not configured. Production requires a valid live Gemini API key.")
        return GeminiService(
            api_key=configured_key,
            model_name=model_name or settings.GEMINI_MODEL,
            enable_fallback=False,
        )

    # Non-production (development / test)
    should_use_mock = use_mock if use_mock is not None else (not configured_key)
    if should_use_mock:
        return MockLLMService(
            model_name=model_name or settings.GEMINI_MODEL,
            default_response=mock_default_response,
        )

    return GeminiService(
        api_key=configured_key,
        model_name=model_name or settings.GEMINI_MODEL,
    )
