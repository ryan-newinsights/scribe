# Copyright (c) Meta Platforms, Inc. and affiliates
"""
Configuration handler for the docstring generation web interface.

This module handles reading, writing, and validating the configuration for
the docstring generation process.
"""

import os
import yaml
import json
import tempfile
from pathlib import Path

def get_default_config():
    """
    Get the default configuration from agent_config.yaml.
    
    Returns:
        Dictionary containing the default configuration
    """
    default_config_path = Path('config/agent_config.yaml')
    
    if not default_config_path.exists():
        return {
            'llm': {
                'type': 'gemini',
                'api_key': '',
                'model': 'gemini-2.5-pro',
                'temperature': 0.1,
                'max_tokens': 16384
            },
            'flow_control': {
                'max_reader_search_attempts': 2,
                'max_verifier_rejections': 1,
                'status_sleep_time': 1
            },
            'docstring_options': {
                'overwrite_docstrings': False
            },
            'current_provider_tier': 'free',
            'user_overrides': {
                'enable_conservative_limits': True,
                'conservative_percentage': 0.8,
                'max_components_per_minute': 8,
                'delay_between_requests': 2000,
                'enable_batch_processing': True,
                'batch_size': 3
            }
        }
    
    with open(default_config_path, 'r') as f:
        config = yaml.safe_load(f)
    
    return config

def get_provider_limits(provider_type, tier=None):
    """
    Get rate limits for a specific provider and tier.
    
    Args:
        provider_type: The LLM provider ('gemini', 'claude', 'openai')
        tier: The tier level (optional, will use default if not provided)
    
    Returns:
        Dictionary containing the provider limits
    """
    config = get_default_config()
    provider_limits = config.get('provider_limits', {})
    
    if provider_type not in provider_limits:
        # Fallback to default limits if provider not found
        return {
            'requests_per_minute': 50,
            'input_tokens_per_minute': 20000,
            'output_tokens_per_minute': 8000,
            'tier_name': 'Unknown'
        }
    
    provider_config = provider_limits[provider_type]
    
    # If no tier specified, use the current provider tier
    if not tier:
        current_tier = config.get('current_provider_tier', 'free')
        tier = current_tier
    
    # Map tier names to provider-specific tiers
    tier_mapping = {
        'free': 'free',
        'pay_as_you_go': 'pay_as_you_go',
        'enterprise': 'enterprise',
        'standard': 'standard',
        'premium': 'premium'
    }
    
    # Find the appropriate tier
    tier_key = tier_mapping.get(tier, tier)
    if tier_key not in provider_config:
        # Fallback to first available tier
        tier_key = list(provider_config.keys())[0]
    
    return provider_config[tier_key]

def get_effective_rate_limits(provider_type, tier=None):
    """
    Get effective rate limits after applying user overrides.
    
    Args:
        provider_type: The LLM provider ('gemini', 'claude', 'openai')
        tier: The tier level (optional)
    
    Returns:
        Dictionary containing the effective rate limits
    """
    config = get_default_config()
    provider_limits = get_provider_limits(provider_type, tier)
    user_overrides = config.get('user_overrides', {})
    
    # Start with provider limits
    effective_limits = provider_limits.copy()
    
    # Apply conservative percentage if enabled
    if user_overrides.get('enable_conservative_limits', False):
        conservative_percentage = user_overrides.get('conservative_percentage', 0.8)
        effective_limits['requests_per_minute'] = int(
            effective_limits['requests_per_minute'] * conservative_percentage
        )
        effective_limits['input_tokens_per_minute'] = int(
            effective_limits['input_tokens_per_minute'] * conservative_percentage
        )
        effective_limits['output_tokens_per_minute'] = int(
            effective_limits['output_tokens_per_minute'] * conservative_percentage
        )
    
    # Add user override settings
    effective_limits.update({
        'delay_between_requests': user_overrides.get('delay_between_requests', 1000),
        'max_components_per_minute': user_overrides.get('max_components_per_minute', 10),
        'enable_batch_processing': user_overrides.get('enable_batch_processing', False),
        'batch_size': user_overrides.get('batch_size', 5)
    })
    
    return effective_limits

def validate_config(config):
    """
    Validate that the configuration has the required fields.
    
    Args:
        config: Dictionary containing the configuration to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    required_keys = ['llm', 'flow_control', 'docstring_options']
    
    for key in required_keys:
        if key not in config:
            return False, f"Missing required configuration section: {key}"
    
    # Check specific required fields in llm section
    llm_required = ['type', 'api_key', 'model']
    for key in llm_required:
        if key not in config['llm']:
            return False, f"Missing required field in llm section: {key}"
    
    return True, ""

def save_config(config):
    """
    Save the configuration to a temporary file for use by the generation process.
    
    Args:
        config: Dictionary containing the configuration to save
        
    Returns:
        Path to the saved configuration file
    """
    # Validate configuration
    is_valid, error_message = validate_config(config)
    if not is_valid:
        raise ValueError(f"Invalid configuration: {error_message}")
    
    # Create a temporary file
    temp_dir = tempfile.gettempdir()
    config_file = os.path.join(temp_dir, 'docstring_generator_config.yaml')
    
    with open(config_file, 'w') as f:
        yaml.dump(config, f, default_flow_style=False)
    
    return config_file 