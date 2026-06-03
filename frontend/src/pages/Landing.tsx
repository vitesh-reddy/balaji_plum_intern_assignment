import React from 'react';
import { Link } from 'react-router-dom';

const Landing: React.FC = () => {
  return (
    <div className="animate-fade-in" style={{ padding: '2rem 0', textAlign: 'center' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '4rem 2rem' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.5rem', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
          Intelligent OPD Claims <span style={{ color: 'var(--accent-primary-light)' }}>Adjudication</span>
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '3rem', lineHeight: 1.6 }}>
          Automate healthcare claims processing with high-confidence AI. Seamlessly extract data, enforce policy rules, and accelerate approvals for Plum members.
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '4rem' }}>
          <Link to="/claims/new" className="btn btn-primary btn-lg" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
            Submit a Claim
          </Link>
          <Link to="/dashboard" className="btn btn-ghost btn-lg" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
            Admin Dashboard
          </Link>
        </div>
      </div>

      <div className="grid-3" style={{ textAlign: 'left', marginTop: '2rem' }}>
        <div className="card">
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚡</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Instant Adjudication</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Our rule engine combined with AI evaluates claims in seconds against policy parameters, limits, and waiting periods.
          </p>
        </div>
        <div className="card">
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📄</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Smart Extraction</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Powered by Google Gemini 3.5 Flash, the engine accurately extracts claim amounts, dates, and diagnoses from unstructured data.
          </p>
        </div>
        <div className="card">
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🛡️</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Fraud Detection</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Automatically detects duplicate claims, mismatched dates, and permanent exclusions to protect the risk pool.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Landing;
