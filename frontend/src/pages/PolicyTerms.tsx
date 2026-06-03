import React, { useEffect, useState } from 'react';
import { policyAPI } from '../services/api';

const PolicyTerms: React.FC = () => {
  const [policy, setPolicy] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    try {
      const res = await policyAPI.getTerms();
      setPolicy(res.data.policy);
    } catch (error) {
      console.error('Load policy error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner" />
        <p>Loading policy terms...</p>
      </div>
    );
  }

  if (!policy) return null;

  const coverage = policy.coverage_details as Record<string, unknown>;
  const waitingPeriods = policy.waiting_periods as Record<string, unknown>;
  const exclusions = policy.exclusions as string[];
  const networkHospitals = policy.network_hospitals as string[];
  const claimReqs = policy.claim_requirements as Record<string, unknown>;

  const formatCurrency = (val: unknown): string => {
    if (typeof val === 'number') return `₹${val.toLocaleString()}`;
    return String(val ?? '');
  };

  const formatTitle = (str: string) => {
    return str.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
        <h1>{policy.policy_name as string}</h1>
        <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
          <span className="badge approved">Active Policy</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ID: {policy.policy_id as string}</span>
        </p>
      </div>

      <div className="grid-2">
        {/* Coverage & Limits */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Coverage Limits</h3>
          </div>
          <div style={{ padding: '0 1.5rem' }}>
            <div style={{ padding: '1rem 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Annual Limit</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(coverage.annual_limit)}</span>
            </div>
            <div style={{ padding: '1rem 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Per Claim Limit</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(coverage.per_claim_limit)}</span>
            </div>
            <div style={{ padding: '1rem 0', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Family Floater</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(coverage.family_floater_limit)}</span>
            </div>
          </div>
        </div>

        {/* Sub-Limits */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Category Sub-Limits</h3>
          </div>
          <div style={{ padding: '0 1.5rem' }}>
            {['consultation_fees', 'diagnostic_tests', 'pharmacy', 'dental', 'vision', 'alternative_medicine'].map((key, index, arr) => {
              const cat = coverage[key] as Record<string, unknown>;
              if (!cat) return null;
              return (
                <div key={key} style={{ padding: '0.75rem 0', borderBottom: index === arr.length - 1 ? 'none' : '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    {formatTitle(key)}
                  </span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                      {formatCurrency(cat.sub_limit)}
                    </div>
                    {typeof cat.copay_percentage === 'number' && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {cat.copay_percentage}% Co-pay
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Waiting Periods */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Waiting Periods</h3>
          </div>
          <div style={{ padding: '0 1.5rem' }}>
            <div style={{ padding: '1rem 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Initial Waiting Period</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{waitingPeriods.initial_waiting as number} days</span>
            </div>
            <div style={{ padding: '1rem 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Pre-existing Diseases</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{waitingPeriods.pre_existing_diseases as number} days</span>
            </div>
            <div style={{ padding: '1rem 0' }}>
              <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Specific Ailments</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {Object.entries((waitingPeriods.specific_ailments ?? {}) as Record<string, number>).map(([ailment, days]) => (
                  <div key={ailment} style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '1rem', borderLeft: '2px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{formatTitle(ailment)}</span>
                    <span style={{ fontWeight: 500, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{days} days</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Requirements & Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Claim Requirements</h3>
            </div>
            <div style={{ padding: '1.25rem 1.5rem' }}>
              <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {(claimReqs.documents_required as string[])?.map((doc, i) => (
                  <li key={i}>{formatTitle(doc)}</li>
                ))}
              </ul>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Submission Deadline</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{claimReqs.submission_timeline_days as number} days</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Minimum Claim</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(claimReqs.minimum_claim_amount)}</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden', borderLeft: '4px solid var(--danger)' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--danger)' }}>Permanent Exclusions</h3>
            </div>
            <div style={{ padding: '1.25rem 1.5rem' }}>
              <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', margin: 0 }}>
                {exclusions?.map((exc, i) => (
                  <li key={i}>{exc}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden', borderLeft: '4px solid var(--success)' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--success)' }}>Network Hospitals</h3>
            </div>
            <div style={{ padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {networkHospitals?.map((hosp, i) => (
                  <span key={i} className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                    {hosp}
                  </span>
                ))}
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default PolicyTerms;
