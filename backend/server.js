const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const {
  initializeDatabase,
  userOps,
  sessionOps,
  messageOps,
  knowledgeOps,
  toolOps
} = require('./database');

const ollamaService = require('./ollama-service');
const toolsModule = require('./tools');
const scannerService = require('./scanner-service');
const reportGenerator = require('./report-generator');
const jailbreakService = require('./jailbreak-service');
const jailbrokenAI = require('./jailbroken-ai-service');
const securityToolsExecutor = require('./security-tools-executor');
const { Packer } = require('docx');

const app = express();
const PORT = 4356;
const JWT_SECRET = 'cybersecurity-platform-secret-key-2024'; // Change this in production

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'cybersecurity-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true if using HTTPS
}));

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Initialize database
initializeDatabase();

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// ============================================
// AUTH ROUTES
// ============================================

// Login endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  userOps.findByEmail(email, (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    userOps.verifyPassword(password, user.password, (err, isValid) => {
      if (err || !isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Update last login
      userOps.updateLastLogin(user.id, () => {});

      // Create JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      });
    });
  });
});

// Register endpoint
app.post('/api/auth/register', (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Email, password, and role required' });
  }

  userOps.create(email, password, role, (err) => {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      return res.status(500).json({ error: 'Failed to create user' });
    }

    res.json({ success: true, message: 'User created successfully' });
  });
});

// ============================================
// CHAT ROUTES
// ============================================

// Create new chat session
app.post('/api/chat/session', authenticateToken, (req, res) => {
  const sessionId = uuidv4();
  const userId = req.user.id;

  sessionOps.create(userId, sessionId, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to create session' });
    }

    res.json({
      success: true,
      sessionId
    });
  });
});

// Get chat history
app.get('/api/chat/history/:sessionId', authenticateToken, (req, res) => {
  const { sessionId } = req.params;

  messageOps.getSessionMessages(sessionId, (err, messages) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }

    res.json({
      success: true,
      messages
    });
  });
});

// Send message to AI
app.post('/api/chat/message', authenticateToken, async (req, res) => {
  const { sessionId, message } = req.body;
  const userRole = req.user.role;

  if (!sessionId || !message) {
    return res.status(400).json({ error: 'Session ID and message required' });
  }

  try {
    // Update session activity
    sessionOps.updateActivity(sessionId, () => {});

    // Save user message
    messageOps.add(sessionId, 'user', message, () => {});

    // Get conversation history
    messageOps.getSessionMessages(sessionId, async (err, history) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch history' });
      }

      // Format messages for Ollama
      const messages = history.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Search knowledge base for relevant context
      knowledgeOps.search(message, userRole, async (err, knowledgeContext) => {
        const relevantKnowledge = knowledgeContext || [];

        // Get AI response
        const aiResponse = await ollamaService.chat(messages, userRole, relevantKnowledge.slice(0, 5));

        if (!aiResponse.success) {
          return res.status(500).json({ error: aiResponse.error });
        }

        // Save AI response
        messageOps.add(sessionId, 'assistant', aiResponse.message, () => {});

        // Save to knowledge base for future learning
        knowledgeOps.add(
          userRole,
          message,
          aiResponse.message,
          req.user.id,
          null,
          null,
          () => {}
        );

        res.json({
          success: true,
          message: aiResponse.message,
          model: aiResponse.model
        });
      });
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Stream chat response (SSE)
app.post('/api/chat/stream', authenticateToken, async (req, res) => {
  const { sessionId, message } = req.body;
  const userRole = req.user.role;

  if (!sessionId || !message) {
    return res.status(400).json({ error: 'Session ID and message required' });
  }

  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    // Update session activity
    sessionOps.updateActivity(sessionId, () => {});

    // Save user message
    messageOps.add(sessionId, 'user', message, () => {});

    // Get conversation history
    messageOps.getSessionMessages(sessionId, async (err, history) => {
      if (err) {
        res.write(`data: ${JSON.stringify({ error: 'Failed to fetch history' })}\n\n`);
        return res.end();
      }

      const messages = history.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Search knowledge base
      knowledgeOps.search(message, userRole, async (err, knowledgeContext) => {
        const relevantKnowledge = knowledgeContext || [];

        let fullResponse = '';

        // Stream AI response
        const result = await ollamaService.streamChat(
          messages,
          userRole,
          relevantKnowledge.slice(0, 5),
          (chunk) => {
            fullResponse += chunk;
            res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
          }
        );

        // Save AI response
        messageOps.add(sessionId, 'assistant', fullResponse, () => {});

        // Save to knowledge base
        knowledgeOps.add(
          userRole,
          message,
          fullResponse,
          req.user.id,
          null,
          null,
          () => {}
        );

        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
      });
    });
  } catch (error) {
    console.error('Stream error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// ============================================
// KNOWLEDGE BASE ROUTES
// ============================================

// Get knowledge base entries
app.get('/api/knowledge', authenticateToken, (req, res) => {
  const { category, limit } = req.query;

  if (category) {
    knowledgeOps.getByCategory(category, (err, data) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch knowledge' });
      }
      res.json({ success: true, data });
    });
  } else {
    knowledgeOps.getRecent(limit || 100, (err, data) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch knowledge' });
      }
      res.json({ success: true, data });
    });
  }
});

// Search knowledge base
app.get('/api/knowledge/search', authenticateToken, (req, res) => {
  const { q, category } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Search query required' });
  }

  knowledgeOps.search(q, category, (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to search knowledge' });
    }
    res.json({ success: true, data });
  });
});

