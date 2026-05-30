import PQueue from 'p-queue';

// Queue to rate-limit SMTP connections to avoid IP bans
// Limits concurrent SMTP handshakes globally across the app
export const smtpQueue = new PQueue({ concurrency: 10, intervalCap: 20, interval: 1000 });

// Placeholder for proxy list (e.g. from env vars or config)
const proxies = [];
let proxyIndex = 0;

export function getNextProxy() {
    if (proxies.length === 0) return null;
    
    const proxy = proxies[proxyIndex];
    proxyIndex = (proxyIndex + 1) % proxies.length;
    return proxy;
}
