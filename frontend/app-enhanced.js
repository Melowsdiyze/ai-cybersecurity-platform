// Enhanced AI Cybersecurity Platform Frontend
// With AI Command Parser and Auto-Scanner Integration

const API_URL = window.location.origin;

let currentUser = null;
let currentSessionId = null;
let authToken = null;
let activeScanId = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('currentUser');

    if (storedToken && storedUser) {
        authToken = storedToken;
        currentUser = JSON.parse(storedUser);
        showDashboard();
        initializeDashboard();
    } else {
        showLogin();
    }

    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', handleNavigation);
    });

    document.getElementById('chat-form').addEventListener('submit', handleChatSubmit);

    const chatInput = document.getElementById('chat-input');
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = chatInput.scrollHeight + 'px';
    });

    const knowledgeSearch = document.getElementById('knowledge-search');
    if (knowledgeSearch) {
        let searchTimeout;
        knowledgeSearch.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchKnowledge(e.target.value);
            }, 500);
        });
    }
}

// Authentication
async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const btnSubmit = e.target.querySelector('button[type="submit"]');
    const originalText = btnSubmit.innerHTML;
    btnSubmit.innerHTML = '<span class="spinner"></span> Signing in...';
    btnSubmit.disabled = true;

    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            authToken = data.token;
            currentUser = data.user;

            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            showDashboard();
            initializeDashboard();
        } else {
            showError(data.error || 'Login failed');
            btnSubmit.innerHTML = originalText;
            btnSubmit.disabled = false;
        }
    } catch (error) {
        showError('Connection error. Please try again.');
        btnSubmit.innerHTML = originalText;
        btnSubmit.disabled = false;
    }
}

function handleLogout() {
    authToken = null;
    currentUser = null;
    currentSessionId = null;

    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');

    showLogin();
}

function showError(message) {
    const errorDiv = document.getElementById('login-error');
    errorDiv.textContent = message;
    errorDiv.classList.add('active');

    setTimeout(() => {
        errorDiv.classList.remove('active');
    }, 5000);
}

function showLogin() {
    document.getElementById('login-page').classList.add('active');
    document.getElementById('dashboard-page').classList.remove('active');
}

function showDashboard() {
    document.getElementById('login-page').classList.remove('active');
    document.getElementById('dashboard-page').classList.add('active');
}

function handleNavigation(e) {
    e.preventDefault();

    const viewName = e.currentTarget.dataset.view;
    if (!viewName) return;

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    e.currentTarget.classList.add('active');

    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(`${viewName}-view`).classList.add('active');

    if (viewName === 'tools') {
        loadTools();
    } else if (viewName === 'knowledge') {
        loadKnowledge();
    } else if (viewName === 'history') {
        loadHistory();
    }
}

async function initializeDashboard() {
    document.getElementById('user-email').textContent = currentUser.email;
    document.getElementById('user-role').textContent = currentUser.role;

    await createChatSession();
    checkAIHealth();
}

async function createChatSession() {
    try {
        const response = await fetch(`${API_URL}/api/chat/session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();
        if (data.success) {
            currentSessionId = data.sessionId;
        }
    } catch (error) {
        console.error('Session creation error:', error);
    }
}

async function checkAIHealth() {
    try {
        const response = await fetch(`${API_URL}/api/health`);
        const data = await response.json();

        if (!data.ollama.available) {
            console.warn('Ollama AI is not available');
        }
    } catch (error) {
        console.error('Health check error:', error);
    }
}

// AI Command Parser
function parseAICommand(message) {
    const lowercaseMsg = message.toLowerCase();

    // Scan command patterns
    const scanPatterns = [
        /(?:scan|test|analyze|check)\s+(?:website|site|url|target)?\s*(https?:\/\/[^\s]+)/i,
        /(?:cari|temukan|berikan)\s+(?:celah|kelemahan|vulnerability|bug)\s+(?:di|pada|website|site)?\s*(https?:\/\/[^\s]+)/i,
        /(?:vulnerability|security|penetration)\s+(?:scan|test|assessment)\s+(?:for|on)?\s*(https?:\/\/[^\s]+)/i
    ];

    for (const pattern of scanPatterns) {
        const match = message.match(pattern);
        if (match && match[1]) {
            return {
                type: 'scan',
                url: match[1],
                requestReport: lowercaseMsg.includes('report') || lowercaseMsg.includes('laporan')
            };
        }
    }

    return null;
}

// Enhanced Chat Submit with Auto-Scanner
async function handleChatSubmit(e) {
    e.preventDefault();

    const input = document.getElementById('chat-input');
    const message = input.value.trim();

    if (!message) return;

    input.value = '';
    input.style.height = 'auto';

    // Add user message to UI
    addMessageToUI('user', message);

    // Parse for commands
    const command = parseAICommand(message);

    if (command && command.type === 'scan') {
        // Auto-trigger vulnerability scan
        await handleAutoScan(command.url, command.requestReport);
        return;
    }

    // Normal AI chat
    try {
        const response = await fetch(`${API_URL}/api/chat/message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                sessionId: currentSessionId,
                message: message
            })
        });

        const data = await response.json();

        if (data.success) {
            addMessageToUI('assistant', data.message);
        } else {
            addMessageToUI('assistant', 'Error: ' + (data.error || 'Failed to get response'));
        }
    } catch (error) {
        console.error('Chat error:', error);
        addMessageToUI('assistant', 'Connection error. Please try again.');
    }
}

