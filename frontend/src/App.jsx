import { useState } from 'react';
import './index.css';
import VerificationResults from './components/VerificationResults';

function App() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('http://localhost:3000/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        throw new Error('Verification failed. Server returned ' + response.status);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="glass-panel">
        <div className="header">
          <h1>Pro Verifier</h1>
          <p>Deep SMTP validation & Catch-All detection.</p>
        </div>

        <form onSubmit={handleVerify} className="input-group">
          <input 
            type="email" 
            placeholder="Enter email address..." 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            spellCheck="false"
          />
          <button type="submit" className="btn" disabled={loading || !email}>
            {loading ? (
              <>
                <div className="loader"></div> Verifying...
              </>
            ) : (
              'Verify Deeply'
            )}
          </button>
        </form>

        {error && (
          <div className="step-item" style={{ borderColor: 'var(--error)' }}>
            <div className="step-content">
              <h4 style={{ color: 'var(--error)' }}>Error Connecting to Engine</h4>
              <p>{error}</p>
            </div>
          </div>
        )}

        {result && <VerificationResults result={result} />}
      </div>
    </div>
  );
}

export default App;
