import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { verifyEmail } from './verifier.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve the compiled frontend dashboard
app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.post('/api/verify', async (req, res) => {
    const { email } = req.body;
    
    if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Valid email is required.' });
    }

    try {
        console.log(`[API] Starting verification for: ${email}`);
        const result = await verifyEmail(email);
        res.json(result);
    } catch (error) {
        console.error(`[API] Error verifying ${email}:`, error);
        res.status(500).json({ error: 'Internal server error during verification.' });
    }
});

// Any other route should serve the React app (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.listen(PORT, () => {
    console.log(`Email Verifier API & Dashboard running on http://localhost:${PORT}`);
});
