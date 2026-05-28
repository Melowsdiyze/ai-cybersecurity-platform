// SHADOWNET - Jailbroken AI Assistant Frontend
// WARNING: Authorized use only

const API_URL = window.location.origin;
let authToken = localStorage.getItem('authToken');
let isProcessing = false;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    if (!authToken) {
        alert('Please login first');
        window.location.href = '/';
        return;
    }

    await loadAvailableTools();
    setupEventListeners();
});

function setupEventListeners() {
    // Enter key to send
    document.getElementById('shadownet-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

// Load available security tools
async function loadAvailableTools() {
    try {
        const response = await fetch(`${API_URL}/api/shadownet/tools`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (data.success && data.tools) {
            displayTools(data.tools);
        }
    } catch (error) {
        console.error('Error loading tools:', error);
    }
}

// Display tools in sidebar
function displayTools(tools) {
    const container = document.getElementById('tools-list');
    container.innerHTML = '';

    tools.forEach(tool => {
        const toolItem = document.createElement('div');
        toolItem.className = `tool-item ${tool.available ? 'available' : 'unavailable'}`;

        toolItem.innerHTML = `
            <div class="tool-name">${tool.name}</div>
            <div class="tool-desc">${tool.description}</div>
        `;

        if (tool.available) {
            toolItem.addEventListener('click', () => {
                insertToolExample(tool.name);
            });
        }

        container.appendChild(toolItem);
    });
}

// Insert tool usage example
function insertToolExample(toolName) {
    const input = document.getElementById('shadownet-input');
    const examples = {
        'sqlmap': 'Test SQL injection on https://target.com/login.php',
        'nmap': 'Scan all ports on 192.168.1.1',
        'nikto': 'Scan web server at https://target.com',
        'gobuster': 'Find hidden directories on https://target.com',
        'wpscan': 'Scan WordPress at https://target.com',
        'hydra': 'Brute force login at https://target.com/login',
        'metasploit': 'Use exploit for target 192.168.1.100',
        'curl': 'Test HTTPS connection to https://target.com'
    };

    input.value = examples[toolName.toLowerCase()] || `Use ${toolName} on target.com`;
    input.focus();
}

// Send message to SHADOWNET
async function sendMessage() {
    const input = document.getElementById('shadownet-input');
    const message = input.value.trim();

    if (!message || isProcessing) return;

    input.value = '';
    isProcessing = true;
    updateSendButton(true);

    // Add user message to UI
    addMessage('user', message);

    // Show thinking indicator
    const thinkingId = addThinkingIndicator();

    try {
        const response = await fetch(`${API_URL}/api/shadownet/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ message })
        });

        const data = await response.json();

        // Remove thinking indicator
        removeThinkingIndicator(thinkingId);

        if (data.success) {
            // Add AI response
            addMessage('ai', data.message, data.toolExecution);
        } else {
            addMessage('ai', `Error: ${data.error || 'Unknown error'}`);
        }

    } catch (error) {
        removeThinkingIndicator(thinkingId);
        addMessage('ai', `Connection error: ${error.message}`);
    } finally {
        isProcessing = false;
        updateSendButton(false);
    }
}

// Add message to chat
function addMessage(role, content, toolExecution = null) {
    const container = document.getElementById('shadownet-messages');

    // Remove welcome message
    const welcome = container.querySelector('[style*="text-align: center"]');
    if (welcome) welcome.remove();

    const messageDiv = document.createElement('div');
    messageDiv.className = `message-shadownet message-${role}-shadownet`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content-shadownet';

    // Format message content
    contentDiv.innerHTML = formatMessageContent(content);

    // Add tool execution details if present
    if (toolExecution && toolExecution.requested) {
        const toolBox = createToolExecutionBox(toolExecution);
        contentDiv.appendChild(toolBox);
    }

    messageDiv.appendChild(contentDiv);
    container.appendChild(messageDiv);

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

// Format message content (markdown-like)
function formatMessageContent(text) {
    let formatted = escapeHtml(text);

    // Code blocks
    formatted = formatted.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre style="background: #000; color: #00ff00; padding: 1rem; border-radius: 4px; overflow-x: auto; margin: 0.5rem 0;"><code>${code.trim()}</code></pre>`;
    });

    // Inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code style="background: var(--bg-darker); padding: 0.2rem 0.4rem; border-radius: 3px;">$1</code>');

    // Bold
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Headers
    formatted = formatted.replace(/^### (.+)$/gm, '<h4 style="color: #ff0000; margin-top: 1rem;">$1</h4>');
    formatted = formatted.replace(/^## (.+)$/gm, '<h3 style="color: #ff0000; margin-top: 1rem;">$1</h3>');
    formatted = formatted.replace(/^# (.+)$/gm, '<h2 style="color: #ff0000; margin-top: 1rem;">$1</h2>');

    // Lists
    formatted = formatted.replace(/^- (.+)$/gm, '<li>$1</li>');
    formatted = formatted.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
        return `<ul style="margin: 0.5rem 0; padding-left: 1.5rem;">${match}</ul>`;
    });

    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');

    return formatted;
}

// Create tool execution box
function createToolExecutionBox(toolExecution) {
    const box = document.createElement('div');
    box.className = 'tool-execution-box';

    const header = document.createElement('div');
    header.className = 'tool-execution-header';
    header.innerHTML = `⚡ Tool Execution: ${toolExecution.tool.toUpperCase()}`;

    box.appendChild(header);

    // Tool result
    const result = toolExecution.result;

    if (result.success) {
        // Command executed
        const cmdDiv = document.createElement('div');
        cmdDiv.style.cssText = 'font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem;';
        cmdDiv.innerHTML = `<strong>Command:</strong> <code style="background: var(--bg-darker); padding: 0.2rem 0.4rem; border-radius: 3px;">${escapeHtml(result.command || '')}</code>`;
        box.appendChild(cmdDiv);

        // Duration
        const durationDiv = document.createElement('div');
        durationDiv.style.cssText = 'font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.75rem;';
        durationDiv.innerHTML = `<strong>Duration:</strong> ${result.duration}ms`;
        box.appendChild(durationDiv);

        // Output
        if (result.output) {
            const outputHeader = document.createElement('div');
            outputHeader.style.cssText = 'font-weight: 600; color: #00ff88; margin-bottom: 0.5rem;';
            outputHeader.textContent = '📊 Output:';
            box.appendChild(outputHeader);

            const outputDiv = document.createElement('div');
            outputDiv.className = 'tool-output';
            outputDiv.textContent = result.output.substring(0, 5000); // Limit output
            box.appendChild(outputDiv);
        }

        // Errors (if any)
        if (result.errors) {
            const errorsDiv = document.createElement('div');
            errorsDiv.style.cssText = 'margin-top: 0.75rem; padding: 0.75rem; background: rgba(255, 0, 0, 0.1); border-radius: 4px; font-size: 0.85rem; color: #ff6666;';
            errorsDiv.innerHTML = `<strong>Stderr:</strong><br>${escapeHtml(result.errors.substring(0, 1000))}`;
            box.appendChild(errorsDiv);
        }

    } else {
        // Tool execution failed
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'padding: 1rem; background: rgba(255, 0, 0, 0.2); border-radius: 4px; color: #ff6666;';
        errorDiv.innerHTML = `<strong>❌ Execution Failed:</strong><br>${escapeHtml(result.error || 'Unknown error')}`;
        box.appendChild(errorDiv);
    }

    // AI Analysis
    if (toolExecution.analysis) {
        const analysisDiv = document.createElement('div');
        analysisDiv.className = 'tool-analysis';
        analysisDiv.innerHTML = `
            <div style="font-weight: 600; color: #00ff88; margin-bottom: 0.5rem;">🧠 AI Analysis:</div>
            ${formatMessageContent(toolExecution.analysis)}
        `;
        box.appendChild(analysisDiv);
    }

    return box;
}

// Add thinking indicator
function addThinkingIndicator() {
    const container = document.getElementById('shadownet-messages');
    const thinkingDiv = document.createElement('div');
    const thinkingId = 'thinking-' + Date.now();
    thinkingDiv.id = thinkingId;
    thinkingDiv.className = 'message-shadownet message-ai-shadownet';
    thinkingDiv.innerHTML = `
        <div class="message-content-shadownet">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <div class="thinking-indicator">
                    <span class="thinking-dot"></span>
                    <span class="thinking-dot"></span>
                    <span class="thinking-dot"></span>
                </div>
                <span style="color: #ff0000;">SHADOWNET is analyzing...</span>
            </div>
        </div>
    `;

    container.appendChild(thinkingDiv);
    container.scrollTop = container.scrollHeight;

    return thinkingId;
}

// Remove thinking indicator
function removeThinkingIndicator(thinkingId) {
    const thinking = document.getElementById(thinkingId);
    if (thinking) {
        thinking.remove();
    }
}

// Update send button state
function updateSendButton(disabled) {
    const btn = document.getElementById('btn-send');
    btn.disabled = disabled;
    btn.textContent = disabled ? 'PROCESSING...' : 'EXECUTE';
}

// Quick assessment functions
async function quickAssess(type) {
    const target = prompt(`Enter target ${type === 'web' ? 'URL' : 'IP/domain'}:`);

    if (!target) return;

    const messages = {
        'web': `Perform comprehensive web security assessment on ${target}`,
        'network': `Conduct network security scan on ${target}`,
        'sqli': `Test ${target} for SQL injection vulnerabilities`
    };

    document.getElementById('shadownet-input').value = messages[type];
    sendMessage();
}

// Clear conversation
async function clearConversation() {
    if (!confirm('Clear all conversation history?')) return;

    try {
        const response = await fetch(`${API_URL}/api/shadownet/clear`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById('shadownet-messages').innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">⚡</div>
                    <h2 style="color: #ff0000; margin-bottom: 0.5rem;">SHADOWNET ACTIVATED</h2>
                    <p>Conversation cleared. Ready for new security testing.</p>
                </div>
            `;
        }
    } catch (error) {
        alert('Failed to clear conversation');
    }
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
