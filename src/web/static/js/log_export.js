// Copyright (c) Meta Platforms, Inc. and affiliates
/**
 * Log export functionality for the docstring generation web application.
 * 
 * This file provides functions for exporting processing logs in various formats
 * for troubleshooting and analysis.
 */

// Global variables to track log data
let logData = {
    logs: [],
    apiCalls: [],
    rateLimitEvents: [],
    config: null,
    stats: {
        startTime: null,
        endTime: null,
        totalComponents: 0,
        processedComponents: 0,
        errors: 0,
        warnings: 0
    }
};

/**
 * Initialize log export functionality.
 */
function initLogExport() {
    // Initialize export modal
    logExportModal = new bootstrap.Modal(document.getElementById('log-export-modal'));
    
    // Add event handlers
    $('#export-logs-btn').on('click', showExportModal);
    $('#clear-logs-btn').on('click', clearLogs);
    $('#confirm-export-btn').on('click', exportLogs);
    
    // Initialize log data tracking
    logData.stats.startTime = new Date();
}

/**
 * Show the export modal.
 */
function showExportModal() {
    // Update filename with current timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const defaultFilename = `scribe-logs-${timestamp}`;
    $('#export-filename').val(defaultFilename);
    
    // Show the modal
    logExportModal.show();
}

/**
 * Clear all logs from the display and data.
 */
function clearLogs() {
    if (confirm('Are you sure you want to clear all logs? This action cannot be undone.')) {
        $('#log-content').html(`
            <div class="text-center py-4">
                <i class="fas fa-clipboard-list fa-2x text-muted mb-2"></i>
                <p class="text-muted">No logs yet</p>
                <small class="text-muted">Processing logs will appear here</small>
            </div>
        `);
        
        // Clear log data
        logData.logs = [];
        logData.apiCalls = [];
        logData.rateLimitEvents = [];
        logData.stats.errors = 0;
        logData.stats.warnings = 0;
        
        showMessage('info', 'Logs cleared successfully');
    }
}

/**
 * Export logs in the selected format.
 */
function exportLogs() {
    const format = $('#export-format').val();
    const filename = $('#export-filename').val() || `scribe-logs-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}`;
    
    // Collect export content based on checkboxes
    const exportData = {
        metadata: {
            exportTime: new Date().toISOString(),
            format: format,
            version: '1.0'
        }
    };
    
    if ($('#include-logs').is(':checked')) {
        exportData.logs = logData.logs;
    }
    
    if ($('#include-api-calls').is(':checked')) {
        exportData.apiCalls = logData.apiCalls;
    }
    
    if ($('#include-rate-limits').is(':checked')) {
        exportData.rateLimitEvents = logData.rateLimitEvents;
    }
    
    if ($('#include-config').is(':checked')) {
        exportData.config = logData.config;
    }
    
    if ($('#include-stats').is(':checked')) {
        exportData.stats = logData.stats;
    }
    
    // Generate file content based on format
    let content, mimeType, extension;
    
    switch (format) {
        case 'json':
            content = JSON.stringify(exportData, null, 2);
            mimeType = 'application/json';
            extension = 'json';
            break;
            
        case 'txt':
            content = generateTextExport(exportData);
            mimeType = 'text/plain';
            extension = 'txt';
            break;
            
        case 'csv':
            content = generateCSVExport(exportData);
            mimeType = 'text/csv';
            extension = 'csv';
            break;
            
        default:
            showMessage('error', 'Unknown export format');
            return;
    }
    
    // Download the file
    downloadFile(content, `${filename}.${extension}`, mimeType);
    
    // Close modal and show success message
    logExportModal.hide();
    showMessage('success', `Logs exported successfully as ${filename}.${extension}`);
}

/**
 * Generate text format export.
 */