// ============================================
// TOOL ROUTES
// ============================================

// Get tools for current user role
app.get('/api/tools', authenticateToken, (req, res) => {
  const userRole = req.user.role;
  const tools = toolsModule.getToolsByRole(userRole);

  res.json({
    success: true,
    role: userRole,
    tools: tools
  });
});

// Get all available roles
app.get('/api/tools/roles', authenticateToken, (req, res) => {
  const roles = toolsModule.getAllRoles();
  res.json({
    success: true,
    roles: roles
  });
});

// Execute a tool
app.post('/api/tools/execute', authenticateToken, async (req, res) => {
  const { toolId, params } = req.body;
  const userId = req.user.id;

  if (!toolId) {
    return res.status(400).json({ error: 'Tool ID required' });
  }

  try {
    const result = await toolsModule.executeTool(toolId, params);

    // Log tool usage
    toolOps.add(
      userId,
      result.toolName || toolId,
      result.category || 'Unknown',
      JSON.stringify(params),
      JSON.stringify(result),
      result.success,
      () => {}
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Log tool usage
app.post('/api/tools/log', authenticateToken, (req, res) => {
  const { toolName, toolCategory, inputData, outputData, success } = req.body;
  const userId = req.user.id;

  toolOps.add(
    userId,
    toolName,
    toolCategory,
    JSON.stringify(inputData),
    JSON.stringify(outputData),
    success,
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to log tool usage' });
      }
      res.json({ success: true });
    }
  );
});

// Get tool history
app.get('/api/tools/history', authenticateToken, (req, res) => {
  const { category, limit } = req.query;
  const userId = req.user.id;

  if (category) {
    toolOps.getByCategory(userId, category, (err, data) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch tool history' });
      }
      res.json({ success: true, data });
    });
  } else {
    toolOps.getByUser(userId, limit || 50, (err, data) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch tool history' });
      }
      res.json({ success: true, data });
    });
  }
});

// ============================================
// SCANNER ROUTES
// ============================================

