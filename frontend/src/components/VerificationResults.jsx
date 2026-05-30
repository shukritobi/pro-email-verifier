import React from 'react';

// Simple SVG Icons
const CheckIcon = () => (
  <svg className="step-icon icon-success" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg className="step-icon icon-error" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const WarnIcon = () => (
  <svg className="step-icon icon-warning" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const Step = ({ title, desc, passed, warning }) => {
  let Icon = XIcon;
  if (passed) Icon = CheckIcon;
  if (warning) Icon = WarnIcon;

  return (
    <div className="step-item">
      <Icon />
      <div className="step-content">
        <h4>{title}</h4>
        <p>{desc}</p>
      </div>
    </div>
  );
};

const VerificationResults = ({ result }) => {
  const isDeliverable = result.status === 'valid';
  const isUnknown = result.status === 'unknown';
  
  return (
    <div className="results-card">
      <div className="result-header">
        <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Verification Report</h3>
        <span className={`status-badge ${isDeliverable ? 'status-valid' : isUnknown ? 'status-unknown' : 'status-invalid'}`}>
          {isDeliverable ? 'Deliverable' : isUnknown ? 'Unknown' : 'Undeliverable'}
        </span>
      </div>

      <div className="result-steps">
        <Step 
          title="Syntax Check" 
          desc={result.details.syntax || "Email format looks good."}
          passed={result.syntax}
        />
        
        {/* We only show disposable step if syntax passed */}
        {result.syntax && (
          <Step 
            title="Disposable Domain Check" 
            desc={result.details.disposable || "Not a temporary email provider."}
            passed={!result.disposable}
          />
        )}

        {/* MX records check */}
        {result.syntax && !result.disposable && (
          <Step 
            title="DNS MX Lookup" 
            desc={result.mxRecord ? `Found mail server: ${result.details.mxHost}` : result.details.mx}
            passed={result.mxRecord}
          />
        )}

        {/* Deep SMTP check */}
        {result.mxRecord && (
          <Step 
            title="SMTP Handshake" 
            desc={result.details.smtp}
            passed={result.smtp && !result.catchAll}
            warning={result.catchAll || result.status === 'unknown'}
          />
        )}
      </div>
    </div>
  );
};

export default VerificationResults;
