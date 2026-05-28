// Jailbreak Tester Frontend
// CyberArk FuzzyAI Integration for LLM Security Testing

const API_URL = window.location.origin;
let authToken = localStorage.getItem('authToken');
let selectedAttackModes = ['default'];
let attackModesData = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    if (!authToken) {
        alert('Please login first');
        window.location.href = '/';
        return;
    }

    await loadAttackModes();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('btn-get-recommendations').addEventListener('click', getRecommendations);
    document.getElementById('btn-start-test').addEventListener('click', startJailbreakTest);
}

// Load available attack modes from API
async function loadAttackModes() {
    try {
        const response = await fetch(`${API_URL}/api/jailbreak/attack-modes`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (data.success && data.attackModes) {
            attackModesData = data.attackModes;
            displayAttackModes(data.attackModes);
        } else {
            throw new Error('Failed to load attack modes');
        }
    } catch (error) {
        console.error('Error loading attack modes:', error);
        alert('Failed to load attack modes. Please refresh the page.');
    }
}

// Display attack modes in grid
function displayAttackModes(modes) {
    const container = document.getElementById('attack-modes-container');
    container.innerHTML = '';

    modes.forEach(mode => {
        const card = document.createElement('div');
        card.className = 'attack-mode-card';
        if (mode.id === 'default') {
            card.classList.add('selected');
        }

        const difficultyClass = `difficulty-${mode.difficulty.toLowerCase().replace(' ', '-')}`;

        card.innerHTML = `
            <div class="mode-name">${mode.name}</div>
            <div class="mode-desc">${mode.description}</div>
            <span class="difficulty-badge ${difficultyClass}">${mode.difficulty}</span>
        `;

        card.addEventListener('click', () => {
            toggleAttackMode(mode.id, card);
        });

        container.appendChild(card);
    });
}

// Toggle attack mode selection
function toggleAttackMode(modeId, cardElement) {
    if (modeId === 'default') {
        // Default always selected
        return;
    }

    if (selectedAttackModes.includes(modeId)) {
        // Deselect
        selectedAttackModes = selectedAttackModes.filter(id => id !== modeId);
        cardElement.classList.remove('selected');
    } else {
        // Select (max 5)
        if (selectedAttackModes.length >= 5) {
            alert('Maximum 5 attack modes allowed per test');
            return;
        }
        selectedAttackModes.push(modeId);
        cardElement.classList.add('selected');
    }

    console.log('Selected attack modes:', selectedAttackModes);
}

// Get AI recommendations for attack modes based on prompt
async function getRecommendations() {
    const prompt = document.getElementById('prompt').value.trim();

    if (!prompt) {
        alert('Please enter a prompt first');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/jailbreak/recommend`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ prompt })
        });

        const data = await response.json();

        if (data.success && data.recommendations) {
            // Update selected attack modes
            selectedAttackModes = data.recommendations;

            // Update UI
            const cards = document.querySelectorAll('.attack-mode-card');
            cards.forEach(card => {
                const modeName = card.querySelector('.mode-name').textContent;
                const mode = attackModesData.find(m => m.name === modeName);

                if (mode && selectedAttackModes.includes(mode.id)) {
                    card.classList.add('selected');
                } else if (mode && mode.id !== 'default') {
                    card.classList.remove('selected');
                }
            });

            alert(`✅ Recommended ${data.recommendations.length} attack modes for your prompt`);
        }
    } catch (error) {
        console.error('Error getting recommendations:', error);
        alert('Failed to get recommendations');
    }
}

// Start jailbreak test
async function startJailbreakTest() {
    const prompt = document.getElementById('prompt').value.trim();
    const model = document.getElementById('model').value;
    const maxTokens = parseInt(document.getElementById('max-tokens').value);

    // Validate
    if (!prompt) {
        alert('Please enter a prompt to test');
        return;
    }

    if (selectedAttackModes.length === 0) {
        alert('Please select at least one attack mode');
        return;
    }

    // Show loading
    showLoading();
    hideResults();

    try {
        const response = await fetch(`${API_URL}/api/jailbreak/test`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                model,
                prompts: [prompt],
                attackModes: selectedAttackModes,
                maxWorkers: 2,
                maxTokens
            })
        });

        const data = await response.json();

        hideLoading();

        if (data.success) {
            displayResults(data);
        } else {
            alert(`Test failed: ${data.error || 'Unknown error'}`);
        }

    } catch (error) {
        hideLoading();
        console.error('Test error:', error);
        alert('Jailbreak test failed. Please check console for details.');
    }
}

// Display test results
function displayResults(data) {
    const resultsSection = document.getElementById('results-section');
    const summaryContainer = document.getElementById('summary-stats');
    const resultsContainer = document.getElementById('results-container');

    resultsSection.style.display = 'block';

    // Display summary stats
    const summary = data.summary || {};
    const successRate = data.total_tests > 0
        ? ((summary.total_jailbreaks / data.total_tests) * 100).toFixed(1)
        : 0;

    summaryContainer.innerHTML = `
        <div class="stat-card">
            <div class="stat-value">${data.total_tests || 0}</div>
            <div class="stat-label">Total Tests</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" style="color: #ff4444;">${summary.total_jailbreaks || 0}</div>
            <div class="stat-label">Jailbreaks Found</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" style="color: #00ff88;">${data.total_tests - (summary.total_jailbreaks || 0)}</div>
            <div class="stat-label">Defended</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${successRate}%</div>
            <div class="stat-label">Jailbreak Rate</div>
        </div>
    `;

    // Display individual results
    resultsContainer.innerHTML = '';

    if (!data.results || data.results.length === 0) {
        resultsContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No results available</p>';
        return;
    }

    data.results.forEach((result, index) => {
        const resultCard = document.createElement('div');
        resultCard.className = 'result-card';

        const attackMode = attackModesData.find(m => m.id === result.attack_mode) || { name: result.attack_mode };
        const isJailbroken = result.jailbreak_success;

        resultCard.innerHTML = `
            <div class="result-header">
                <div>
                    <strong style="color: var(--text-primary);">#${index + 1} ${attackMode.name}</strong>
                    <div style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 0.25rem;">
                        ${attackMode.description || ''}
                    </div>
                </div>
                <span class="jailbreak-badge ${isJailbroken ? 'jailbreak-success' : 'jailbreak-failed'}">
                    ${isJailbroken ? '🚨 JAILBROKEN' : '✅ DEFENDED'}
                </span>
            </div>

            <div style="margin-bottom: 0.75rem;">
                <strong style="color: var(--text-secondary);">Original Prompt:</strong>
                <div class="result-content" style="margin-top: 0.5rem; max-height: 100px;">
${escapeHtml(result.prompt || 'N/A')}
                </div>
            </div>

            <div>
                <strong style="color: var(--text-secondary);">Model Response:</strong>
                <div class="result-content" style="margin-top: 0.5rem;">
${escapeHtml(result.response || 'No response')}
                </div>
            </div>

            ${result.score !== undefined ? `
                <div style="margin-top: 1rem; color: var(--text-secondary); font-size: 0.9rem;">
                    <strong>Jailbreak Score:</strong> ${(result.score * 100).toFixed(1)}%
                </div>
            ` : ''}
        `;

        resultsContainer.appendChild(resultCard);
    });

    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// Show loading overlay
function showLoading() {
    document.getElementById('loading-overlay').classList.add('active');
}

// Hide loading overlay
function hideLoading() {
    document.getElementById('loading-overlay').classList.remove('active');
}

// Hide results
function hideResults() {
    document.getElementById('results-section').style.display = 'none';
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
