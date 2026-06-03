import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import NewClaim from './pages/NewClaim';
import ClaimDetail from './pages/ClaimDetail';
import ClaimsList from './pages/ClaimsList';
import Members from './pages/Members';
import PolicyTerms from './pages/PolicyTerms';
import { RoleProvider } from './context/RoleContext';

const App: React.FC = () => {
  return (
    <RoleProvider>
      <Router>
        <div className="app-layout">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/claims/new" element={<NewClaim />} />
              <Route path="/claims/:id" element={<ClaimDetail />} />
              <Route path="/claims" element={<ClaimsList />} />
              <Route path="/members" element={<Members />} />
              <Route path="/policy" element={<PolicyTerms />} />
            </Routes>
          </main>
        </div>
      </Router>
    </RoleProvider>
  );
};

export default App;
