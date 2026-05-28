# AI Cybersecurity Platform

Advanced role-based cybersecurity platform with AI assistant powered by Ollama.

## Features

🤖 **AI Security Assistant**
- Powered by Ollama (qwen3-vl:4b model)
- Role-specific guidance and tool recommendations
- Continuous learning from user interactions
- Session-based memory system

🛠️ **Role-Based Tools**
- Forensics Analyst
- Web Exploitation Specialist
- Cryptography Analyst
- Reverse Engineer
- Binary Exploitation Engineer (Pwn)
- Malware Analyst
- OSINT Researcher
- Bug Hunter

📚 **Knowledge Base**
- AI-powered learning system
- Stores Q&A from interactions
- Searchable knowledge repository
- Category-based organization

📊 **Usage Tracking**
- Tool usage history
- Success/failure tracking
- Activity analytics

## Technology Stack

**Backend:**
- Node.js + Express.js
- SQLite for data storage
- JWT authentication
- Ollama AI integration

**Frontend:**
- Vanilla JavaScript
- Modern CSS with CSS Variables
- Responsive design

**AI:**
- Ollama: http://YOUR_SERVER_IP:8888
- Model: qwen3-vl:4b

## Installation

### Prerequisites

1. Node.js (v14 or higher)
2. Ollama running on http://YOUR_SERVER_IP:8888
3. qwen3-vl:4b model installed in Ollama

### Setup

1. Clone or navigate to the project directory:
```bash
cd /home/jopan/ai-cybersecurity-platform
```

2. Install dependencies:
```bash
cd backend
npm install
```

3. Start the server:
```bash
node server.js
```

The server will start on **port 4356**.

## Usage

### Access the Platform

Open your browser and navigate to:
```
http://localhost:4356
```

Or from network:
```
http://[your-ip]:4356
```

### Default Login Credentials

```
Email: admin@melodys.ctf
Password: YOUR_SERVER_PASSWORD
```

⚠️ **SECURITY WARNING:** Please change the default password immediately after first login!

## API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Register new user

### Chat

- `POST /api/chat/session` - Create new chat session
- `GET /api/chat/history/:sessionId` - Get chat history
- `POST /api/chat/message` - Send message to AI
- `POST /api/chat/stream` - Stream chat response (SSE)

### Tools

- `GET /api/tools` - Get tools for user role
- `GET /api/tools/roles` - Get all available roles
- `POST /api/tools/execute` - Execute a tool
- `POST /api/tools/log` - Log tool usage
- `GET /api/tools/history` - Get tool usage history

### Knowledge Base

- `GET /api/knowledge` - Get knowledge base entries
- `GET /api/knowledge/search?q=query` - Search knowledge base

### Health

- `GET /api/health` - Check server and Ollama health

## Project Structure

```
ai-cybersecurity-platform/
├── backend/
│   ├── server.js           # Main server file
│   ├── database.js         # Database operations
│   ├── ollama-service.js   # Ollama AI integration
│   ├── tools.js            # Role-based tools
│   └── package.json
├── frontend/
│   ├── index.html          # Main HTML file
│   ├── styles.css          # Styling
│   └── app.js              # Frontend logic
├── database/
│   └── cybersecurity.db    # SQLite database (auto-created)
└── README.md
```

## Database Schema

### Tables

1. **users** - User accounts
2. **sessions** - Chat sessions
3. **messages** - Chat messages
4. **knowledge_base** - AI training data
5. **tool_history** - Tool usage logs

## Role-Based Tools

Each role has specialized tools:

### Forensics Analyst
- Memory Forensics Analyzer
- Disk Forensics
- PCAP Network Analyzer
- Log & Artifact Analyzer
- Timeline Reconstruction

### Web Exploitation Specialist
- SQL Injection Tester
- XSS Analyzer
- SSTI Detector
- SSRF & CSRF Tester
- IDOR Finder
- Auth Bypass Analyzer
- Web Fuzzer

### Cryptography Analyst
- Encoding/Decoding Tool
- Classical Crypto Solver
- Modern Crypto Analyzer
- Hash Identifier & Cracker
- Cipher Analyzer

### Reverse Engineer
- Static Code Analyzer
- Dynamic Analyzer
- ELF/PE Inspector
- Disassembler Helper
- String & Function Analyzer

### Binary Exploitation Engineer (Pwn)
- Buffer Overflow Analyzer
- ROP Chain Builder
- Heap Exploitation Helper
- Exploit Script Generator

### Malware Analyst
- Static Malware Analyzer
- Behavior & Sandbox Analyzer
- IOC Extractor
- Obfuscation Detector

### OSINT Researcher
- Recon Automation
- Data Correlation Tool
- Asset Mapper
- Intelligence Enrichment

### Bug Hunter
- Asset Discovery
- Recon Pipeline
- Vulnerability Scanner
- Exploit Validator
- Report Generator

## AI System Prompt

The AI assistant is configured with a comprehensive system prompt that:
- Acts as a Senior Cybersecurity Engineer, Bug Hunter, CTF Mentor, and Tool Architect
- Provides role-specific guidance
- Maintains professional and ethical standards
- Focuses on educational and legal cybersecurity practices
- Uses continuous learning from knowledge base

## Memory System

The platform implements two types of memory:

1. **Session Memory**: Stores conversation history per session
2. **Knowledge Base**: Long-term storage for AI learning

All interactions are stored in SQLite for:
- Training the AI
- Improving responses
- Building knowledge repository
- Analytics and insights

## Security Features

- JWT-based authentication
- Password hashing with bcryptjs
- Session management
- Role-based access control
- Secure password storage

## Development

### Adding New Tools

Edit `backend/tools.js` and add your tool to the appropriate role:

```javascript
'Your Role': [
  {
    id: 'tool-id',
    name: 'Tool Name',
    description: 'Tool description',
    category: 'Category',
    type: 'type'
  }
]
```

### Customizing AI Behavior

Edit `backend/ollama-service.js` to modify:
- System prompts
- Role contexts
- AI parameters (temperature, top_p, etc.)

## Troubleshooting

### Ollama Connection Issues

Check if Ollama is running:
```bash
curl http://YOUR_SERVER_IP:8888/api/tags
```

Verify the model is installed:
```bash
OLLAMA_HOST=YOUR_SERVER_IP:8888 ollama list
```

### Database Issues

The database is auto-created on first run. If you need to reset:
```bash
rm database/cybersecurity.db
node backend/server.js  # Will recreate the database
```

### Port Already in Use

If port 4356 is already in use, edit `backend/server.js`:
```javascript
const PORT = 4356; // Change this to another port
```

## Contributing

This platform is designed to be extensible. You can:
- Add new roles and tools
- Implement actual tool execution logic
- Enhance the AI prompts
- Add more sophisticated memory systems
- Build mobile apps
- Add authentication providers

## License

This is an internal cybersecurity platform. Use responsibly and ethically.

## Ethical Guidelines

⚠️ **IMPORTANT:**
- Only use this platform for authorized security testing
- Follow responsible disclosure practices
- Respect privacy and legal boundaries
- Use for educational purposes
- Do not use for malicious activities

## Support

For issues or questions:
- Check the `/api/health` endpoint
- Review server logs
- Verify Ollama connectivity
- Check database permissions

---

**Platform Version:** 1.0.0
**Port:** 4356
**AI Model:** qwen3-vl:4b
**Database:** SQLite
