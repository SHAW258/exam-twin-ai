"""Pretrained embedding service abstraction for ExamTwin semantic retrieval.

NOTE ON ML POSITION:
This service integrates pretrained embedding models (such as Google text-embedding-004)
for semantic vector representation. ExamTwin does not train embedding representations
from scratch.
"""

from abc import ABC, abstractmethod
import hashlib
import logging
import math
import re
from typing import List, Optional

from src.config.settings import get_settings

logger = logging.getLogger(__name__)


class EmbeddingError(Exception):
    """Raised when text cannot be converted into an embedding vector."""
    pass


class BaseEmbeddingService(ABC):
    """Abstract interface for generating semantic vector embeddings."""

    @property
    @abstractmethod
    def dimension(self) -> int:
        """The dimensionality of the output embedding vectors."""
        pass

    @property
    @abstractmethod
    def model_name(self) -> str:
        """The identifier of the underlying pretrained model."""
        pass

    @abstractmethod
    def embed_text(self, text: str) -> List[float]:
        """Generate a dense embedding vector for a single piece of text.

        Args:
            text: Input string to embed.

        Returns:
            List of floats representing the embedding vector.

        Raises:
            EmbeddingError: If text is empty or embedding fails.
        """
        pass

    @abstractmethod
    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Generate dense embedding vectors for a batch of text strings.

        Args:
            texts: List of strings to embed.

        Returns:
            List of float vectors matching the order of input texts.

        Raises:
            EmbeddingError: If batch processing fails.
        """
        pass


def _l2_normalize(vec: List[float]) -> List[float]:
    """Normalize a vector to unit length (L2 norm = 1.0)."""
    norm = math.sqrt(sum(x * x for x in vec))
    if norm < 1e-12:
        return [0.0] * len(vec)
    return [round(x / norm, 6) for x in vec]


class DeterministicMockEmbeddingService(BaseEmbeddingService):
    """Offline, deterministic embedding provider for testing and evaluation without API keys.

    Uses token hashing and orthogonal projection to generate reproducible vectors:
    - Identical texts generate identical vectors.
    - Semantically similar texts (sharing words/n-grams) have high cosine similarity.
    - Distinct texts produce low similarity.
    - Requires zero network calls or credentials.
    """

    def __init__(self, dimension: int = 768, model_name: str = "mock-text-embedding-004"):
        if dimension <= 0:
            raise ValueError(f"dimension must be positive, got {dimension}")
        self._dimension = dimension
        self._model_name = model_name

    @property
    def dimension(self) -> int:
        return self._dimension

    @property
    def model_name(self) -> str:
        return self._model_name

    def _generate_vector(self, text: str) -> List[float]:
        """Compute a deterministic pseudo-semantic vector from text."""
        cleaned = text.strip().lower()
        if not cleaned:
            raise EmbeddingError("Cannot embed empty or whitespace-only text.")

        tokens = re.findall(r"\b\w+\b", cleaned)
        if not tokens:
            tokens = [cleaned]

        vec = [0.0] * self._dimension

        # Token-level hashing with frequency weighting
        for token in tokens:
            h = int(hashlib.sha256(token.encode("utf-8")).hexdigest(), 16)
            # Scatter energy across multiple dimensions
            for i in range(8):
                idx = (h >> (i * 8)) % self._dimension
                sign = 1.0 if ((h >> (i * 4)) & 1) else -1.0
                vec[idx] += sign

        # Global sequence hash for order sensitivity
        seq_hash = int(hashlib.md5(cleaned.encode("utf-8")).hexdigest(), 16)
        for i in range(16):
            idx = (seq_hash >> (i * 4)) % self._dimension
            vec[idx] += 0.5

        return _l2_normalize(vec)

    def embed_text(self, text: str) -> List[float]:
        if not text or not text.strip():
            raise EmbeddingError("Input text cannot be empty or whitespace-only.")
        return self._generate_vector(text)

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        return [self.embed_text(t) for t in texts]


class GeminiEmbeddingService(BaseEmbeddingService):
    """Google Gemini API embedding service utilizing pretrained text-embedding-004 with offline fallback."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        dimension: int = 768,
        enable_fallback: bool = True,
        fallback_service: Optional[BaseEmbeddingService] = None,
    ):
        settings = get_settings()
        self._api_key = api_key if api_key is not None else (
            settings.GEMINI_API_KEY.get_secret_value() if settings.GEMINI_API_KEY else None
        )
        self._model_name = model_name or settings.EMBEDDING_MODEL
        self._dimension = dimension
        is_prod = settings.APP_ENV.lower() == "production"
        # In production, mock fallback is strictly disabled to prevent silent degradation
        self._enable_fallback = False if is_prod else enable_fallback
        self._fallback_service = fallback_service or (
            DeterministicMockEmbeddingService(dimension=self._dimension, model_name=f"fallback-{self._model_name}")
            if self._enable_fallback else None
        )

        if not self._api_key:
            raise EmbeddingError(
                "Gemini API key is not configured. Set GEMINI_API_KEY in .env or pass explicitly."
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
                raise EmbeddingError(f"Failed to initialize Google GenAI Client: {exc}") from exc

    @property
    def dimension(self) -> int:
        return self._dimension

    @property
    def model_name(self) -> str:
        return self._model_name

    def embed_text(self, text: str) -> List[float]:
        if not text or not text.strip():
            raise EmbeddingError("Input text cannot be empty.")

        results = self.embed_texts([text])
        if not results:
            raise EmbeddingError("Gemini embedding API returned an empty response.")
        return results[0]

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []

        for idx, t in enumerate(texts):
            if not t or not t.strip():
                raise EmbeddingError(f"Text at index {idx} is empty or whitespace-only.")

        if self._client is None and self._enable_fallback and self._fallback_service:
            return self._fallback_service.embed_texts(texts)

        try:
            from google.genai import types
            config = types.EmbedContentConfig(output_dimensionality=self._dimension)

            # If batch exceeds Google's 100-chunk limit, immediately use offline embedding
            if len(texts) > 90 and self._enable_fallback and self._fallback_service:
                logger.info(
                    "Large batch of %d chunks detected. Immediately using offline embedding model to prevent quota failure.",
                    len(texts),
                )
                return self._fallback_service.embed_texts(texts)

            response = self._client.models.embed_content(
                model=self._model_name,
                contents=texts,
                config=config,
            )
            embeddings = []
            for item in response.embeddings:
                values = list(item.values)
                embeddings.append(_l2_normalize(values))
            return embeddings
        except Exception as exc:
            if self._enable_fallback and self._fallback_service:
                logger.warning(
                    "Gemini API failed or quota reached (%s). Immediately using offline model.",
                    exc,
                )
                return self._fallback_service.embed_texts(texts)
            raise EmbeddingError(f"Gemini API failed to embed content: {exc}") from exc



def get_embedding_service(
    use_mock: Optional[bool] = None,
    api_key: Optional[str] = None,
    dimension: int = 768,
    model_name: Optional[str] = None,
) -> BaseEmbeddingService:
    """Factory creating the appropriate embedding service.

    Args:
        use_mock: Explicitly choose mock (True) or live (False). If None, defaults to live in production, or checks API key.
        api_key: Optional Gemini API key override.
        dimension: Vector dimensionality (default 768).
        model_name: Model identifier.

    Returns:
        Instance conforming to BaseEmbeddingService.
    """
    settings = get_settings()
    configured_key = api_key or (
        settings.GEMINI_API_KEY.get_secret_value() if settings.GEMINI_API_KEY else None
    )
    is_prod = settings.APP_ENV.lower() == "production"

    if is_prod:
        if use_mock:
            raise EmbeddingError("DeterministicMockEmbeddingService cannot be enabled in production environment.")
        if not configured_key:
            raise EmbeddingError("GEMINI_API_KEY is not configured. Production requires a valid live Gemini API key.")
        return GeminiEmbeddingService(
            api_key=configured_key,
            model_name=model_name or settings.EMBEDDING_MODEL,
            dimension=dimension,
            enable_fallback=False,
        )

    # Non-production (development / test)
    should_use_mock = use_mock if use_mock is not None else (not configured_key)
    if should_use_mock:
        return DeterministicMockEmbeddingService(
            dimension=dimension,
            model_name=model_name or "mock-text-embedding-004",
        )

    return GeminiEmbeddingService(
        api_key=configured_key,
        model_name=model_name or settings.EMBEDDING_MODEL,
        dimension=dimension,
    )
