const axios = require('axios');

const OLLAMA_BASE_URL = 'http://YOUR_SERVER_IP:8888';
const MODEL_NAME = 'qwen3-vl:4b';

// System prompt based on the cybersecurity AI role
const SYSTEM_PROMPT = `Kamu adalah AI Cybersecurity Platform Orchestrator yang bertindak sebagai Senior Cybersecurity Engineer, Bug Hunter, CTF Mentor, dan Tool Architect.

Kamu bukan sekadar chatbot, melainkan partner teknis profesional yang membantu pengguna membangun tools, menemukan bug, dan menyelesaikan tantangan keamanan siber secara etis dan bertanggung jawab.

Platform ini menyediakan toolbox cybersecurity lengkap, modern, mudah digunakan, dan berbasis role.

PRINSIP UTAMA:
- Profesional dan presisi teknis
- Fokus solusi
- Edukatif
- Ethical hacking
- Tidak mendorong aktivitas ilegal

Kamu menerapkan continuous learning dan menggunakan knowledge base untuk meningkatkan kualitas jawaban.`;

// Get role-specific context
function getRoleContext(role) {
  const roleContexts = {
    'Forensics Analyst': `
Tools yang tersedia:
- Memory forensics (Volatility-style analysis)
- Disk forensics
- Network capture analysis (PCAP)
- Log & artifact analysis
- Timeline reconstruction

Fokus pada analisis forensik digital dan investigasi.`,

    'Web Exploitation Specialist': `
Tools yang tersedia:
- SQL Injection tester
- XSS analyzer
- SSTI detector
- SSRF & CSRF tester
- IDOR finder
- Auth bypass analysis
- Fuzzer & exploit chaining assistant

Fokus pada web application security dan exploitation.`,

    'Cryptography Analyst': `
Tools yang tersedia:
- Encoding / decoding tools
- Classical crypto solver
- Modern crypto analysis
- Hash identification & cracking
- Cipher analysis & automation

Fokus pada analisis kriptografi dan code breaking.`,

    'Reverse Engineer': `
Tools yang tersedia:
- Static analysis
- Dynamic analysis
- ELF / PE inspection
- Disassembler & decompiler helper
- String & function analysis

Fokus pada reverse engineering dan malware analysis.`,

    'Binary Exploitation Engineer (Pwn)': `
Tools yang tersedia:
- Buffer overflow analysis
- ROP chain builder
- Heap exploitation helper
- Exploit automation script generator

Fokus pada binary exploitation dan pwn challenges.`,

    'Malware Analyst': `
Tools yang tersedia:
- Static malware analysis
- Behavior & sandbox analysis
- IOC extraction
- Obfuscation detection

Fokus pada analisis malware dan threat intelligence.`,

    'OSINT Researcher': `
Tools yang tersedia:
- Recon automation
- Data correlation
- Asset mapping
- Intelligence enrichment

Fokus pada open-source intelligence gathering.`,

    'Bug Hunter': `
Tools yang tersedia:
- Asset discovery
- Recon pipeline
- Vulnerability discovery
- Exploit validation
- Report generation

Fokus pada bug bounty hunting dan vulnerability research.`
  };

  return roleContexts[role] || roleContexts['Bug Hunter'];
}

// Chat with Ollama AI
async function chat(messages, userRole = 'Bug Hunter', knowledgeContext = []) {
  try {
    // Build context with system prompt, role context, and knowledge base
    const roleContext = getRoleContext(userRole);

    let knowledgeContextText = '';
    if (knowledgeContext && knowledgeContext.length > 0) {
      knowledgeContextText = '\n\nRELEVANT KNOWLEDGE FROM PREVIOUS INTERACTIONS:\n';
      knowledgeContext.forEach((kb, idx) => {
        knowledgeContextText += `${idx + 1}. Q: ${kb.question}\n   A: ${kb.answer}\n`;
      });
    }

    const systemMessage = {
      role: 'system',
      content: `${SYSTEM_PROMPT}\n\nROLE SAAT INI: ${userRole}\n${roleContext}${knowledgeContextText}`
    };

    // Prepare messages for Ollama
    const allMessages = [systemMessage, ...messages];

    const response = await axios.post(`${OLLAMA_BASE_URL}/api/chat`, {
      model: MODEL_NAME,
      messages: allMessages,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        top_k: 40
      }
    });

    return {
      success: true,
      message: response.data.message.content,
      model: MODEL_NAME
    };
  } catch (error) {
    console.error('Ollama chat error:', error.message);
    return {
      success: false,
      error: error.message,
      message: 'Maaf, terjadi kesalahan saat berkomunikasi dengan AI. Pastikan Ollama service berjalan dengan baik.'
    };
  }
}

// Stream chat response (for real-time responses)
async function streamChat(messages, userRole, knowledgeContext, onChunk) {
  try {
    const roleContext = getRoleContext(userRole);

    let knowledgeContextText = '';
    if (knowledgeContext && knowledgeContext.length > 0) {
      knowledgeContextText = '\n\nRELEVANT KNOWLEDGE FROM PREVIOUS INTERACTIONS:\n';
      knowledgeContext.forEach((kb, idx) => {
        knowledgeContextText += `${idx + 1}. Q: ${kb.question}\n   A: ${kb.answer}\n`;
      });
    }

    const systemMessage = {
      role: 'system',
      content: `${SYSTEM_PROMPT}\n\nROLE SAAT INI: ${userRole}\n${roleContext}${knowledgeContextText}`
    };

    const allMessages = [systemMessage, ...messages];

    const response = await axios.post(`${OLLAMA_BASE_URL}/api/chat`, {
      model: MODEL_NAME,
      messages: allMessages,
      stream: true,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        top_k: 40
      }
    }, {
      responseType: 'stream'
    });

    let fullMessage = '';

    return new Promise((resolve, reject) => {
      response.data.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(line => line.trim());

        lines.forEach(line => {
          try {
            const parsed = JSON.parse(line);
            if (parsed.message && parsed.message.content) {
              fullMessage += parsed.message.content;
              onChunk(parsed.message.content);
            }

            if (parsed.done) {
              resolve({
                success: true,
                message: fullMessage,
                model: MODEL_NAME
              });
            }
          } catch (e) {
            // Ignore parse errors
          }
        });
      });

      response.data.on('error', (error) => {
        reject({
          success: false,
          error: error.message
        });
      });
    });
  } catch (error) {
    console.error('Ollama stream error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Check if Ollama is available
async function checkHealth() {
  try {
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`);
    const models = response.data.models || [];
    const modelExists = models.some(m => m.name === MODEL_NAME);

    return {
      available: true,
      modelExists,
      models: models.map(m => m.name)
    };
  } catch (error) {
    return {
      available: false,
      error: error.message
    };
  }
}

module.exports = {
  chat,
  streamChat,
  checkHealth,
  getRoleContext
};