function generateTextExport(data) {
    let text = `Scribe Processing Logs Export
Generated: ${data.metadata.exportTime}
Format: ${data.metadata.format}
Version: ${data.metadata.version}

${'='.repeat(50)}

`;
    
    if (data.config) {
        text += `CONFIGURATION
${'='.repeat(20)}
Provider: ${data.config.llm?.type || 'Unknown'}
Model: ${data.config.llm?.model || 'Unknown'}
API Tier: ${data.config.current_provider_tier || 'Unknown'}

`;
    }
    
    if (data.stats) {
        text += `PROCESSING STATISTICS
${'='.repeat(25)}
Start Time: ${data.stats.startTime || 'Unknown'}
End Time: ${data.stats.endTime || 'In Progress'}
Total Components: ${data.stats.totalComponents}
Processed Components: ${data.stats.processedComponents}
Errors: ${data.stats.errors}
Warnings: ${data.stats.warnings}

`;
    }
    
    if (data.logs && data.logs.length > 0) {
        text += `PROCESSING LOGS
${'='.repeat(20)}
`;
        data.logs.forEach(log => {
            text += `[${log.timestamp}] ${log.level}: ${log.message}\n`;
        });
        text += '\n';
    }
    
    if (data.apiCalls && data.apiCalls.length > 0) {
        text += `API CALLS
${'='.repeat(15)}
`;
        data.apiCalls.forEach(call => {
            text += `[${call.timestamp}] ${call.provider} - ${call.model}\n`;
            text += `  Request: ${call.inputTokens} tokens\n`;
            text += `  Response: ${call.outputTokens} tokens\n`;
            text += `  Duration: ${call.duration}ms\n`;
            if (call.error) {
                text += `  Error: ${call.error}\n`;
            }
            text += '\n';
        });
    }
    
    if (data.rateLimitEvents && data.rateLimitEvents.length > 0) {
        text += `RATE LIMIT EVENTS
${'='.repeat(20)}
`;
        data.rateLimitEvents.forEach(event => {
            text += `[${event.timestamp}] ${event.type}: ${event.message}\n`;
            text += `  Provider: ${event.provider}\n`;
            text += `  Limit: ${event.limitType}\n`;
            text += `  Current Usage: ${event.currentUsage}/${event.limit}\n\n`;
        });
    }
    
    return text;
}

/**
 * Generate CSV format export.
 */
function generateCSVExport(data) {
    let csv = '';
    
    // CSV Headers
    const headers = ['Timestamp', 'Type', 'Level', 'Provider', 'Model', 'Message', 'Details'];
    csv += headers.join(',') + '\n';
    
    // Process logs
    if (data.logs && data.logs.length > 0) {
        data.logs.forEach(log => {
            const row = [
                `"${log.timestamp}"`,
                '"Log"',
                `"${log.level}"`,
                '""',
                '""',
                `"${log.message.replace(/"/g, '""')}"`,
                '""'
            ];
            csv += row.join(',') + '\n';
        });
    }
    
    // Process API calls
    if (data.apiCalls && data.apiCalls.length > 0) {
        data.apiCalls.forEach(call => {
            const row = [
                `"${call.timestamp}"`,
                '"API Call"',
                '"INFO"',
                `"${call.provider}"`,
                `"${call.model}"`,
                `"API Call - ${call.inputTokens} input, ${call.outputTokens} output tokens"`,
                `"Duration: ${call.duration}ms${call.error ? ', Error: ' + call.error : ''}"`
            ];
            csv += row.join(',') + '\n';
        });
    }
    
    // Process rate limit events
    if (data.rateLimitEvents && data.rateLimitEvents.length > 0) {
        data.rateLimitEvents.forEach(event => {
            const row = [
                `"${event.timestamp}"`,
                '"Rate Limit"',
                `"${event.level}"`,
                `"${event.provider}"`,
                '""',
                `"${event.message.replace(/"/g, '""')}"`,
                `"${event.limitType}: ${event.currentUsage}/${event.limit}"`
            ];
            csv += row.join(',') + '\n';
        });
    }
    
    return csv;
}

/**
 * Download a file with the given content.
 */
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
}

/**
 * Add a log entry to the tracking data.
 */
function addLogEntry(level, message, details = null) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        level: level,
        message: message,
        details: details
    };
    
    logData.logs.push(logEntry);
    
    // Update statistics
    if (level === 'ERROR') {
        logData.stats.errors++;
    } else if (level === 'WARNING') {
        logData.stats.warnings++;
    }
}

/**
 * Add an API call entry to the tracking data.
 */
function addAPICallEntry(provider, model, inputTokens, outputTokens, duration, error = null) {
    const apiEntry = {
        timestamp: new Date().toISOString(),
        provider: provider,
        model: model,
        inputTokens: inputTokens,
        outputTokens: outputTokens,
        duration: duration,
        error: error
    };
    
    logData.apiCalls.push(apiEntry);
}

/**
 * Add a rate limit event to the tracking data.
 */
function addRateLimitEvent(type, provider, limitType, currentUsage, limit, message) {
    const rateLimitEntry = {
        timestamp: new Date().toISOString(),
        type: type,
        provider: provider,
        limitType: limitType,
        currentUsage: currentUsage,
        limit: limit,
        message: message,
        level: type === 'RATE_LIMIT_HIT' ? 'WARNING' : 'INFO'
    };
    
    logData.rateLimitEvents.push(rateLimitEntry);
    
    // Also add as a log entry
    addLogEntry(rateLimitEntry.level, `Rate Limit Event: ${message}`);
}

/**
 * Update configuration data for export.
 */
function updateConfigForExport(config) {
    logData.config = config;
}

/**
 * Update processing statistics.
 */
function updateProcessingStats(stats) {
    logData.stats = { ...logData.stats, ...stats };
}

/**
 * Mark processing as complete.
 */
function markProcessingComplete() {
    logData.stats.endTime = new Date().toISOString();
}
