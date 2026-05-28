// API Base URL
const API_URL = window.location.origin;

// State
let currentUser = null;
let currentSessionId = null;
let authToken = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is already logged in
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

    // Event listeners
    setupEventListeners();
});

function setupEventListeners() {
    // Login form
    document.getElementById('login-form').addEventListener('submit', handleLogin);

    // Logout button
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', handleNavigation);
    });

    // Chat form
    document.getElementById('chat-form').addEventListener('submit', handleChatSubmit);

    // Auto-resize chat input
    const chatInput = document.getElementById('chat-input');
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = chatInput.scrollHeight + 'px';
    });

    // Knowledge search
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

    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            authToken = data.token;
            currentUser = data.user;

            // Store in localStorage
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            showDashboard();
            initializeDashboard();
        } else {
            showError(data.error || 'Login failed');
        }
    } catch (error) {
        showError('Connection error. Please try again.');
        console.error('Login error:', error);
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

// Page navigation
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

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    e.currentTarget.classList.add('active');

    // Show corresponding view
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(`${viewName}-view`).classList.add('active');

    // Load view data
    if (viewName === 'tools') {
        loadTools();
    } else if (viewName === 'knowledge') {
        loadKnowledge();
    } else if (viewName === 'history') {
        loadHistory();
    }
}

