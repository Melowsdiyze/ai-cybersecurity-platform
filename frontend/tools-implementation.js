// Base64 Functions
function base64Encode() {
    const input = document.getElementById('base64-input').value;
    try {
        const result = btoa(unescape(encodeURIComponent(input)));
        showResult('base64-result', 'base64-output', result);
    } catch (e) {
        showResult('base64-result', 'base64-output', 'Error: ' + e.message);
    }
}

function base64Decode() {
    const input = document.getElementById('base64-input').value;
    try {
        const result = decodeURIComponent(escape(atob(input)));
        showResult('base64-result', 'base64-output', result);
    } catch (e) {
        showResult('base64-result', 'base64-output', 'Error: Invalid Base64 string');
    }
}

// URL Functions
function urlEncode() {
    const input = document.getElementById('url-input').value;
    const result = encodeURIComponent(input);
    showResult('url-result', 'url-output', result);
}

function urlDecode() {
    const input = document.getElementById('url-input').value;
    try {
        const result = decodeURIComponent(input);
        showResult('url-result', 'url-output', result);
    } catch (e) {
        showResult('url-result', 'url-output', 'Error: Invalid URL encoded string');
    }
}

// Hash Functions
function generateHash() {
    const input = document.getElementById('hash-input').value;
    const hashType = document.getElementById('hash-type').value;

    let result;
    switch(hashType) {
        case 'md5':
            result = CryptoJS.MD5(input).toString();
            break;
        case 'sha1':
            result = CryptoJS.SHA1(input).toString();
            break;
        case 'sha256':
            result = CryptoJS.SHA256(input).toString();
            break;
        case 'sha512':
            result = CryptoJS.SHA512(input).toString();
            break;
    }

    showResult('hash-result', 'hash-output', result);
}

// ROT13 Function
function rot13Transform() {
    const input = document.getElementById('rot13-input').value;
    const result = input.replace(/[a-zA-Z]/g, function(c) {
        return String.fromCharCode(
            (c <= 'Z' ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26
        );
    });
    showResult('rot13-result', 'rot13-output', result);
}

// Hex Functions
function textToHex() {
    const input = document.getElementById('hex-input').value;
    let result = '';
    for (let i = 0; i < input.length; i++) {
        result += input.charCodeAt(i).toString(16).padStart(2, '0');
    }
    showResult('hex-result', 'hex-output', result);
}

function hexToText() {
    const input = document.getElementById('hex-input').value.replace(/\s/g, '');
    try {
        let result = '';
        for (let i = 0; i < input.length; i += 2) {
            result += String.fromCharCode(parseInt(input.substr(i, 2), 16));
        }
        showResult('hex-result', 'hex-output', result);
    } catch (e) {
        showResult('hex-result', 'hex-output', 'Error: Invalid hex string');
    }
}

// Binary Functions
function textToBinary() {
    const input = document.getElementById('binary-input').value;
    let result = '';
    for (let i = 0; i < input.length; i++) {
        result += input.charCodeAt(i).toString(2).padStart(8, '0') + ' ';
    }
    showResult('binary-result', 'binary-output', result.trim());
}

function binaryToText() {
    const input = document.getElementById('binary-input').value.replace(/\s/g, '');
    try {
        let result = '';
        for (let i = 0; i < input.length; i += 8) {
            result += String.fromCharCode(parseInt(input.substr(i, 8), 2));
        }
        showResult('binary-result', 'binary-output', result);
    } catch (e) {
        showResult('binary-result', 'binary-output', 'Error: Invalid binary string');
    }
}

// Caesar Cipher Functions
function caesarEncrypt() {
    const input = document.getElementById('caesar-input').value;
    const shift = parseInt(document.getElementById('caesar-shift').value);
    const result = caesarCipher(input, shift);
    showResult('caesar-result', 'caesar-output', result);
}

function caesarDecrypt() {
    const input = document.getElementById('caesar-input').value;
    const shift = parseInt(document.getElementById('caesar-shift').value);
    const result = caesarCipher(input, -shift);
    showResult('caesar-result', 'caesar-output', result);
}

function caesarCipher(text, shift) {
    return text.replace(/[a-z]/gi, function(char) {
        const start = char <= 'Z' ? 65 : 97;
        return String.fromCharCode((char.charCodeAt(0) - start + shift + 26) % 26 + start);
    });
}

// ASCII Functions
function textToAscii() {
    const input = document.getElementById('ascii-input').value;
    let result = '';
    for (let i = 0; i < input.length; i++) {
        result += input.charCodeAt(i) + ' ';
    }
    showResult('ascii-result', 'ascii-output', result.trim());
}

function asciiToText() {
    const input = document.getElementById('ascii-input').value;
    try {
        const codes = input.split(/\s+/).filter(x => x);
        let result = '';
        for (let code of codes) {
            result += String.fromCharCode(parseInt(code));
        }
        showResult('ascii-result', 'ascii-output', result);
    } catch (e) {
        showResult('ascii-result', 'ascii-output', 'Error: Invalid ASCII codes');
    }
}

// Helper Functions
function showResult(resultId, outputId, text) {
    const resultDiv = document.getElementById(resultId);
    const outputDiv = document.getElementById(outputId);

    outputDiv.textContent = text;
    resultDiv.classList.add('show');
}

function copyToClipboard(elementId) {
    const text = document.getElementById(elementId).textContent;
    navigator.clipboard.writeText(text).then(() => {
        alert('Copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}
