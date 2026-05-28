// Scanner Frontend Logic

let currentScanId = null;
let scanResults = [];

// Toggle scan type selection
function toggleScanType(type) {
    const checkbox = document.getElementById(`scan-${type}`);
    const card = checkbox.closest('.scan-type-card');

    checkbox.checked = !checkbox.checked;

    if (checkbox.checked) {
        card.classList.add('active');
    } else {
        card.classList.remove('active');
    }
}

// Initialize scan type cards
document.addEventListener('DOMContentLoaded', () => {
    const checkboxes = document.querySelectorAll('.scan-type-card input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            checkbox.closest('.scan-type-card').classList.add('active');
        }
    });
});

// Start security scan
async function startScan() {
    const targetUrl = document.getElementById('target-url').value.trim();
    const authProof = document.getElementById('auth-proof').value.trim();
    const confirmed = document.getElementById('confirm-authorization').checked;

    // Validation
    if (!targetUrl) {
        alert('Please enter a target URL');
        return;
    }

    if (!confirmed) {
        alert('Please confirm that you have authorization to test this target');
        return;
    }

    // Validate URL format
    try {
        new URL(targetUrl);
    } catch (e) {
        alert('Please enter a valid URL (e.g., https://example.com)');
        return;
    }

    // Get selected scan types
    const scanTypes = [];
    document.querySelectorAll('.scan-type-card input[type="checkbox"]:checked').forEach(checkbox => {
        scanTypes.push(checkbox.id.replace('scan-', ''));
    });

    if (scanTypes.length === 0) {
        alert('Please select at least one scan type');
        return;
    }

    const scanDepth = document.getElementById('scan-depth').value;

    // Show thinking animation
    document.getElementById('thinking-animation').classList.add('show');
    document.getElementById('results-container').classList.remove('show');

    // Disable scan button
    const btnScan = document.querySelector('.btn-scan');
    btnScan.disabled = true;
    btnScan.textContent = '🔄 Scanning...';

    // Start scan
    try {
        const response = await fetch('/api/scanner/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
                targetUrl,
                authProof,
                scanTypes,
                scanDepth
            })
        });

        const data = await response.json();

        if (data.success) {
            currentScanId = data.scanId;

            // Poll for results
            pollScanProgress();
        } else {
            throw new Error(data.error || 'Failed to start scan');
        }
    } catch (error) {
        console.error('Scan error:', error);
        alert('Failed to start scan: ' + error.message);

        // Re-enable button
        btnScan.disabled = false;
        btnScan.textContent = '🚀 Start Security Scan';
        document.getElementById('thinking-animation').classList.remove('show');
    }
}

// Poll scan progress
async function pollScanProgress() {
    try {
        const response = await fetch(`/api/scanner/status/${currentScanId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        const data = await response.json();

        if (data.success) {
            // Update progress
            const progress = data.progress || 0;
            document.getElementById('progress-fill').style.width = progress + '%';
            document.getElementById('scan-status').textContent = data.status || 'Scanning...';
            document.getElementById('scan-status-text').textContent = data.currentTask || 'Analyzing target...';

            if (data.completed) {
                // Scan completed
                scanResults = data.results || [];
                displayResults();

                // Re-enable button
                const btnScan = document.querySelector('.btn-scan');
                btnScan.disabled = false;
                btnScan.textContent = '🚀 Start Security Scan';

                // Hide thinking animation
                document.getElementById('thinking-animation').classList.remove('show');
            } else {
                // Continue polling
                setTimeout(pollScanProgress, 2000);
            }
        }
    } catch (error) {
        console.error('Progress poll error:', error);
        setTimeout(pollScanProgress, 2000);
    }
}

// Display scan results
function displayResults() {
    const container = document.getElementById('vulnerability-list');
    container.innerHTML = '';

    if (scanResults.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                <h3 style="color: var(--primary-color); margin-bottom: 1rem;">✅ No vulnerabilities found!</h3>
                <p>The target appears to be secure based on the selected scan types.</p>
            </div>
        `;
    } else {
        scanResults.forEach(vuln => {
            const vulnCard = createVulnCard(vuln);
            container.appendChild(vulnCard);
        });
    }

    document.getElementById('results-container').classList.add('show');
}

// Create vulnerability card
function createVulnCard(vuln) {
    const card = document.createElement('div');
    card.className = `vuln-card ${vuln.severity.toLowerCase()}`;

    card.innerHTML = `
        <div class="vuln-header">
            <div class="vuln-title">${escapeHtml(vuln.title)}</div>
            <span class="severity-badge ${vuln.severity.toLowerCase()}">${vuln.severity}</span>
        </div>
        <div class="vuln-description">${escapeHtml(vuln.description)}</div>
        ${vuln.details ? `
        <div class="vuln-details">
            <strong>Details:</strong><br>
            ${escapeHtml(vuln.details)}
        </div>
        ` : ''}
        ${vuln.remediation ? `
        <div class="vuln-details" style="margin-top: 1rem; border-left: 3px solid var(--primary-color); padding-left: 1rem;">
            <strong>Remediation:</strong><br>
            ${escapeHtml(vuln.remediation)}
        </div>
        ` : ''}
    `;

    return card;
}

// Export report
async function exportReport(format) {
    if (!currentScanId) {
        alert('No scan results to export');
        return;
    }

    try {
        const response = await fetch(`/api/scanner/export/${currentScanId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({ format })
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            const extensions = {
                'docx': 'docx',
                'excel': 'xlsx',
                'pdf': 'pdf'
            };

            a.download = `security-report-${currentScanId}.${extensions[format]}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            throw new Error('Failed to export report');
        }
    } catch (error) {
        console.error('Export error:', error);
        alert('Failed to export report: ' + error.message);
    }
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