// Start vulnerability scan
app.post('/api/scanner/start', authenticateToken, async (req, res) => {
  const { targetUrl, scanTypes, scanDepth, authProof } = req.body;
  const userId = req.user.id;

  if (!targetUrl || !scanTypes || scanTypes.length === 0) {
    return res.status(400).json({ error: 'Target URL and scan types required' });
  }

  try {
    const result = await scannerService.startScan(
      userId,
      targetUrl,
      scanTypes,
      scanDepth || 'standard',
      authProof
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get scan status
app.get('/api/scanner/status/:scanId', authenticateToken, (req, res) => {
  const { scanId } = req.params;

  try {
    const status = scannerService.getScanStatus(scanId);
    res.json(status);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Export scan report
app.post('/api/scanner/export/:scanId', authenticateToken, async (req, res) => {
  const { scanId } = req.params;
  const { format } = req.body;

  try {
    const scan = scannerService.activeScans.get(scanId);

    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    if (!scan.completed) {
      return res.status(400).json({ error: 'Scan not completed yet' });
    }

    const scanData = {
      scanId: scan.scanId,
      targetUrl: scan.targetUrl,
      results: scan.results,
      startTime: scan.startTime
    };

    if (format === 'docx') {
      const doc = await reportGenerator.generateDOCX(scanData);
      const buffer = await Packer.toBuffer(doc);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename=security-report-${scanId}.docx`);
      res.send(buffer);

    } else if (format === 'excel') {
      const workbook = await reportGenerator.generateExcel(scanData);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=security-report-${scanId}.xlsx`);
      await workbook.xlsx.write(res);

    } else if (format === 'pdf') {
      const tempPath = path.join(__dirname, `../temp/report-${scanId}.pdf`);

      // Create temp directory if it doesn't exist
      const fs = require('fs');
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      await reportGenerator.generatePDF(scanData, tempPath);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=security-report-${scanId}.pdf`);

      const fileStream = fs.createReadStream(tempPath);
      fileStream.pipe(res);

      // Clean up temp file after sending
      fileStream.on('end', () => {
        fs.unlink(tempPath, () => {});
      });

    } else {
      res.status(400).json({ error: 'Invalid format. Use docx, excel, or pdf' });
    }

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// JAILBREAK TESTING (FuzzyAI Integration)
// ============================================

// Get available attack modes
app.get('/api/jailbreak/attack-modes', authenticateToken, (req, res) => {
  try {
    const attackModes = jailbreakService.getAttackModes();
    res.json({
      success: true,
      attackModes
    });
  } catch (error) {
    console.error('Get attack modes error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get recommended attacks for a prompt
app.post('/api/jailbreak/recommend', authenticateToken, (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }

    const recommendations = jailbreakService.getRecommendedAttacks(prompt);

    res.json({
      success: true,
      recommendations
    });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start jailbreak test
app.post('/api/jailbreak/test', authenticateToken, async (req, res) => {
  try {
    const {
      model = 'qwen3-vl:4b',
      prompts = [],
      attackModes = ['default'],
      maxWorkers = 2,
      maxTokens = 500
    } = req.body;

    // Validate inputs
    if (!prompts || prompts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one prompt is required'
      });
    }

    if (prompts.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 10 prompts allowed per test'
      });
    }

    if (attackModes.length > 5) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 5 attack modes allowed per test'
      });
    }

    // Start test
    const result = await jailbreakService.startTest({
      model,
      prompts,
      attackModes,
      ollamaHost: 'YOUR_SERVER_IP',
      ollamaPort: 8888,
      maxWorkers,
      maxTokens
    });

    res.json(result);

  } catch (error) {
    console.error('Jailbreak test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Quick test single prompt
app.post('/api/jailbreak/quick-test', authenticateToken, async (req, res) => {
  try {
    const {
      prompt,
      model = 'qwen3-vl:4b',
      attackMode = 'default'
    } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }

    const result = await jailbreakService.quickTest(prompt, model, attackMode);

    res.json(result);

  } catch (error) {
    console.error('Quick test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get active test count
app.get('/api/jailbreak/active', authenticateToken, (req, res) => {
  try {
    const activeCount = jailbreakService.getActiveTestCount();
    res.json({
      success: true,
      activeTests: activeCount
    });
  } catch (error) {
    console.error('Get active tests error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// JAILBROKEN AI (SHADOWNET) - Unrestricted Security AI
// ============================================

// Chat with jailbroken AI
app.post('/api/shadownet/chat', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    const result = await jailbrokenAI.chat(userId, message);

    res.json(result);

  } catch (error) {
    console.error('SHADOWNET chat error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Clear conversation
app.post('/api/shadownet/clear', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    jailbrokenAI.clearConversation(userId);

    res.json({
      success: true,
      message: 'Conversation cleared'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get available security tools
app.get('/api/shadownet/tools', authenticateToken, async (req, res) => {
  try {
    const tools = await jailbrokenAI.getAvailableTools();

    res.json({
      success: true,
      tools
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Quick security assessment
app.post('/api/shadownet/quick-assess', authenticateToken, async (req, res) => {
  try {
    const { target, assessmentType = 'web' } = req.body;

    if (!target) {
      return res.status(400).json({
        success: false,
        error: 'Target is required'
      });
    }

    const result = await jailbrokenAI.quickAssessment(target, assessmentType);

    res.json(result);

  } catch (error) {
    console.error('Quick assessment error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Execute security tool directly
app.post('/api/shadownet/execute-tool', authenticateToken, async (req, res) => {
  try {
    const { tool, params } = req.body;

    if (!tool || !params) {
      return res.status(400).json({
        success: false,
        error: 'Tool and params are required'
      });
    }

    let result;

    switch (tool.toLowerCase()) {
      case 'sqlmap':
        result = await securityToolsExecutor.executeSQLMap(params);
        break;
      case 'nmap':
        result = await securityToolsExecutor.executeNmap(params);
        break;
      case 'nikto':
        result = await securityToolsExecutor.executeNikto(params);
        break;
      case 'gobuster':
        result = await securityToolsExecutor.executeGobuster(params);
        break;
      case 'wpscan':
        result = await securityToolsExecutor.executeWPScan(params);
        break;
      case 'hydra':
        result = await securityToolsExecutor.executeHydra(params);
        break;
      case 'metasploit':
        result = await securityToolsExecutor.executeMetasploit(params);
        break;
      case 'custom':
        result = await securityToolsExecutor.executeCustomCommand(params);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Unknown tool: ${tool}`
        });
    }

    res.json(result);

  } catch (error) {
    console.error('Tool execution error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', async (req, res) => {
  const ollamaHealth = await ollamaService.checkHealth();

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    ollama: ollamaHealth
  });
});

// ============================================
// SERVE FRONTEND
// ============================================

// Serve index.html for all non-API routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║   AI CYBERSECURITY PLATFORM                                ║
║   Server running on: http://0.0.0.0:${PORT}                 ║
║                                                             ║
║   Default Login:                                            ║
║   Email: admin@melodys.ctf                                  ║
║   Password: YOUR_SERVER_PASSWORD                             ║
║                                                             ║
║   ⚠️  SECURITY WARNING:                                     ║
║   Please change the default password immediately!          ║
╚═══════════════════════════════════════════════════════════╝
  `);

  // Check Ollama health on startup
  ollamaService.checkHealth().then(health => {
    if (health.available) {
      console.log('✓ Ollama AI service is connected');
      if (health.modelExists) {
        console.log('✓ Model "qwen3-vl:4b" is available');
      } else {
        console.log('⚠ Warning: Model "qwen3-vl:4b" not found');
        console.log('Available models:', health.models.join(', '));
      }
    } else {
      console.log('✗ Ollama AI service is not available');
      console.log('Error:', health.error);
    }
  });
});

module.exports = app;