// Auto-Scan Functionality
async function handleAutoScan(targetUrl, generateReport = true) {
    // Show scanning message
    addMessageToUI('assistant', `🔍 **Memulai vulnerability scan untuk:** ${targetUrl}\n\nScan ini akan menggunakan:\n- Reconnaissance\n- SQL Injection Testing\n- XSS Detection\n- Security Headers Analysis\n- SSL/TLS Check\n\n⏳ **Status:** Initializing scan...`);

    // Show thinking animation
    const thinkingMsg = addThinkingAnimation();

    try {
        // Start scan
        const scanResponse = await fetch(`${API_URL}/api/scanner/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                targetUrl: targetUrl,
                scanTypes: ['recon', 'sqli', 'xss', 'ssl', 'headers'],
                scanDepth: 'standard',
                authProof: 'Automated scan via AI assistant'
            })
        });

        const scanData = await scanResponse.json();

        if (!scanData.success) {
            removeThinkingAnimation(thinkingMsg);
            addMessageToUI('assistant', `❌ **Scan failed:** ${scanData.error}`);
            return;
        }

        activeScanId = scanData.scanId;

        // Poll scan progress
        await pollScanProgressInChat(activeScanId, thinkingMsg, generateReport);

    } catch (error) {
        removeThinkingAnimation(thinkingMsg);
        addMessageToUI('assistant', `❌ **Error:** ${error.message}`);
    }
}

async function pollScanProgressInChat(scanId, thinkingMsg, generateReport) {
    try {
        const response = await fetch(`${API_URL}/api/scanner/status/${scanId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (data.success) {
            // Update thinking message with progress
            updateThinkingAnimation(thinkingMsg, data.currentTask || 'Scanning...', data.progress || 0);

            if (data.completed) {
                removeThinkingAnimation(thinkingMsg);

                // Display results
                displayScanResults(data.results, generateReport);
            } else {
                // Continue polling
                setTimeout(() => pollScanProgressInChat(scanId, thinkingMsg, generateReport), 2000);
            }
        }
    } catch (error) {
        removeThinkingAnimation(thinkingMsg);
        addMessageToUI('assistant', `❌ **Polling error:** ${error.message}`);
    }
}

function displayScanResults(results, generateReport) {
    if (results.length === 0) {
        addMessageToUI('assistant', `✅ **Scan Completed!**\n\n🎉 **No vulnerabilities found!**\n\nTarget appears to be secure based on the selected scan types.`);
        return;
    }

    // Count by severity
    const severityCounts = {
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
        INFO: 0
    };

    results.forEach(vuln => {
        severityCounts[vuln.severity] = (severityCounts[vuln.severity] || 0) + 1;
    });

    // Build summary message
    let summaryMsg = `✅ **Scan Completed!**\n\n📊 **Summary:**\n`;
    summaryMsg += `- Total Vulnerabilities: **${results.length}**\n`;
    if (severityCounts.CRITICAL > 0) summaryMsg += `- 🔴 Critical: **${severityCounts.CRITICAL}**\n`;
    if (severityCounts.HIGH > 0) summaryMsg += `- 🟠 High: **${severityCounts.HIGH}**\n`;
    if (severityCounts.MEDIUM > 0) summaryMsg += `- 🟡 Medium: **${severityCounts.MEDIUM}**\n`;
    if (severityCounts.LOW > 0) summaryMsg += `- 🟢 Low: **${severityCounts.LOW}**\n`;
    if (severityCounts.INFO > 0) summaryMsg += `- 🔵 Info: **${severityCounts.INFO}**\n`;

    summaryMsg += `\n---\n\n### 🔍 Detailed Findings:\n\n`;

    // Add detailed findings
    results.forEach((vuln, index) => {
        const emoji = {
            CRITICAL: '🔴',
            HIGH: '🟠',
            MEDIUM: '🟡',
            LOW: '🟢',
            INFO: '🔵'
        }[vuln.severity] || '⚪';

        summaryMsg += `**${index + 1}. ${emoji} ${vuln.title}** [${vuln.severity}]\n\n`;
        summaryMsg += `${vuln.description}\n\n`;

        if (vuln.details) {
            summaryMsg += `*Details:* ${vuln.details}\n\n`;
        }

        if (vuln.remediation) {
            summaryMsg += `*Remediation:* ${vuln.remediation}\n\n`;
        }

        summaryMsg += `---\n\n`;
    });

    addMessageToUI('assistant', summaryMsg);

    // Offer report generation
    if (generateReport) {
        addMessageToUI('assistant', `📄 **Report Generation**\n\nLaporan tersedia dalam format:\n- [Download DOCX Report](#export-docx-${activeScanId})\n- [Download Excel Report](#export-excel-${activeScanId})\n- [Download PDF Report](#export-pdf-${activeScanId})\n\nKlik link di atas atau ketik:\n- \`export docx\` untuk Word document\n- \`export excel\` untuk spreadsheet\n- \`export pdf\` untuk PDF report`);
    }
}

function addThinkingAnimation() {
    const messagesContainer = document.getElementById('chat-messages');

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message message-assistant thinking-message';
    messageDiv.innerHTML = `
        <div class="message-content">
            <div class="thinking-indicator">
                <span class="thinking-dot"></span>
                <span class="thinking-dot"></span>
                <span class="thinking-dot"></span>
            </div>
            <div class="thinking-status">AI is analyzing...</div>
            <div class="thinking-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: 0%"></div>
                </div>
            </div>
        </div>
    `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    return messageDiv;
}

function updateThinkingAnimation(messageDiv, status, progress) {
    if (!messageDiv) return;

    const statusDiv = messageDiv.querySelector('.thinking-status');
    const progressFill = messageDiv.querySelector('.progress-fill');

    if (statusDiv) statusDiv.textContent = status;
    if (progressFill) progressFill.style.width = progress + '%';
}

function removeThinkingAnimation(messageDiv) {
    if (messageDiv && messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
    }
}

function addMessageToUI(role, content) {
    const messagesContainer = document.getElementById('chat-messages');

    const welcomeMessage = messagesContainer.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${role}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = formatMessage(content);

    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function formatMessage(text) {
    let formatted = text;

    const tempDiv = document.createElement('div');
    tempDiv.textContent = formatted;
    formatted = tempDiv.innerHTML;

    formatted = formatted.replace(/```([\w]*)\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre><code class="language-${lang || 'text'}">${code.trim()}</code></pre>`;
    });

    formatted = formatted.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    formatted = formatted.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');

    formatted = formatted.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    formatted = formatted.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    formatted = formatted.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    formatted = formatted.replace(/^[*-] (.+)$/gm, '<li>$1</li>');
    formatted = formatted.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
        return `<ul>${match}</ul>`;
    });

    formatted = formatted.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // Enhanced link handling with export functionality
    formatted = formatted.replace(/\[([^\]]+)\]\(#export-(\w+)-([^)]+)\)/g, (match, text, format, scanId) => {
        return `<a href="#" class="export-link" data-format="${format}" data-scan-id="${scanId}">${text}</a>`;
    });

    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

    formatted = formatted.replace(/\n/g, '<br>');

    return formatted;
}

