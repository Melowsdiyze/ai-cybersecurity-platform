// Role-based Cybersecurity Tools
// Each role has specific tools available

const TOOLS = {
  'Forensics Analyst': [
    {
      id: 'memory-forensics',
      name: 'Memory Forensics Analyzer',
      description: 'Analyze memory dumps using Volatility-style techniques',
      category: 'Forensics',
      type: 'analyzer'
    },
    {
      id: 'disk-forensics',
      name: 'Disk Forensics',
      description: 'Analyze disk images and file systems',
      category: 'Forensics',
      type: 'analyzer'
    },
    {
      id: 'pcap-analyzer',
      name: 'PCAP Network Analyzer',
      description: 'Analyze network capture files',
      category: 'Forensics',
      type: 'analyzer'
    },
    {
      id: 'log-analyzer',
      name: 'Log & Artifact Analyzer',
      description: 'Parse and analyze system logs and artifacts',
      category: 'Forensics',
      type: 'analyzer'
    },
    {
      id: 'timeline-reconstruction',
      name: 'Timeline Reconstruction',
      description: 'Build forensic timelines from multiple sources',
      category: 'Forensics',
      type: 'builder'
    }
  ],

  'Web Exploitation Specialist': [
    {
      id: 'sqli-tester',
      name: 'SQL Injection Tester',
      description: 'Test for SQL injection vulnerabilities',
      category: 'Web Exploitation',
      type: 'tester'
    },
    {
      id: 'xss-analyzer',
      name: 'XSS Analyzer',
      description: 'Detect and analyze XSS vulnerabilities',
      category: 'Web Exploitation',
      type: 'analyzer'
    },
    {
      id: 'ssti-detector',
      name: 'SSTI Detector',
      description: 'Detect Server-Side Template Injection',
      category: 'Web Exploitation',
      type: 'detector'
    },
    {
      id: 'ssrf-tester',
      name: 'SSRF & CSRF Tester',
      description: 'Test for SSRF and CSRF vulnerabilities',
      category: 'Web Exploitation',
      type: 'tester'
    },
    {
      id: 'idor-finder',
      name: 'IDOR Finder',
      description: 'Find Insecure Direct Object References',
      category: 'Web Exploitation',
      type: 'finder'
    },
    {
      id: 'auth-bypass',
      name: 'Auth Bypass Analyzer',
      description: 'Test authentication bypass techniques',
      category: 'Web Exploitation',
      type: 'analyzer'
    },
    {
      id: 'web-fuzzer',
      name: 'Web Fuzzer',
      description: 'Fuzz web applications for vulnerabilities',
      category: 'Web Exploitation',
      type: 'fuzzer'
    }
  ],

  'Cryptography Analyst': [
    {
      id: 'encoder-decoder',
      name: 'Encoding/Decoding Tool',
      description: 'Encode and decode various formats (base64, hex, etc)',
      category: 'Cryptography',
      type: 'converter'
    },
    {
      id: 'classical-crypto',
      name: 'Classical Crypto Solver',
      description: 'Solve classical ciphers (Caesar, Vigenere, etc)',
      category: 'Cryptography',
      type: 'solver'
    },
    {
      id: 'modern-crypto',
      name: 'Modern Crypto Analyzer',
      description: 'Analyze modern cryptographic algorithms',
      category: 'Cryptography',
      type: 'analyzer'
    },
    {
      id: 'hash-identifier',
      name: 'Hash Identifier & Cracker',
      description: 'Identify and crack password hashes',
      category: 'Cryptography',
      type: 'identifier'
    },
    {
      id: 'cipher-analyzer',
      name: 'Cipher Analyzer',
      description: 'Automated cipher analysis and breaking',
      category: 'Cryptography',
      type: 'analyzer'
    }
  ],

  'Reverse Engineer': [
    {
      id: 'static-analysis',
      name: 'Static Code Analyzer',
      description: 'Perform static analysis on binaries',
      category: 'Reverse Engineering',
      type: 'analyzer'
    },
    {
      id: 'dynamic-analysis',
      name: 'Dynamic Analyzer',
      description: 'Analyze binary behavior at runtime',
      category: 'Reverse Engineering',
      type: 'analyzer'
    },
    {
      id: 'binary-inspector',
      name: 'ELF/PE Inspector',
      description: 'Inspect binary file structures',
      category: 'Reverse Engineering',
      type: 'inspector'
    },
    {
      id: 'disassembler',
      name: 'Disassembler Helper',
      description: 'Assist with disassembly and decompilation',
      category: 'Reverse Engineering',
      type: 'helper'
    },
    {
      id: 'string-analyzer',
      name: 'String & Function Analyzer',
      description: 'Extract and analyze strings and functions',
      category: 'Reverse Engineering',
      type: 'analyzer'
    }
  ],

  'Binary Exploitation Engineer (Pwn)': [
    {
      id: 'buffer-overflow',
      name: 'Buffer Overflow Analyzer',
      description: 'Analyze buffer overflow vulnerabilities',
      category: 'Binary Exploitation',
      type: 'analyzer'
    },
    {
      id: 'rop-builder',
      name: 'ROP Chain Builder',
      description: 'Build Return-Oriented Programming chains',
      category: 'Binary Exploitation',
      type: 'builder'
    },
    {
      id: 'heap-exploit',
      name: 'Heap Exploitation Helper',
      description: 'Assist with heap exploitation techniques',
      category: 'Binary Exploitation',
      type: 'helper'
    },
    {
      id: 'exploit-generator',
      name: 'Exploit Script Generator',
      description: 'Generate automated exploit scripts',
      category: 'Binary Exploitation',
      type: 'generator'
    }
  ],

  'Malware Analyst': [
    {
      id: 'static-malware',
      name: 'Static Malware Analyzer',
      description: 'Perform static malware analysis',
      category: 'Malware Analysis',
      type: 'analyzer'
    },
    {
      id: 'behavior-analysis',
      name: 'Behavior & Sandbox Analyzer',
      description: 'Analyze malware behavior in sandbox',
      category: 'Malware Analysis',
      type: 'analyzer'
    },
    {
      id: 'ioc-extractor',
      name: 'IOC Extractor',
      description: 'Extract Indicators of Compromise',
      category: 'Malware Analysis',
      type: 'extractor'
    },
    {
      id: 'obfuscation-detector',
      name: 'Obfuscation Detector',
      description: 'Detect code obfuscation techniques',
      category: 'Malware Analysis',
      type: 'detector'
    }
  ],

  'OSINT Researcher': [
    {
      id: 'recon-automation',
      name: 'Recon Automation',
      description: 'Automate reconnaissance tasks',
      category: 'OSINT',
      type: 'automation'
    },
    {
      id: 'data-correlation',
      name: 'Data Correlation Tool',
      description: 'Correlate data from multiple sources',
      category: 'OSINT',
      type: 'analyzer'
    },
    {
      id: 'asset-mapping',
      name: 'Asset Mapper',
      description: 'Map organizational assets',
      category: 'OSINT',
      type: 'mapper'
    },
    {
      id: 'intel-enrichment',
      name: 'Intelligence Enrichment',
      description: 'Enrich intelligence data',
      category: 'OSINT',
      type: 'enricher'
    }
  ],

  'Bug Hunter': [
    {
      id: 'asset-discovery',
      name: 'Asset Discovery',
      description: 'Discover target assets and subdomains',
      category: 'Bug Hunting',
      type: 'scanner'
    },
    {
      id: 'recon-pipeline',
      name: 'Recon Pipeline',
      description: 'Automated reconnaissance pipeline',
      category: 'Bug Hunting',
      type: 'automation'
    },
    {
      id: 'vuln-scanner',
      name: 'Vulnerability Scanner',
      description: 'Scan for common vulnerabilities',
      category: 'Bug Hunting',
      type: 'scanner'
    },
    {
      id: 'exploit-validator',
      name: 'Exploit Validator',
      description: 'Validate discovered vulnerabilities',
      category: 'Bug Hunting',
      type: 'validator'
    },
    {
      id: 'report-generator',
      name: 'Report Generator',
      description: 'Generate professional bug reports',
      category: 'Bug Hunting',
      type: 'generator'
    }
  ]
};

// Get tools for a specific role
function getToolsByRole(role) {
  return TOOLS[role] || TOOLS['Bug Hunter'];
}

// Get all available roles
function getAllRoles() {
  return Object.keys(TOOLS);
}

// Get tool by ID
function getToolById(toolId) {
  for (const role in TOOLS) {
    const tool = TOOLS[role].find(t => t.id === toolId);
    if (tool) {
      return { ...tool, role };
    }
  }
  return null;
}

// Tool execution logic (placeholder - can be extended)
async function executeTool(toolId, params) {
  const tool = getToolById(toolId);

  if (!tool) {
    return {
      success: false,
      error: 'Tool not found'
    };
  }

  // This is a placeholder - actual tool implementations would go here
  // For now, we return a structured response indicating the tool would execute
  return {
    success: true,
    toolName: tool.name,
    toolId: tool.id,
    category: tool.category,
    message: `Tool "${tool.name}" would execute here with parameters: ${JSON.stringify(params)}`,
    // In a real implementation, this would contain actual results
    results: {
      placeholder: true,
      note: 'Tool execution logic to be implemented based on specific requirements'
    }
  };
}

module.exports = {
  TOOLS,
  getToolsByRole,
  getAllRoles,
  getToolById,
  executeTool
};
