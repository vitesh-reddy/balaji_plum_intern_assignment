import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { claimsAPI } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { useRole } from '../context/RoleContext';

interface Claim {
  _id: string;
  claim_id: string;
  member_name: string;
  member_id: string;
  treatment_date: string;
  claim_amount: number;
  approved_amount: number;
  decision: string;
  confidence_score: number;
  createdAt: string;
}

const ClaimsList: React.FC = () => {
  const { role } = useRole();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadClaims();
  }, [filter]);

  const loadClaims = async () => {
    try {
      const params: Record<string, string> = {};
      if (filter) params.status = filter;
      if (role === 'employee') params.member_id = 'EMP001';
      const res = await claimsAPI.getAll(params);
      setClaims(res.data.claims);
    } catch (error) {
      console.error('Load claims error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this claim?')) return;
    try {
      await claimsAPI.delete(id);
      setClaims(claims.filter(c => c._id !== id));
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const filteredClaims = claims.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.member_name.toLowerCase().includes(q) ||
           c.member_id.toLowerCase().includes(q) ||
           c.claim_id.toLowerCase().includes(q);
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>{role === 'admin' ? 'All Claims' : 'My Claims'}</h1>
          <p>{claims.length} total claims</p>
        </div>
        <Link to="/claims/new" className="btn btn-primary">
          ➕ New Claim
        </Link>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search by name, member ID, or claim ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: '350px' }}
        />
        {['', 'APPROVED', 'REJECTED', 'PARTIAL', 'MANUAL_REVIEW'].map(status => (
          <button
            key={status}
            className={`btn ${filter === status ? 'btn-primary' : 'btn-ghost'} btn-sm`}
            onClick={() => setFilter(status)}
          >
            {status || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <p>Loading claims...</p>
        </div>
      ) : filteredClaims.length > 0 ? (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Claim ID</th>
                <th>Member</th>
                <th>Treatment Date</th>
                <th>Claimed</th>
                <th>Approved</th>
                <th>Status</th>
                <th>Confidence</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClaims.map((claim) => (
                <tr key={claim._id}>
                  <td style={{ fontWeight: 600, color: 'var(--accent-primary-light)' }}>
                    {claim.claim_id}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{claim.member_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{claim.member_id}</div>
                  </td>
                  <td>{new Date(claim.treatment_date).toLocaleDateString('en-IN')}</td>
                  <td style={{ fontWeight: 600 }}>₹{claim.claim_amount.toLocaleString()}</td>
                  <td style={{ fontWeight: 600, color: claim.approved_amount > 0 ? 'var(--success-light)' : 'var(--text-muted)' }}>
                    ₹{claim.approved_amount.toLocaleString()}
                  </td>
                  <td><StatusBadge status={claim.decision} /></td>
                  <td>
                    <span style={{ 
                      color: claim.confidence_score >= 0.9 ? 'var(--success-light)' : 
                             claim.confidence_score >= 0.7 ? 'var(--warning-light)' : 'var(--danger-light)',
                      fontWeight: 600,
                    }}>
                      {Math.round(claim.confidence_score * 100)}%
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <Link to={`/claims/${claim._id}`} className="btn btn-ghost btn-sm">View</Link>
                      {role === 'admin' && (
                        <button className="btn btn-sm" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: 'none' }} onClick={() => handleDelete(claim._id)}>
                          ✕
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state card">
          <div className="empty-icon">📋</div>
          <h3>No claims found</h3>
          <p>{filter ? 'Try changing your filters.' : 'Submit your first claim to get started.'}</p>
        </div>
      )}
    </div>
  );
};

export default ClaimsList;
