const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const ollamaService = require('./ollama-service');

// Store active scans
const activeScans = new Map();

// Scanner configuration
const SCAN_CONFIGS = {
    quick: { timeout: 300000, depth: 1 }, // 5 minutes
    standard: { timeout: 1800000, depth: 2 }, // 30 minutes
    deep: { timeout: 3600000, depth: 3 } // 60 minutes
};

// Start a new security scan
async function startScan(userId, targetUrl, scanTypes, scanDepth, authProof) {
    const scanId = generateScanId();
    const config = SCAN_CONFIGS[scanDepth] || SCAN_CONFIGS.standard;

    const scan = {
        scanId,
        userId,
        targetUrl,
        scanTypes,
        scanDepth,
        authProof,
        status: 'initializing',
        progress: 0,
        currentTask: 'Initializing scan...',
        results: [],
        startTime: new Date(),
        completed: false
    };

    activeScans.set(scanId, scan);

    // Start scan in background
    runScan(scan, config).catch(error => {
        console.error('Scan error:', error);
        scan.status = 'error';
        scan.error = error.message;
        scan.completed = true;
    });

    return {
        success: true,
        scanId,
        message: 'Scan started successfully'
    };
}

// Run the actual security scan
async function runScan(scan, config) {
    const { scanId, targetUrl, scanTypes } = scan;

    try {
        // Update status
        updateScanStatus(scanId, 'running', 10, 'Performing reconnaissance...');

        // Extract domain from URL
        const urlObj = new URL(targetUrl);
        const domain = urlObj.hostname;

        // Run scans based on selected types
        const scanPromises = [];

        if (scanTypes.includes('recon')) {
            scanPromises.push(runReconScan(scan, domain));
        }

        if (scanTypes.includes('sqli')) {
            scanPromises.push(runSQLiScan(scan, targetUrl));
        }

        if (scanTypes.includes('xss')) {
            scanPromises.push(runXSSScan(scan, targetUrl));
        }

        if (scanTypes.includes('port')) {
            scanPromises.push(runPortScan(scan, domain));
        }

        if (scanTypes.includes('ssl')) {
            scanPromises.push(runSSLScan(scan, domain));
        }

        if (scanTypes.includes('headers')) {
            scanPromises.push(runHeadersScan(scan, targetUrl));
        }

        // Wait for all scans to complete
        const results = await Promise.allSettled(scanPromises);

        // Collect results
        const vulnerabilities = [];
        results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value) {
                vulnerabilities.push(...result.value);
            }
        });

        updateScanStatus(scanId, 'analyzing', 90, 'AI is analyzing results...');

        // Use AI to analyze and enhance results
        const aiAnalysis = await analyzeWithAI(scan, vulnerabilities);

        // Combine results
        scan.results = [...vulnerabilities, ...aiAnalysis];

        updateScanStatus(scanId, 'completed', 100, 'Scan completed');
        scan.completed = true;

    } catch (error) {
        console.error('Scan execution error:', error);
        updateScanStatus(scanId, 'error', 0, 'Scan failed: ' + error.message);
        scan.error = error.message;
        scan.completed = true;
    }
}

// Reconnaissance scan
async function runReconScan(scan, domain) {
    updateScanStatus(scan.scanId, 'running', 15, 'Running reconnaissance...');

    const vulnerabilities = [];

    try {
        // Check HTTP headers
        const { stdout: curlOutput } = await execPromise(
            `curl -I -s --max-time 10 "https://${domain}" || curl -I -s --max-time 10 "http://${domain}"`,
            { timeout: 15000 }
        );

        // Check for security headers
        const securityHeaders = [
            'X-Frame-Options',
            'X-Content-Type-Options',
            'Strict-Transport-Security',
            'Content-Security-Policy',
            'X-XSS-Protection'
        ];

        securityHeaders.forEach(header => {
            if (!curlOutput.toLowerCase().includes(header.toLowerCase())) {
                vulnerabilities.push({
                    title: `Missing Security Header: ${header}`,
                    description: `The server does not set the ${header} security header`,
                    severity: header === 'Content-Security-Policy' ? 'MEDIUM' : 'LOW',
                    type: 'recon',
                    details: `Missing header: ${header}`,
                    remediation: `Add ${header} header to your server configuration`
                });
            }
        });

        // Check server version disclosure
        const serverMatch = curlOutput.match(/Server: ([^\r\n]+)/i);
        if (serverMatch && serverMatch[1] && serverMatch[1].includes('/')) {
            vulnerabilities.push({
                title: 'Server Version Disclosure',
                description: 'The server is disclosing its version information',
                severity: 'INFO',
                type: 'recon',
                details: `Server header: ${serverMatch[1]}`,
                remediation: 'Configure your server to hide version information'
            });
        }

    } catch (error) {
        console.error('Recon scan error:', error);
    }

    return vulnerabilities;
}

