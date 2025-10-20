// Copyright (c) Meta Platforms, Inc. and affiliates
/**
 * Configuration handling for the docstring generation web application.
 * 
 * This file provides functions for loading and saving configuration for the
 * docstring generation process.
 */

/**
 * Load the default configuration from the server.
 */
function loadDefaultConfig() {
    $.ajax({
        url: '/api/default_config',
        type: 'GET',
        success: function(config) {
            applyConfigToForm(config);
        },
        error: function(xhr, status, error) {
            console.error('Error loading default configuration:', error);
            showMessage('warning', 'Failed to load default configuration. Using fallback values.');
        }
    });
}

/**
 * Apply a configuration object to the form inputs.
 * 
 * @param {Object} config - The configuration object to apply
 */
function applyConfigToForm(config) {
    // Set LLM configuration
    if (config.llm) {
        $('#llm-type').val(config.llm.type || 'gemini');
        $('#llm-api-key').val(config.llm.api_key || '');
        $('#llm-model').val(config.llm.model || 'gemini-2.5-pro');
        $('#llm-temperature').val(config.llm.temperature || 0.1);
        $('#llm-max-tokens').val(config.llm.max_tokens || 16384);
    }
    
    // Set provider tier and user overrides
    if (config.current_provider_tier) {
        $('#provider-tier').val(config.current_provider_tier);
    }
    
    if (config.user_overrides) {
        $('#enable-conservative-limits').prop('checked', config.user_overrides.enable_conservative_limits !== false);
        $('#max-components-per-minute').val(config.user_overrides.max_components_per_minute || 8);
        $('#delay-between-requests').val(config.user_overrides.delay_between_requests || 2000);
        $('#enable-batch-processing').prop('checked', config.user_overrides.enable_batch_processing !== false);
        $('#batch-size').val(config.user_overrides.batch_size || 3);
    }
    
    // Update provider limits display
    updateProviderLimitsDisplay();
    
    // Set flow control configuration
    if (config.flow_control) {
        $('#max-reader-search-attempts').val(config.flow_control.max_reader_search_attempts || 2);
        $('#max-verifier-rejections').val(config.flow_control.max_verifier_rejections || 1);
        $('#status-sleep-time').val(config.flow_control.status_sleep_time || 1);
    }
    
    // Set docstring options
    if (config.docstring_options) {
        $('#overwrite-docstrings').prop('checked', config.docstring_options.overwrite_docstrings || false);
    }
}

/**
 * Build a configuration object from the form inputs.
 * 
 * @returns {Object} The configuration object
 */
function buildConfigFromForm() {
    return {
        llm: {
            type: $('#llm-type').val(),
            api_key: $('#llm-api-key').val(),
            model: $('#llm-model').val(),
            temperature: parseFloat($('#llm-temperature').val()),
            max_tokens: parseInt($('#llm-max-tokens').val())
        },
        flow_control: {
            max_reader_search_attempts: parseInt($('#max-reader-search-attempts').val()),
            max_verifier_rejections: parseInt($('#max-verifier-rejections').val()),
            status_sleep_time: parseFloat($('#status-sleep-time').val())
        },
        docstring_options: {
            overwrite_docstrings: $('#overwrite-docstrings').is(':checked')
        },
        current_provider_tier: $('#provider-tier').val(),
        user_overrides: {
            enable_conservative_limits: $('#enable-conservative-limits').is(':checked'),
            max_components_per_minute: parseInt($('#max-components-per-minute').val()),
            delay_between_requests: parseInt($('#delay-between-requests').val()),
            enable_batch_processing: $('#enable-batch-processing').is(':checked'),
            batch_size: parseInt($('#batch-size').val())
        }
    };
}

/**
 * Update the provider limits display based on selected provider and tier.
 */
function updateProviderLimitsDisplay() {
    const provider = $('#llm-type').val();
    const tier = $('#provider-tier').val();
    
    // Provider-specific limits (simplified for demo)
    const providerLimits = {
        gemini: {
            free: { requests: 150, input: '1M', output: '1M', tier: 'Free' },
            pay_as_you_go: { requests: 150, input: '1M', output: '1M', tier: 'Pay-as-you-go' },
            enterprise: { requests: 150, input: '1M', output: '1M', tier: 'Enterprise' }
        },
        claude: {
            standard: { requests: 50, input: '20K', output: '8K', tier: 'Standard' },
            premium: { requests: 500, input: '200K', output: '100K', tier: 'Premium' }
        },
        openai: {
            standard: { requests: 500, input: '200K', output: '100K', tier: 'Standard' },
            premium: { requests: 10000, input: '2M', output: '1M', tier: 'Premium' }
        }
    };
    
    let limits = null;
    if (providerLimits[provider] && providerLimits[provider][tier]) {
        limits = providerLimits[provider][tier];
    }
    
    if (limits) {
        const effectiveRequests = Math.floor(limits.requests * 0.8); // Apply 80% conservative
        $('#provider-limits-display').html(`
            <div class="row">
                <div class="col-6">
                    <small><strong>Requests/Min:</strong><br>${limits.requests} (using ${effectiveRequests})</small>
                </div>
                <div class="col-6">
                    <small><strong>Input Tokens:</strong><br>${limits.input}</small>
                </div>
            </div>
            <div class="row mt-1">
                <div class="col-6">
                    <small><strong>Output Tokens:</strong><br>${limits.output}</small>
                </div>
                <div class="col-6">
                    <small><strong>Tier:</strong><br>${limits.tier}</small>
                </div>
            </div>
        `);
    } else {
        $('#provider-limits-display').html('<small class="text-muted">Select provider and tier to see limits</small>');
    }
}

/**
 * Initialize provider-specific event handlers.
 */
function initProviderLimitsHandlers() {
    // Update limits display when provider or tier changes
    $('#llm-type, #provider-tier').on('change', updateProviderLimitsDisplay);
    
    // Update limits display when conservative settings change
    $('#enable-conservative-limits').on('change', updateProviderLimitsDisplay);
} 