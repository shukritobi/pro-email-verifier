import express from 'express';
import cors from 'cors';
import { verifyEmail } from './verifier.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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

app.listen(PORT, () => {
    console.log(`Email Verifier API running on http://localhost:${PORT}`);
});