// SQL Injection scan
async function runSQLiScan(scan, targetUrl) {
    updateScanStatus(scan.scanId, 'running', 30, 'Testing for SQL injection...');

    const vulnerabilities = [];

    try {
        const urlObj = new URL(targetUrl);

        // Basic SQLi payloads
        const payloads = [
            "'",
            "' OR '1'='1",
            "' OR '1'='1' --",
            "admin' --",
            "' OR 1=1 --"
        ];

        // Test URL parameters
        if (urlObj.search) {
            for (const payload of payloads) {
                const testUrl = targetUrl.replace(/=([^&]*)/, `=${encodeURIComponent(payload)}`);

                try {
                    const { stdout: response } = await execPromise(
                        `curl -s --max-time 5 "${testUrl}"`,
                        { timeout: 7000 }
                    );

                    // Check for SQL error patterns
                    const errorPatterns = [
                        /sql syntax/i,
                        /mysql_fetch/i,
                        /pg_query/i,
                        /sqlite_/i,
                        /odbc_/i,
                        /oracle error/i,
                        /unclosed quotation mark/i
                    ];

                    for (const pattern of errorPatterns) {
                        if (pattern.test(response)) {
                            vulnerabilities.push({
                                title: 'Potential SQL Injection Vulnerability',
                                description: 'The application may be vulnerable to SQL injection',
                                severity: 'CRITICAL',
                                type: 'sqli',
                                details: `Payload: ${payload}\nError pattern detected in response`,
                                remediation: 'Use parameterized queries or prepared statements'
                            });
                            break;
                        }
                    }
                } catch (error) {
                    // Ignore individual payload errors
                }
            }
        }

    } catch (error) {
        console.error('SQLi scan error:', error);
    }

    return vulnerabilities;
}

// XSS scan
async function runXSSScan(scan, targetUrl) {
    updateScanStatus(scan.scanId, 'running', 45, 'Testing for XSS vulnerabilities...');

    const vulnerabilities = [];

    try {
        const urlObj = new URL(targetUrl);

        // XSS payloads
        const payloads = [
            '<script>alert(1)</script>',
            '"><script>alert(1)</script>',
            '<img src=x onerror=alert(1)>',
            '<svg/onload=alert(1)>'
        ];

        if (urlObj.search) {
            for (const payload of payloads) {
                const testUrl = targetUrl.replace(/=([^&]*)/, `=${encodeURIComponent(payload)}`);

                try {
                    const { stdout: response } = await execPromise(
                        `curl -s --max-time 5 "${testUrl}"`,
                        { timeout: 7000 }
                    );

                    // Check if payload is reflected unescaped
                    if (response.includes('<script>') || response.includes('onerror=') || response.includes('onload=')) {
                        vulnerabilities.push({
                            title: 'Potential XSS Vulnerability',
                            description: 'The application may be vulnerable to Cross-Site Scripting',
                            severity: 'HIGH',
                            type: 'xss',
                            details: `Payload reflected: ${payload}`,
                            remediation: 'Implement proper input validation and output encoding'
                        });
                        break;
                    }
                } catch (error) {
                    // Ignore individual payload errors
                }
            }
        }

    } catch (error) {
        console.error('XSS scan error:', error);
    }

    return vulnerabilities;
}

// Port scan
async function runPortScan(scan, domain) {
    updateScanStatus(scan.scanId, 'running', 60, 'Scanning open ports...');

    const vulnerabilities = [];

    try {
        // Common ports scan
        const { stdout: nmapOutput } = await execPromise(
            `nmap -p 21,22,23,25,80,443,3306,3389,5432,8080 --open -T4 ${domain}`,
            { timeout: 60000 }
        );

        // Check for dangerous open ports
        const dangerousPorts = {
            '21': { name: 'FTP', severity: 'MEDIUM' },
            '23': { name: 'Telnet', severity: 'HIGH' },
            '3306': { name: 'MySQL', severity: 'MEDIUM' },
            '5432': { name: 'PostgreSQL', severity: 'MEDIUM' },
            '3389': { name: 'RDP', severity: 'HIGH' }
        };

        Object.keys(dangerousPorts).forEach(port => {
            if (nmapOutput.includes(`${port}/tcp`) && nmapOutput.includes('open')) {
                const portInfo = dangerousPorts[port];
                vulnerabilities.push({
                    title: `Potentially Dangerous Port Open: ${port} (${portInfo.name})`,
                    description: `Port ${port} is open and accessible`,
                    severity: portInfo.severity,
                    type: 'port',
                    details: `Port ${port} (${portInfo.name}) detected as open`,
                    remediation: `Close port ${port} if not required, or restrict access with firewall rules`
                });
            }
        });

    } catch (error) {
        console.error('Port scan error:', error);
    }

    return vulnerabilities;
}

