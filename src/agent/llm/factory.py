# Copyright (c) Meta Platforms, Inc. and affiliates
from typing import Dict, Any, Optional
from pathlib import Path
import yaml

from .base import BaseLLM
from .openai_llm import OpenAILLM
from .claude_llm import ClaudeLLM
from .huggingface_llm import HuggingFaceLLM
from .gemini_llm import GeminiLLM

class LLMFactory:
    """Factory class for creating LLM instances."""
    
    @staticmethod
    def create_llm(config: Dict[str, Any]) -> BaseLLM:
        """Create an LLM instance based on configuration.
        
        Args:
            config: Configuration dictionary containing LLM settings
            
        Returns:
            An instance of BaseLLM
            
        Raises:
            ValueError: If the LLM type is not supported
        """
        llm_type = config["type"].lower()
        model = config.get("model")
        
        if not model:
            raise ValueError("Model must be specified in the config file")
        
        # Load provider-specific rate limits
        try:
            from ..web.config_handler import get_effective_rate_limits
            effective_limits = get_effective_rate_limits(llm_type)
            rate_limits = {
                "requests_per_minute": effective_limits.get("requests_per_minute", 50),
                "input_tokens_per_minute": effective_limits.get("input_tokens_per_minute", 20000),
                "output_tokens_per_minute": effective_limits.get("output_tokens_per_minute", 8000),
                "delay_between_requests": effective_limits.get("delay_between_requests", 1000),
                "max_components_per_minute": effective_limits.get("max_components_per_minute", 10),
                "enable_batch_processing": effective_limits.get("enable_batch_processing", False),
                "batch_size": effective_limits.get("batch_size", 5)
            }
        except ImportError:
            # Fallback to default rate limits if config handler not available
            rate_limits = {
                "requests_per_minute": 50,
                "input_tokens_per_minute": 20000,
                "output_tokens_per_minute": 8000,
                "delay_between_requests": 1000,
                "max_components_per_minute": 10,
                "enable_batch_processing": False,
                "batch_size": 5
            }
        
        if llm_type == "openai":
            return OpenAILLM(
                api_key=config["api_key"],
                model=model,
                rate_limits=rate_limits
            )
        elif llm_type == "claude":
            return ClaudeLLM(
                api_key=config["api_key"],
                model=model,
                rate_limits=rate_limits
            )
        elif llm_type == "gemini":
            return GeminiLLM(
                api_key=config["api_key"],
                model=model,
                rate_limits=rate_limits
            )
        elif llm_type == "huggingface":
            return HuggingFaceLLM(
                model_name=model,
                device=config.get("device", "cuda"),
                torch_dtype=config.get("torch_dtype", "float16")
            )
        else:
            raise ValueError(f"Unsupported LLM type: {llm_type}")
    
    @staticmethod
    def load_config(config_path: Optional[str] = None) -> Dict[str, Any]:
        """Load LLM configuration from file.
        
        Args:
            config_path: Path to the configuration file. If None, uses default path.
            
        Returns:
            Configuration dictionary
            
        Raises:
            FileNotFoundError: If the configuration file doesn't exist
        """
        if config_path is None:
            config_path = str(Path(__file__).parent.parent.parent.parent / "config" / "agent_config.yaml")
        
        if not Path(config_path).exists():
            raise FileNotFoundError(f"Configuration file not found: {config_path}")
        
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        
        return config 