import React, { useEffect, useState } from 'react';
import { membersAPI } from '../services/api';
import { Link } from 'react-router-dom';

interface Member {
  _id: string;
  member_id: string;
  name: string;
  join_date: string;
  policy_status: string;
  dependents: { name: string; relation: string }[];
}

const Members: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const res = await membersAPI.getAll();
      setMembers(res.data.members);
    } catch (error) {
      console.error('Load members error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner" />
        <p>Loading members...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Members</h1>
        <p>{members.length} covered members</p>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Member ID</th>
              <th>Name</th>
              <th>Join Date</th>
              <th>Status</th>
              <th>Dependents</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member._id}>
                <td style={{ fontWeight: 600, color: 'var(--accent-primary-light)' }}>
                  {member.member_id}
                </td>
                <td style={{ fontWeight: 500 }}>{member.name}</td>
                <td>{new Date(member.join_date).toLocaleDateString('en-IN')}</td>
                <td>
                  <span className={`badge ${member.policy_status === 'active' ? 'approved' : 'rejected'}`}>
                    {member.policy_status}
                  </span>
                </td>
                <td style={{ color: 'var(--text-muted)' }}>
                  {member.dependents.length > 0
                    ? member.dependents.map(d => `${d.name} (${d.relation})`).join(', ')
                    : 'None'}
                </td>
                <td>
                  <Link to={`/claims?member_id=${member.member_id}`} className="btn btn-ghost btn-sm">
                    View Claims
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Members;