// SSL/TLS scan
async function runSSLScan(scan, domain) {
    updateScanStatus(scan.scanId, 'running', 70, 'Checking SSL/TLS configuration...');

    const vulnerabilities = [];

    try {
        // Check SSL certificate
        const { stdout: sslOutput } = await execPromise(
            `echo | openssl s_client -connect ${domain}:443 -servername ${domain} 2>&1`,
            { timeout: 15000 }
        );

        // Check for weak protocols
        if (sslOutput.includes('SSLv2') || sslOutput.includes('SSLv3')) {
            vulnerabilities.push({
                title: 'Weak SSL/TLS Protocol Supported',
                description: 'The server supports outdated SSL/TLS protocols',
                severity: 'HIGH',
                type: 'ssl',
                details: 'SSLv2 or SSLv3 detected',
                remediation: 'Disable SSLv2 and SSLv3, use TLS 1.2 or higher'
            });
        }

        // Check certificate expiry
        const certMatch = sslOutput.match(/notAfter=([^\n]+)/);
        if (certMatch) {
            const expiryDate = new Date(certMatch[1]);
            const daysUntilExpiry = Math.floor((expiryDate - new Date()) / (1000 * 60 * 60 * 24));

            if (daysUntilExpiry < 30) {
                vulnerabilities.push({
                    title: 'SSL Certificate Expiring Soon',
                    description: `SSL certificate expires in ${daysUntilExpiry} days`,
                    severity: daysUntilExpiry < 7 ? 'HIGH' : 'MEDIUM',
                    type: 'ssl',
                    details: `Certificate expires: ${expiryDate.toDateString()}`,
                    remediation: 'Renew your SSL certificate before it expires'
                });
            }
        }

    } catch (error) {
        console.error('SSL scan error:', error);
    }

    return vulnerabilities;
}

// Headers security scan
async function runHeadersScan(scan, targetUrl) {
    updateScanStatus(scan.scanId, 'running', 80, 'Analyzing security headers...');

    const vulnerabilities = [];

    try {
        const { stdout: headers } = await execPromise(
            `curl -I -s --max-time 10 "${targetUrl}"`,
            { timeout: 15000 }
        );

        // Check for HSTS
        if (!headers.toLowerCase().includes('strict-transport-security')) {
            vulnerabilities.push({
                title: 'Missing HSTS Header',
                description: 'HTTP Strict Transport Security (HSTS) header not set',
                severity: 'MEDIUM',
                type: 'headers',
                details: 'Strict-Transport-Security header missing',
                remediation: 'Add HSTS header: Strict-Transport-Security: max-age=31536000; includeSubDomains'
            });
        }

        // Check for CSP
        if (!headers.toLowerCase().includes('content-security-policy')) {
            vulnerabilities.push({
                title: 'Missing Content Security Policy',
                description: 'Content-Security-Policy header not set',
                severity: 'MEDIUM',
                type: 'headers',
                details: 'Content-Security-Policy header missing',
                remediation: 'Implement a Content Security Policy to prevent XSS attacks'
            });
        }

    } catch (error) {
        console.error('Headers scan error:', error);
    }

    return vulnerabilities;
}

// AI analysis of results
async function analyzeWithAI(scan, vulnerabilities) {
    const aiVulns = [];

    try {
        // Prepare context for AI
        const vulnSummary = vulnerabilities.map(v =>
            `- ${v.severity}: ${v.title}`
        ).join('\n');

        const prompt = `As a security expert, analyze these vulnerabilities found on ${scan.targetUrl}:

${vulnSummary}

Provide:
1. Risk assessment
2. Prioritized remediation steps
3. Any additional security concerns

Format your response as a structured analysis.`;

        const messages = [
            { role: 'user', content: prompt }
        ];

        const aiResponse = await ollamaService.chat(messages, 'Bug Hunter', []);

        if (aiResponse.success) {
            aiVulns.push({
                title: 'AI Security Analysis',
                description: 'Comprehensive security assessment by AI',
                severity: 'INFO',
                type: 'ai-analysis',
                details: aiResponse.message,
                remediation: 'Follow the prioritized recommendations provided'
            });
        }

    } catch (error) {
        console.error('AI analysis error:', error);
    }

    return aiVulns;
}

// Helper functions
function updateScanStatus(scanId, status, progress, currentTask) {
    const scan = activeScans.get(scanId);
    if (scan) {
        scan.status = status;
        scan.progress = progress;
        scan.currentTask = currentTask;
    }
}

function generateScanId() {
    return 'scan_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getScanStatus(scanId) {
    const scan = activeScans.get(scanId);
    if (!scan) {
        return { success: false, error: 'Scan not found' };
    }

    return {
        success: true,
        scanId,
        status: scan.status,
        progress: scan.progress,
        currentTask: scan.currentTask,
        completed: scan.completed,
        results: scan.completed ? scan.results : []
    };
}

module.exports = {
    startScan,
    getScanStatus,
    activeScans
};
