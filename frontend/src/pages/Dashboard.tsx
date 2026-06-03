import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { claimsAPI } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { useRole } from '../context/RoleContext';

interface Stats {
  total: number;
  approved: number;
  rejected: number;
  partial: number;
  manual_review: number;
  pending: number;
  total_approved_amount: number;
  total_claimed_amount: number;
  approval_rate: number;
}

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

const Dashboard: React.FC = () => {
  const { role } = useRole();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentClaims, setRecentClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  if (role === 'employee') {
    return <Navigate to="/claims/new" />;
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsRes, claimsRes] = await Promise.all([
        claimsAPI.getStats(),
        claimsAPI.getAll({ limit: '5' }),
      ]);
      setStats(statsRes.data);
      setRecentClaims(claimsRes.data.claims);
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Dashboard</h1>
          <p>OPD Claims Adjudication Overview</p>
        </div>
        <Link to="/claims/new" className="btn btn-primary btn-lg">
          ➕ New Claim
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card accent">
          <div className="stat-label">Total Claims</div>
          <div className="stat-value">{stats?.total || 0}</div>
          <div className="stat-icon">📊</div>
        </div>
        <div className="stat-card success">
          <div className="stat-label">Approved</div>
          <div className="stat-value">{stats?.approved || 0}</div>
          <div className="stat-icon">✅</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-label">Rejected</div>
          <div className="stat-value">{stats?.rejected || 0}</div>
          <div className="stat-icon">❌</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-label">Partial</div>
          <div className="stat-value">{stats?.partial || 0}</div>
          <div className="stat-icon">⚠️</div>
        </div>
        <div className="stat-card info">
          <div className="stat-label">Manual Review</div>
          <div className="stat-value">{stats?.manual_review || 0}</div>
          <div className="stat-icon">🔍</div>
        </div>
      </div>

      {/* Amount Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
            TOTAL CLAIMED
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            ₹{(stats?.total_claimed_amount || 0).toLocaleString()}
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
            TOTAL APPROVED
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success-light)' }}>
            ₹{(stats?.total_approved_amount || 0).toLocaleString()}
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
            APPROVAL RATE
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary-light)' }}>
            {stats?.approval_rate || 0}%
          </div>
        </div>
      </div>

      {/* Recent Claims */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Recent Claims</h2>
        <Link to="/claims" className="btn btn-ghost btn-sm">View All →</Link>
      </div>

      {recentClaims.length > 0 ? (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Claim ID</th>
                <th>Member</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Approved</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentClaims.map((claim) => (
                <tr key={claim._id}>
                  <td style={{ fontWeight: 600, color: 'var(--accent-primary-light)' }}>
                    {claim.claim_id}
                  </td>
                  <td>
                    <div>{claim.member_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{claim.member_id}</div>
                  </td>
                  <td>{new Date(claim.treatment_date).toLocaleDateString('en-IN')}</td>
                  <td style={{ fontWeight: 600 }}>₹{claim.claim_amount.toLocaleString()}</td>
                  <td style={{ fontWeight: 600, color: claim.approved_amount > 0 ? 'var(--success-light)' : 'var(--text-muted)' }}>
                    ₹{claim.approved_amount.toLocaleString()}
                  </td>
                  <td><StatusBadge status={claim.decision} /></td>
                  <td>
                    <Link to={`/claims/${claim._id}`} className="btn btn-ghost btn-sm">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state card">
          <div className="empty-icon">📋</div>
          <h3>No claims yet</h3>
          <p>Submit your first OPD claim to get started.</p>
          <Link to="/claims/new" className="btn btn-primary mt-2">
            Submit New Claim
          </Link>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