// Add click handlers for export links
document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('export-link')) {
        e.preventDefault();

        const format = e.target.dataset.format;
        const scanId = e.target.dataset.scanId;

        if (format && scanId) {
            await exportReport(format, scanId);
        }
    }
});

async function exportReport(format, scanId) {
    try {
        addMessageToUI('assistant', `⏳ Generating ${format.toUpperCase()} report...`);

        const response = await fetch(`${API_URL}/api/scanner/export/${scanId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
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

            a.download = `security-report-${scanId}.${extensions[format]}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            addMessageToUI('assistant', `✅ **Report downloaded successfully!**\n\nFile: \`security-report-${scanId}.${extensions[format]}\``);
        } else {
            throw new Error('Failed to export report');
        }
    } catch (error) {
        addMessageToUI('assistant', `❌ **Export failed:** ${error.message}`);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Tools functionality
async function loadTools() {
    const container = document.getElementById('tools-container');
    container.innerHTML = '<div class="loading">Loading tools...</div>';

    const tools = getToolsForRole(currentUser.role);

    container.innerHTML = '';

    if (tools.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">No tools available for this role.</p>';
        return;
    }

    tools.forEach(tool => {
        const toolCard = document.createElement('div');
        toolCard.className = 'tool-card';
        toolCard.innerHTML = `
            <h3>${tool.name}</h3>
            <p>${tool.description}</p>
            <span class="tool-badge">${tool.category}</span>
        `;

        toolCard.addEventListener('click', () => {
            handleToolClick(tool);
        });

        container.appendChild(toolCard);
    });
}

function getToolsForRole(role) {
    const allTools = {
        'Bug Hunter': [
            { name: 'Asset Discovery', description: 'Discover target assets', category: 'Recon' },
            { name: 'Vulnerability Scanner', description: 'Scan for vulnerabilities', category: 'Scanning' },
            { name: 'Report Generator', description: 'Generate bug reports', category: 'Reporting' }
        ]
    };

    return allTools[role] || allTools['Bug Hunter'];
}

function handleToolClick(tool) {
    if (confirm(`Open ${tool.name}?\n\nOK = Built-in tools page\nCancel = Ask AI for help`)) {
        window.open('/tools-built-in.html', '_blank');
    } else {
        document.querySelector('.nav-item[data-view="chat"]').click();
        document.getElementById('chat-input').value = `I want to use the ${tool.name} tool. Can you help me with it?`;
    }
}

// Knowledge base
async function loadKnowledge() {
    const container = document.getElementById('knowledge-container');
    container.innerHTML = '<div class="loading">Loading knowledge base...</div>';

    try {
        const response = await fetch(`${API_URL}/api/knowledge?limit=50`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();

        if (data.success) {
            displayKnowledge(data.data);
        } else {
            container.innerHTML = '<p>Failed to load knowledge base.</p>';
        }
    } catch (error) {
        container.innerHTML = '<p>Error loading knowledge base.</p>';
    }
}

async function searchKnowledge(query) {
    const container = document.getElementById('knowledge-container');

    if (!query) {
        loadKnowledge();
        return;
    }

    container.innerHTML = '<div class="loading">Searching...</div>';

    try {
        const response = await fetch(`${API_URL}/api/knowledge/search?q=${encodeURIComponent(query)}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();

        if (data.success) {
            displayKnowledge(data.data);
        }
    } catch (error) {
        console.error('Search error:', error);
    }
}

function displayKnowledge(items) {
    const container = document.getElementById('knowledge-container');

    if (items.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">No knowledge entries found.</p>';
        return;
    }

    container.innerHTML = '';

    items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'knowledge-item';
        itemDiv.innerHTML = `
            <h3>${escapeHtml(item.question)}</h3>
            <p>${escapeHtml(item.answer.substring(0, 200))}${item.answer.length > 200 ? '...' : ''}</p>
            <div class="knowledge-meta">
                <span>Category: ${item.category}</span>
                <span>${new Date(item.created_at).toLocaleDateString()}</span>
            </div>
        `;
        container.appendChild(itemDiv);
    });
}

// History
async function loadHistory() {
    const container = document.getElementById('history-container');
    container.innerHTML = '<div class="loading">Loading history...</div>';

    try {
        const response = await fetch(`${API_URL}/api/tools/history?limit=50`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();

        if (data.success) {
            displayHistory(data.data);
        } else {
            container.innerHTML = '<p>Failed to load history.</p>';
        }
    } catch (error) {
        container.innerHTML = '<p>Error loading history.</p>';
    }
}

function displayHistory(items) {
    const container = document.getElementById('history-container');

    if (items.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">No tool usage history found.</p>';
        return;
    }

    container.innerHTML = '';

    items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'history-item';
        itemDiv.innerHTML = `
            <h3>${item.tool_name}</h3>
            <p>Category: ${item.tool_category}</p>
            <div class="history-meta">
                <span>${item.success ? '✓ Success' : '✗ Failed'}</span>
                <span>${new Date(item.timestamp).toLocaleString()}</span>
            </div>
        `;
        container.appendChild(itemDiv);
    });
}
