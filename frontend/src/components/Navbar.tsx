import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useRole } from '../context/RoleContext';

const Navbar: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;
  const { role, setRole } = useRole();
  const navigate = useNavigate();

  const handleRoleToggle = () => {
    const newRole = role === 'employee' ? 'admin' : 'employee';
    setRole(newRole);
    if (newRole === 'employee' && (path === '/dashboard' || path === '/')) navigate('/claims/new');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
            <div className="logo-icon"><img width={130} draggable={false} src="/horizontal_lookup.jpg" alt="Plum OPD" /></div>
            {/* <h1 style={{ color: 'var(--text-primary)', margin: 0 }}>Plum OPD</h1> */}
          </Link>
          <span className="badge" style={{ marginLeft: '3rem', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
            {role.toUpperCase()}
          </span>
        </div>
        <div className="navbar-nav">
          {role === 'admin' && <Link to="/dashboard" className={`nav-link ${path === '/dashboard' ? 'active' : ''}`}>Dashboard</Link>}
          {role === 'employee' && <Link to="/claims/new" className={`nav-link ${path === '/claims/new' ? 'active' : ''}`}>New Claim</Link>}
          <Link to="/claims" className={`nav-link ${path === '/claims' ? 'active' : ''}`}>
            {role === 'admin' ? 'All Claims' : 'My Claims'}
          </Link>
          {role === 'admin' && <Link to="/members" className={`nav-link ${path === '/members' ? 'active' : ''}`}>Members</Link>}
          <Link to="/policy" className={`nav-link ${path === '/policy' ? 'active' : ''}`}>Policy Terms</Link>
          
          <button 
            onClick={handleRoleToggle}
            className="btn btn-ghost btn-sm" 
            style={{ marginLeft: '1rem', border: '1px solid var(--border-color)', fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
          >
            Switch to {role === 'employee' ? 'Admin' : 'Employee'}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
