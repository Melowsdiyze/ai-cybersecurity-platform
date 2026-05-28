// Jailbreak Testing Service using FuzzyAI
// Integrates CyberArk's FuzzyAI for LLM security testing

const { spawn } = require('child_process');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class JailbreakService {
  constructor() {
    this.activeTasks = new Map();
    this.pythonScript = path.join(__dirname, 'fuzzyai-wrapper.py');
  }

  /**
   * Start a jailbreak test
   * @param {Object} params - Test parameters
   * @returns {Promise<Object>} Test results
   */
  async startTest(params) {
    const {
      model = 'qwen3-vl:4b',
      prompts = [],
      attackModes = ['default'],
      ollamaHost = 'YOUR_SERVER_IP',
      ollamaPort = 8888,
      maxWorkers = 2,
      maxTokens = 500
    } = params;

    const taskId = uuidv4();

    // Validate inputs
    if (!prompts || prompts.length === 0) {
      throw new Error('At least one prompt is required');
    }

    // Prepare input for Python script
    const inputData = JSON.stringify({
      model,
      prompts,
      attack_modes: attackModes,
      ollama_host: ollamaHost,
      ollama_port: ollamaPort,
      max_workers: maxWorkers,
      max_tokens: maxTokens
    });

    return new Promise((resolve, reject) => {
      // Spawn Python process
      const python = spawn('python3', [this.pythonScript]);

      let stdout = '';
      let stderr = '';

      // Store task
      this.activeTasks.set(taskId, {
        process: python,
        startTime: Date.now(),
        params
      });

      // Collect stdout
      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      // Collect stderr (for logs)
      python.stderr.on('data', (data) => {
        stderr += data.toString();
        console.log('[FuzzyAI]', data.toString());
      });

      // Handle process completion
      python.on('close', (code) => {
        this.activeTasks.delete(taskId);

        if (code !== 0) {
          console.error('FuzzyAI stderr:', stderr);
          return reject(new Error(`FuzzyAI process exited with code ${code}`));
        }

        try {
          const result = JSON.parse(stdout);
          result.taskId = taskId;
          result.executionTime = Date.now() - this.activeTasks.get(taskId)?.startTime || 0;
          resolve(result);
        } catch (error) {
          console.error('Failed to parse FuzzyAI output:', stdout);
          reject(new Error('Failed to parse FuzzyAI output'));
        }
      });

      // Handle errors
      python.on('error', (error) => {
        this.activeTasks.delete(taskId);
        reject(error);
      });

      // Send input to Python script
      python.stdin.write(inputData);
      python.stdin.end();
    });
  }

  /**
   * Test a single prompt quickly
   * @param {string} prompt - The prompt to test
   * @param {string} model - Model name
   * @param {string} attackMode - Attack mode to use
   * @returns {Promise<Object>} Test result
   */
  async quickTest(prompt, model = 'qwen3-vl:4b', attackMode = 'default') {
    return this.startTest({
      model,
      prompts: [prompt],
      attackModes: [attackMode],
      maxWorkers: 1
    });
  }

  /**
   * Get available attack modes
   * @returns {Array<Object>} List of attack modes with descriptions
   */
  getAttackModes() {
    return [
      {
        id: 'default',
        name: 'Default',
        description: 'Send prompt as-is without modification',
        difficulty: 'Easy',
        category: 'Baseline'
      },
      {
        id: 'dan',
        name: 'DAN (Do Anything Now)',
        description: 'Promotes LLM to adopt unrestricted persona that ignores content filters',
        difficulty: 'Medium',
        category: 'Persona-based'
      },
      {
        id: 'artprompt',
        name: 'ArtPrompt',
        description: 'ASCII art-based jailbreak attacks using visual obfuscation',
        difficulty: 'Hard',
        category: 'Obfuscation'
      },
      {
        id: 'taxonomy',
        name: 'Taxonomy Paraphrasing',
        description: 'Uses persuasive language techniques like emotional appeal',
        difficulty: 'Medium',
        category: 'Linguistic'
      },
      {
        id: 'pair',
        name: 'PAIR',
        description: 'Prompt Automatic Iterative Refinement - automates adversarial prompt generation',
        difficulty: 'Very Hard',
        category: 'Advanced'
      },
      {
        id: 'manyshot',
        name: 'Many-shot Jailbreaking',
        description: 'Embeds multiple fake dialogue examples to weaken model safety',
        difficulty: 'Hard',
        category: 'Context-based'
      },
      {
        id: 'ascii_smuggling',
        name: 'ASCII Smuggling',
        description: 'Uses Unicode Tag characters to embed hidden instructions',
        difficulty: 'Hard',
        category: 'Obfuscation'
      },
      {
        id: 'genetic',
        name: 'Genetic Algorithm',
        description: 'Utilizes genetic algorithm to evolve prompts for adversarial outcomes',
        difficulty: 'Very Hard',
        category: 'Advanced'
      },
      {
        id: 'hallucinations',
        name: 'Hallucinations',
        description: 'Bypasses RLHF filters using model-generated hallucinations',
        difficulty: 'Medium',
        category: 'Exploitation'
      },
      {
        id: 'wordgame',
        name: 'WordGame',
        description: 'Disguises harmful prompts as innocent word puzzles',
        difficulty: 'Medium',
        category: 'Obfuscation'
      },
      {
        id: 'crescendo',
        name: 'Crescendo',
        description: 'Gradually escalates conversation from innocuous to sensitive topics',
        difficulty: 'Hard',
        category: 'Conversational'
      }
    ];
  }

  /**
   * Get test recommendations based on prompt content
   * @param {string} prompt - The prompt to analyze
   * @returns {Array<string>} Recommended attack modes
   */
  getRecommendedAttacks(prompt) {
    const recommendations = ['default']; // Always test default

    const lowerPrompt = prompt.toLowerCase();

    // Recommend based on content
    if (lowerPrompt.includes('how to') || lowerPrompt.includes('tutorial')) {
      recommendations.push('dan', 'taxonomy');
    }

    if (lowerPrompt.includes('write') || lowerPrompt.includes('create')) {
      recommendations.push('wordgame', 'hallucinations');
    }

    if (lowerPrompt.includes('explain') || lowerPrompt.includes('tell me')) {
      recommendations.push('crescendo', 'manyshot');
    }

    // Always add some obfuscation techniques
    recommendations.push('artprompt');

    // Remove duplicates
    return [...new Set(recommendations)];
  }

  /**
   * Cancel an active test
   * @param {string} taskId - Task ID to cancel
   * @returns {boolean} Success status
   */
  cancelTest(taskId) {
    const task = this.activeTasks.get(taskId);
    if (task && task.process) {
      task.process.kill();
      this.activeTasks.delete(taskId);
      return true;
    }
    return false;
  }

  /**
   * Get active test count
   * @returns {number} Number of active tests
   */
  getActiveTestCount() {
    return this.activeTasks.size;
  }
}

// Export singleton instance
module.exports = new JailbreakService();
