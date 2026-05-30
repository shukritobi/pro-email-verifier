import dns from 'dns/promises';
import net from 'net';
import { createRequire } from 'module';
import { smtpQueue, getNextProxy } from './proxy-manager.js';

const require = createRequire(import.meta.url);
const disposableDomains = require('./disposable-domains.json');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Simple syntax check
export function checkSyntax(email) {
    return EMAIL_REGEX.test(email);
}

// Disposable check
export function checkDisposable(domain) {
    return disposableDomains.includes(domain.toLowerCase());
}

// MX Record lookup
export async function getMxRecords(domain) {
    try {
        const records = await dns.resolveMx(domain);
        if (!records || records.length === 0) return null;
        return records.sort((a, b) => a.priority - b.priority);
    } catch (err) {
        return null;
    }
}

// Perform deep SMTP handshake via Queue
export function checkSMTP(email, mxHostname) {
    return smtpQueue.add(() => new Promise((resolve) => {
        // NOTE: Here is where getNextProxy() would be used to route the `net.createConnection` 
        // through a SOCKS5 agent if proxies were configured.
        
        const socket = net.createConnection(25, mxHostname);
        socket.setTimeout(10000); 
        
        let step = 0;
        let responseCode = null;
        const myHostname = 'mail.example.com'; 
        
        const commands = [
            `HELO ${myHostname}\r\n`,
            `MAIL FROM:<>\r\n`,
            `RCPT TO:<${email}>\r\n`,
            `QUIT\r\n`
        ];

        let buffer = '';

        socket.on('data', (data) => {
            buffer += data.toString();
            if (!buffer.endsWith('\r\n')) return;

            const lines = buffer.split('\r\n').filter(l => l.trim());
            const lastLine = lines[lines.length - 1];
            buffer = '';

            const code = parseInt(lastLine.substring(0, 3));
            
            if (step === 0 && code === 220) {
                socket.write(commands[0]);
                step++;
            } else if (step === 1 && code === 250) {
                socket.write(commands[1]);
                step++;
            } else if (step === 2 && code === 250) {
                socket.write(commands[2]);
                step++;
            } else if (step === 3) {
                responseCode = code;
                socket.write(commands[3]); 
                step++;
            } else if (step === 4 && code === 221) {
                socket.end();
            } else {
                if (step === 3) {
                     responseCode = code; 
                }
                socket.end();
            }
        });

        socket.on('error', (err) => {
            console.error(`[SMTP Error] ${mxHostname}:`, err.message);
            resolve({ success: false, reason: 'connection_error', details: err.message });
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve({ success: false, reason: 'timeout' });
        });

        socket.on('close', () => {
            if (responseCode === 250 || responseCode === 251) {
                resolve({ success: true, reason: 'mailbox_exists' });
            } else if (responseCode >= 500) {
                resolve({ success: false, reason: 'mailbox_does_not_exist', code: responseCode });
            } else if (responseCode >= 400) {
                resolve({ success: false, reason: 'greylisted_or_temp_error', code: responseCode });
            } else {
                resolve({ success: false, reason: 'unexpected_response', code: responseCode });
            }
        });
    }));
}

// Master verification function
export async function verifyEmail(email) {
    const result = {
        email,
        syntax: false,
        disposable: false,
        mxRecord: false,
        smtp: false,
        catchAll: false,
        status: 'invalid', 
        details: {}
    };

    // 1. Syntax Check
    if (!checkSyntax(email)) {
        result.details.syntax = 'Invalid format';
        return result;
    }
    result.syntax = true;

    const [localPart, domain] = email.split('@');

    // 2. Disposable Check
    if (checkDisposable(domain)) {
        result.disposable = true;
        result.details.disposable = 'Domain is a known disposable email provider';
        return result; // Stop early if disposable
    }

    // 3. MX Record Lookup
    const mxRecords = await getMxRecords(domain);
    if (!mxRecords) {
        result.details.mx = 'No MX records found for domain';
        return result;
    }
    result.mxRecord = true;
    const primaryMx = mxRecords[0].exchange;
    result.details.mxHost = primaryMx;

    // 4. SMTP Check & Catch-all detection
    const randomEmail = `xkx8j2abc9123@${domain}`;
    
    // Check catch all first
    const catchAllCheck = await checkSMTP(randomEmail, primaryMx);
    
    if (catchAllCheck.success) {
        result.catchAll = true;
        result.smtp = true;
        result.status = 'unknown'; 
        result.details.smtp = 'Server is configured as a Catch-All (accepts everything)';
        return result;
    }

    // Check actual email
    const smtpCheck = await checkSMTP(email, primaryMx);
    if (smtpCheck.success) {
        result.smtp = true;
        result.status = 'valid';
        result.details.smtp = 'Mailbox exists and is deliverable';
    } else {
        result.smtp = false;
        result.status = 'invalid';
        result.details.smtp = smtpCheck.reason;
        
        if (smtpCheck.reason === 'connection_error' || smtpCheck.reason === 'timeout') {
             result.status = 'unknown'; 
             result.details.smtp = 'Failed to connect to mail server (Port 25 might be blocked)';
        }
    }

    return result;
}
