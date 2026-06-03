import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { claimsAPI } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import ConfidenceGauge from '../components/ConfidenceGauge';

interface AdjudicationStep {
  step: string;
  step_name: string;
  passed: boolean;
  details: string;
}

interface ClaimData {
  _id: string;
  claim_id: string;
  member_id: string;
  member_name: string;
  treatment_date: string;
  claim_amount: number;
  hospital: string;
  cashless_request: boolean;
  decision: string;
  approved_amount: number;
  rejection_reasons: string[];
  rejected_items: string[];
  confidence_score: number;
  notes: string;
  next_steps: string;
  flags: string[];
  deductions: {
    copay: number;
    network_discount: number;
    sub_limit_reduction: number;
  };
  adjudication_steps: AdjudicationStep[];
  cashless_approved: boolean;
  createdAt: string;
}

const ClaimDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [claim, setClaim] = useState<ClaimData | null>(null);
  const [loading, setLoading] = useState(true);
  const [appealing, setAppealing] = useState(false);
  const [appealReason, setAppealReason] = useState('');

  useEffect(() => {
    loadClaim();
  }, [id]);

  const loadClaim = async () => {
    try {
      const res = await claimsAPI.getById(id!);
      setClaim(res.data.claim);
    } catch (error) {
      console.error('Load claim error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAppeal = async () => {
    if (!appealReason.trim()) return;
    try {
      await claimsAPI.appeal(id!, appealReason);
      setAppealing(false);
      setAppealReason('');
      loadClaim(); // Reload
    } catch (error) {
      console.error('Appeal error:', error);
    }
  };

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner" />
        <p>Loading claim details...</p>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="empty-state">
        <h3>Claim not found</h3>
        <button className="btn btn-primary mt-2" onClick={() => navigate('/claims')}>
          Back to Claims
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <button className="btn btn-ghost btn-sm mb-2" onClick={() => navigate('/claims')}>
            ← Back to Claims
          </button>
          <h1>Claim {claim.claim_id}</h1>
          <p>Submitted on {new Date(claim.createdAt).toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <ConfidenceGauge score={claim.confidence_score} size={90} />
        </div>
      </div>

      {/* Decision Header */}
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <StatusBadge status={claim.decision} />
          <div style={{ marginTop: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Claimed: </span>
            <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>₹{claim.claim_amount.toLocaleString()}</span>
            <span style={{ margin: '0 0.75rem', color: 'var(--text-muted)' }}>→</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Approved: </span>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: claim.approved_amount > 0 ? 'var(--success-light)' : 'var(--danger-light)' }}>
              ₹{claim.approved_amount.toLocaleString()}
            </span>
          </div>
        </div>
        {claim.cashless_approved && (
          <span className="badge approved" style={{ fontSize: '0.8rem' }}>💳 Cashless Approved</span>
        )}
      </div>

      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        {/* Left Column: Member & Claim Info */}
        <div>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Member Details
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Member ID:</span> {claim.member_id}</div>
              <div><span style={{ color: 'var(--text-muted)' }}>Name:</span> {claim.member_name}</div>
              <div><span style={{ color: 'var(--text-muted)' }}>Treatment Date:</span> {new Date(claim.treatment_date).toLocaleDateString('en-IN')}</div>
              <div><span style={{ color: 'var(--text-muted)' }}>Hospital:</span> {claim.hospital || 'Not specified'}</div>
            </div>
          </div>

          {/* Deductions */}
          {(claim.deductions.copay > 0 || claim.deductions.network_discount > 0) && (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Deductions
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                {claim.deductions.copay > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Co-pay</span>
                    <span className="text-warning">-₹{claim.deductions.copay.toLocaleString()}</span>
                  </div>
                )}
                {claim.deductions.network_discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Network Discount</span>
                    <span className="text-success">-₹{claim.deductions.network_discount.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rejection Reasons */}
          {claim.rejection_reasons.length > 0 && (
            <div className="card" style={{ marginBottom: '1rem', borderColor: 'rgba(244, 63, 94, 0.3)' }}>
              <h3 style={{ fontSize: '0.85rem', color: 'var(--danger-light)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Rejection Reasons
              </h3>
              {claim.rejection_reasons.map((reason, i) => (
                <div key={i} className="badge rejected" style={{ marginRight: '0.5rem', marginBottom: '0.5rem' }}>
                  {reason}
                </div>
              ))}
            </div>
          )}

          {/* Rejected Items */}
          {claim.rejected_items && claim.rejected_items.length > 0 && (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.85rem', color: 'var(--warning-light)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Excluded Items
              </h3>
              {claim.rejected_items.map((item, i) => (
                <div key={i} style={{ fontSize: '0.85rem', padding: '0.4rem 0', color: 'var(--text-secondary)' }}>
                  ❌ {item}
                </div>
              ))}
            </div>
          )}

          {/* Flags */}
          {claim.flags.length > 0 && (
            <div className="card" style={{ borderColor: 'rgba(59, 130, 246, 0.3)' }}>
              <h3 style={{ fontSize: '0.85rem', color: 'var(--info-light)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Flags
              </h3>
              {claim.flags.map((flag, i) => (
                <div key={i} className="badge manual-review" style={{ marginRight: '0.5rem', marginBottom: '0.5rem' }}>
                  🚩 {flag}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Adjudication Steps */}
        <div>
          <div className="card">
            <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Adjudication Steps
            </h3>
            <div className="adj-steps">
              {claim.adjudication_steps.map((s, i) => (
                <div key={i} className="adj-step">
                  <div className={`adj-step-icon ${s.passed ? 'pass' : 'fail'}`}>
                    {s.passed ? '✓' : '✕'}
                  </div>
                  <div className="adj-step-content">
                    <div className="adj-step-title">
                      Step {s.step}: {s.step_name}
                    </div>
                    <div className="adj-step-detail">{s.details}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes & Next Steps */}
          <div className="card" style={{ marginTop: '1rem' }}>
            <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Notes
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{claim.notes}</p>
            
            <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Next Steps
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{claim.next_steps}</p>
          </div>

          {/* Appeal Section */}
          {(claim.decision === 'REJECTED' || claim.decision === 'PARTIAL') && (
            <div className="card" style={{ marginTop: '1rem' }}>
              {!appealing ? (
                <button className="btn btn-ghost w-full" onClick={() => setAppealing(true)}>
                  📝 Appeal This Decision
                </button>
              ) : (
                <div>
                  <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>File an Appeal</h3>
                  <textarea
                    className="form-textarea"
                    placeholder="Explain why you disagree with this decision..."
                    value={appealReason}
                    onChange={(e) => setAppealReason(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                    <button className="btn btn-primary btn-sm" onClick={handleAppeal}>Submit Appeal</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setAppealing(false)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClaimDetail;