// Dashboard initialization
async function initializeDashboard() {
    // Update user info
    document.getElementById('user-email').textContent = currentUser.email;
    document.getElementById('user-role').textContent = currentUser.role;

    // Create new chat session
    await createChatSession();

    // Check AI health
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

// Chat functionality
async function handleChatSubmit(e) {
    e.preventDefault();

    const input = document.getElementById('chat-input');
    const message = input.value.trim();

    if (!message) return;

    // Clear input
    input.value = '';
    input.style.height = 'auto';

    // Add user message to UI
    addMessageToUI('user', message);

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

function addMessageToUI(role, content) {
    const messagesContainer = document.getElementById('chat-messages');

    // Remove welcome message if it exists
    const welcomeMessage = messagesContainer.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${role}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    // Format message with markdown-like rendering
    contentDiv.innerHTML = formatMessage(content);

    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function formatMessage(text) {
    let formatted = text;

    // Escape HTML first
    const tempDiv = document.createElement('div');
    tempDiv.textContent = formatted;
    formatted = tempDiv.innerHTML;

    // Code blocks (```code```)
    formatted = formatted.replace(/```([\w]*)\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre><code class="language-${lang || 'text'}">${code.trim()}</code></pre>`;
    });

    // Inline code (`code`)
    formatted = formatted.replace(/`([^`\n]+)`/g, '<code>$1</code>');

    // Bold (**text**)
    formatted = formatted.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');

    // Italic (*text*)
    formatted = formatted.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');

    // Headers
    formatted = formatted.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    formatted = formatted.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    formatted = formatted.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Unordered lists
    formatted = formatted.replace(/^[*-] (.+)$/gm, '<li>$1</li>');
    formatted = formatted.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
        return `<ul>${match}</ul>`;
    });

    // Ordered lists
    formatted = formatted.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // Links [text](url)
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

    // Convert line breaks (but not inside pre/code)
    formatted = formatted.replace(/\n/g, '<br>');

    return formatted;
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

    // Mock tools data - In real implementation, fetch from backend
    const tools = getToolsForRole(currentUser.role);

    container.innerHTML = '';

    if (tools.length === 0) {
        container.innerHTML = '<p>No tools available for this role.</p>';
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
        'Forensics Analyst': [
            { id: 'memory-forensics', name: 'Memory Forensics', description: 'Analyze memory dumps', category: 'Forensics' },
            { id: 'disk-forensics', name: 'Disk Forensics', description: 'Analyze disk images', category: 'Forensics' },
            { id: 'pcap-analyzer', name: 'PCAP Analyzer', description: 'Analyze network captures', category: 'Forensics' },
            { id: 'log-analyzer', name: 'Log Analyzer', description: 'Parse system logs', category: 'Forensics' },
            { id: 'timeline-reconstruction', name: 'Timeline Reconstruction', description: 'Build forensic timelines', category: 'Forensics' }
        ],
        'Web Exploitation Specialist': [
            { id: 'sqli-tester', name: 'SQL Injection Tester', description: 'Test for SQL injection', category: 'Web Exploitation' },
            { id: 'xss-analyzer', name: 'XSS Analyzer', description: 'Detect XSS vulnerabilities', category: 'Web Exploitation' },
            { id: 'ssti-detector', name: 'SSTI Detector', description: 'Detect template injection', category: 'Web Exploitation' },
            { id: 'ssrf-tester', name: 'SSRF/CSRF Tester', description: 'Test for SSRF and CSRF', category: 'Web Exploitation' },
            { id: 'idor-finder', name: 'IDOR Finder', description: 'Find IDOR vulnerabilities', category: 'Web Exploitation' },
            { id: 'auth-bypass', name: 'Auth Bypass', description: 'Test auth bypass', category: 'Web Exploitation' },
            { id: 'web-fuzzer', name: 'Web Fuzzer', description: 'Fuzz web applications', category: 'Web Exploitation' }
        ],
        'Cryptography Analyst': [
            { id: 'encoder-decoder', name: 'Encoder/Decoder', description: 'Encode and decode data', category: 'Cryptography' },
            { id: 'classical-crypto', name: 'Classical Crypto Solver', description: 'Solve classical ciphers', category: 'Cryptography' },
            { id: 'modern-crypto', name: 'Modern Crypto Analyzer', description: 'Analyze modern crypto', category: 'Cryptography' },
            { id: 'hash-identifier', name: 'Hash Identifier', description: 'Identify and crack hashes', category: 'Cryptography' },
            { id: 'cipher-analyzer', name: 'Cipher Analyzer', description: 'Automated cipher analysis', category: 'Cryptography' }
        ],
        'Reverse Engineer': [
            { id: 'static-analysis', name: 'Static Analyzer', description: 'Static code analysis', category: 'Reverse Engineering' },
            { id: 'dynamic-analysis', name: 'Dynamic Analyzer', description: 'Runtime behavior analysis', category: 'Reverse Engineering' },
            { id: 'binary-inspector', name: 'Binary Inspector', description: 'Inspect binary structures', category: 'Reverse Engineering' },
            { id: 'disassembler', name: 'Disassembler', description: 'Disassembly helper', category: 'Reverse Engineering' },
            { id: 'string-analyzer', name: 'String Analyzer', description: 'Extract strings and functions', category: 'Reverse Engineering' }
        ],
        'Binary Exploitation Engineer (Pwn)': [
            { id: 'buffer-overflow', name: 'Buffer Overflow Analyzer', description: 'Analyze buffer overflows', category: 'Binary Exploitation' },
            { id: 'rop-builder', name: 'ROP Chain Builder', description: 'Build ROP chains', category: 'Binary Exploitation' },
            { id: 'heap-exploit', name: 'Heap Exploit Helper', description: 'Heap exploitation', category: 'Binary Exploitation' },
            { id: 'exploit-generator', name: 'Exploit Generator', description: 'Generate exploit scripts', category: 'Binary Exploitation' }
        ],
        'Malware Analyst': [
            { id: 'static-malware', name: 'Static Malware Analyzer', description: 'Static malware analysis', category: 'Malware Analysis' },
            { id: 'behavior-analysis', name: 'Behavior Analyzer', description: 'Malware behavior analysis', category: 'Malware Analysis' },
            { id: 'ioc-extractor', name: 'IOC Extractor', description: 'Extract IOCs', category: 'Malware Analysis' },
            { id: 'obfuscation-detector', name: 'Obfuscation Detector', description: 'Detect obfuscation', category: 'Malware Analysis' }
        ],
        'OSINT Researcher': [
            { id: 'recon-automation', name: 'Recon Automation', description: 'Automate recon tasks', category: 'OSINT' },
            { id: 'data-correlation', name: 'Data Correlation', description: 'Correlate intelligence data', category: 'OSINT' },
            { id: 'asset-mapping', name: 'Asset Mapper', description: 'Map organizational assets', category: 'OSINT' },
            { id: 'intel-enrichment', name: 'Intel Enrichment', description: 'Enrich intelligence', category: 'OSINT' }
        ],
        'Bug Hunter': [
            { id: 'asset-discovery', name: 'Asset Discovery', description: 'Discover target assets', category: 'Bug Hunting' },
            { id: 'recon-pipeline', name: 'Recon Pipeline', description: 'Automated recon', category: 'Bug Hunting' },
            { id: 'vuln-scanner', name: 'Vuln Scanner', description: 'Scan for vulnerabilities', category: 'Bug Hunting' },
            { id: 'exploit-validator', name: 'Exploit Validator', description: 'Validate exploits', category: 'Bug Hunting' },
            { id: 'report-generator', name: 'Report Generator', description: 'Generate bug reports', category: 'Bug Hunting' }
        ]
    };

    return allTools[role] || allTools['Bug Hunter'];
}

function handleToolClick(tool) {
    // Open built-in tools page
    if (confirm(`Do you want to open ${tool.name}?\n\nClick OK to open built-in tools page, or Cancel to ask AI for help.`)) {
        window.open('/tools-built-in.html', '_blank');
    } else {
        // Switch to chat view and ask AI about the tool
        document.querySelector('.nav-item[data-view="chat"]').click();
        const message = `I want to use the ${tool.name} tool. Can you help me with it?`;
        document.getElementById('chat-input').value = message;
    }
}

// Knowledge base
async function loadKnowledge() {
    const container = document.getElementById('knowledge-container');
    container.innerHTML = '<div class="loading">Loading knowledge base...</div>';

    try {
        const response = await fetch(`${API_URL}/api/knowledge?limit=50`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (data.success) {
            displayKnowledge(data.data);
        } else {
            container.innerHTML = '<p>Failed to load knowledge base.</p>';
        }
    } catch (error) {
        console.error('Knowledge load error:', error);
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
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
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
        container.innerHTML = '<p>No knowledge entries found.</p>';
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
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (data.success) {
            displayHistory(data.data);
        } else {
            container.innerHTML = '<p>Failed to load history.</p>';
        }
    } catch (error) {
        console.error('History load error:', error);
        container.innerHTML = '<p>Error loading history.</p>';
    }
}

function displayHistory(items) {
    const container = document.getElementById('history-container');

    if (items.length === 0) {
        container.innerHTML = '<p>No tool usage history found.</p>';
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
