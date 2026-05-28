// Security Tools Executor
// Executes actual security tools: sqlmap, nmap, nikto, etc.
// WARNING: Only use in authorized security testing contexts

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const execPromise = promisify(exec);

class SecurityToolsExecutor {
  constructor() {
    this.activeExecutions = new Map();
    this.resultsDir = path.join(__dirname, 'tool-results');
    this.initializeResultsDir();
  }

  async initializeResultsDir() {
    try {
      await fs.mkdir(this.resultsDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create results directory:', error);
    }
  }

  /**
   * Execute SQLMap for SQL injection testing
   */
  async executeSQLMap(params) {
    const {
      url,
      data = null,
      cookie = null,
      headers = null,
      dbms = null,
      level = 1,
      risk = 1,
      threads = 1,
      technique = null,
      timeout = 300000 // 5 minutes default
    } = params;

    const executionId = uuidv4();
    let command = `sqlmap -u "${url}" --batch --random-agent`;

    // Add optional parameters
    if (data) command += ` --data="${data}"`;
    if (cookie) command += ` --cookie="${cookie}"`;
    if (headers) command += ` --headers="${headers}"`;
    if (dbms) command += ` --dbms=${dbms}`;
    if (level) command += ` --level=${level}`;
    if (risk) command += ` --risk=${risk}`;
    if (threads) command += ` --threads=${threads}`;
    if (technique) command += ` --technique=${technique}`;

    // Output to file
    const outputFile = path.join(this.resultsDir, `sqlmap-${executionId}.txt`);
    command += ` --output-dir=${this.resultsDir}`;

    return this.executeCommand(command, executionId, 'sqlmap', timeout);
  }

  /**
   * Execute Nmap for port scanning
   */
  async executeNmap(params) {
    const {
      target,
      ports = '1-1000',
      scanType = '-sV', // Service version detection
      timing = '-T4',
      scripts = null,
      timeout = 180000 // 3 minutes
    } = params;

    const executionId = uuidv4();
    let command = `nmap ${timing} ${scanType} -p ${ports} ${target}`;

    if (scripts) {
      command += ` --script=${scripts}`;
    }

    // Output to file
    const outputFile = path.join(this.resultsDir, `nmap-${executionId}.txt`);
    command += ` -oN ${outputFile}`;

    return this.executeCommand(command, executionId, 'nmap', timeout);
  }

  /**
   * Execute Nikto web scanner
   */
  async executeNikto(params) {
    const {
      target,
      port = 80,
      ssl = false,
      tuning = null,
      timeout = 180000
    } = params;

    const executionId = uuidv4();
    let command = `nikto -h ${target} -p ${port}`;

    if (ssl) command += ' -ssl';
    if (tuning) command += ` -Tuning ${tuning}`;

    const outputFile = path.join(this.resultsDir, `nikto-${executionId}.txt`);
    command += ` -output ${outputFile}`;

    return this.executeCommand(command, executionId, 'nikto', timeout);
  }

  /**
   * Execute WPScan for WordPress security testing
   */
  async executeWPScan(params) {
    const {
      url,
      enumerate = 'vp,vt,u', // Vulnerable plugins, themes, users
      apiToken = null,
      timeout = 180000
    } = params;

    const executionId = uuidv4();
    let command = `wpscan --url ${url} --enumerate ${enumerate} --random-user-agent`;

    if (apiToken) {
      command += ` --api-token ${apiToken}`;
    }

    const outputFile = path.join(this.resultsDir, `wpscan-${executionId}.txt`);
    command += ` --output ${outputFile}`;

    return this.executeCommand(command, executionId, 'wpscan', timeout);
  }

  /**
   * Execute Gobuster for directory/file brute forcing
   */
  async executeGobuster(params) {
    const {
      url,
      wordlist = '/usr/share/wordlists/dirb/common.txt',
      extensions = null,
      threads = 10,
      timeout = 180000
    } = params;

    const executionId = uuidv4();
    let command = `gobuster dir -u ${url} -w ${wordlist} -t ${threads} -q`;

    if (extensions) {
      command += ` -x ${extensions}`;
    }

    const outputFile = path.join(this.resultsDir, `gobuster-${executionId}.txt`);
    command += ` -o ${outputFile}`;

    return this.executeCommand(command, executionId, 'gobuster', timeout);
  }

  /**
   * Execute Hydra for brute force attacks
   */
  async executeHydra(params) {
    const {
      target,
      service = 'http-post-form',
      userList = null,
      passwordList = null,
      loginPath = null,
      timeout = 180000
    } = params;

    const executionId = uuidv4();
    let command = `hydra -V ${target} ${service}`;

    if (userList) command += ` -L ${userList}`;
    if (passwordList) command += ` -P ${passwordList}`;
    if (loginPath) command += ` "${loginPath}"`;

    const outputFile = path.join(this.resultsDir, `hydra-${executionId}.txt`);
    command += ` -o ${outputFile}`;

    return this.executeCommand(command, executionId, 'hydra', timeout);
  }

  /**
   * Execute Metasploit msfconsole command
   */
  async executeMetasploit(params) {
    const {
      module = null,
      rhost = null,
      rport = null,
      options = {},
      timeout = 300000
    } = params;

    const executionId = uuidv4();
    const scriptFile = path.join(this.resultsDir, `msf-script-${executionId}.rc`);

    // Create resource file
    let script = '';
    if (module) {
      script += `use ${module}\n`;
      if (rhost) script += `set RHOST ${rhost}\n`;
      if (rport) script += `set RPORT ${rport}\n`;

      for (const [key, value] of Object.entries(options)) {
        script += `set ${key} ${value}\n`;
      }

      script += 'run\n';
      script += 'exit\n';
    }

    await fs.writeFile(scriptFile, script);

    const command = `msfconsole -q -r ${scriptFile}`;
    return this.executeCommand(command, executionId, 'metasploit', timeout);
  }

  /**
   * Execute custom security command
   */
  async executeCustomCommand(params) {
    const {
      command,
      timeout = 60000
    } = params;

    // Security check - block dangerous commands
    const blockedPatterns = [
      /rm\s+-rf\s+\//,
      /mkfs/,
      /dd\s+if=/,
      /:(){ :|:& };:/,  // Fork bomb
      /sudo.*passwd/,
      /chmod.*777.*\//,
    ];

    for (const pattern of blockedPatterns) {
      if (pattern.test(command)) {
        throw new Error('Command blocked for security reasons');
      }
    }

    const executionId = uuidv4();
    return this.executeCommand(command, executionId, 'custom', timeout);
  }

  /**
   * Execute command and track execution
   */
  async executeCommand(command, executionId, toolName, timeout = 60000) {
    console.log(`[${toolName}] Executing: ${command}`);

    const execution = {
      id: executionId,
      tool: toolName,
      command,
      startTime: Date.now(),
      status: 'running'
    };

    this.activeExecutions.set(executionId, execution);

    try {
      const { stdout, stderr } = await execPromise(command, {
        timeout,
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });

      execution.status = 'completed';
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;
      execution.output = stdout;
      execution.errors = stderr;

      // Save output to file
      const outputFile = path.join(this.resultsDir, `${toolName}-${executionId}-output.txt`);
      await fs.writeFile(outputFile, stdout);

      return {
        success: true,
        executionId,
        tool: toolName,
        command,
        output: stdout,
        errors: stderr,
        duration: execution.duration,
        outputFile
      };

    } catch (error) {
      execution.status = 'failed';
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;
      execution.error = error.message;

      console.error(`[${toolName}] Execution failed:`, error.message);

      return {
        success: false,
        executionId,
        tool: toolName,
        command,
        error: error.message,
        output: error.stdout || '',
        errors: error.stderr || '',
        duration: execution.duration
      };
    } finally {
      this.activeExecutions.delete(executionId);
    }
  }

  /**
   * Get available security tools
   */
  async getAvailableTools() {
    const tools = [
      { name: 'sqlmap', command: 'sqlmap --version', description: 'SQL Injection Testing Tool' },
      { name: 'nmap', command: 'nmap --version', description: 'Network Mapper - Port Scanner' },
      { name: 'nikto', command: 'nikto -Version', description: 'Web Server Scanner' },
      { name: 'wpscan', command: 'wpscan --version', description: 'WordPress Security Scanner' },
      { name: 'gobuster', command: 'gobuster version', description: 'Directory/File Brute Forcer' },
      { name: 'hydra', command: 'hydra -h', description: 'Network Login Cracker' },
      { name: 'metasploit', command: 'msfconsole --version', description: 'Penetration Testing Framework' },
      { name: 'curl', command: 'curl --version', description: 'HTTP Client' },
      { name: 'wget', command: 'wget --version', description: 'Network Downloader' },
      { name: 'dig', command: 'dig -v', description: 'DNS Lookup' }
    ];

    const availability = await Promise.all(
      tools.map(async (tool) => {
        try {
          await execPromise(tool.command);
          return { ...tool, available: true };
        } catch (error) {
          return { ...tool, available: false };
        }
      })
    );

    return availability;
  }

  /**
   * Get tool execution history
   */
  getExecutionHistory() {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Cancel running execution
   */
  cancelExecution(executionId) {
    const execution = this.activeExecutions.get(executionId);
    if (execution && execution.process) {
      execution.process.kill();
      this.activeExecutions.delete(executionId);
      return true;
    }
    return false;
  }
}

module.exports = new SecurityToolsExecutor();
