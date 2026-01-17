import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Sidebar() {
  const location = useLocation();

  // Helper to check if a link is active
  const isActive = (path) => location.pathname === path;

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    window.location.href = '/login'; // Force reload to clear state
  };

  // Dynamic styling for links
  const getLinkStyle = (path) => ({
    display: 'block',
    padding: '12px 20px',
    color: isActive(path) ? '#635bff' : '#425466',
    backgroundColor: isActive(path) ? '#eef0ff' : 'transparent',
    textDecoration: 'none',
    fontWeight: isActive(path) ? 'bold' : 'normal',
    borderRadius: '6px',
    marginBottom: '8px',
    transition: 'background 0.2s',
  });

  return (
    <div style={{
      width: '260px',
      backgroundColor: '#ffffff',
      borderRight: '1px solid #e3e8ee',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh', // Full height
      padding: '24px',
      position: 'sticky',
      top: 0
    }}>
      {/* 1. App Title / Logo */}
      <div style={{ marginBottom: '40px', paddingLeft: '10px' }}>
        <h2 style={{ color: '#635bff', margin: 0, fontSize: '22px' }}>MerchantApp</h2>
        <small style={{ color: '#8898aa' }}>Payment Gateway</small>
      </div>

      {/* 2. Navigation Menu */}
      <nav style={{ flex: 1 }}>
        <Link to="/dashboard" style={getLinkStyle('/dashboard')}>
          Dashboard
        </Link>
        
        <Link to="/dashboard/transactions" style={getLinkStyle('/dashboard/transactions')}>
          Transactions
        </Link>

        {/* NEW: Webhook Configuration */}
        <Link to="/dashboard/webhooks" style={getLinkStyle('/dashboard/webhooks')}>
          Webhooks
        </Link>

        {/* NEW: Integration Docs */}
        <Link to="/dashboard/docs" style={getLinkStyle('/dashboard/docs')}>
          API Docs
        </Link>
      </nav>

      {/* 3. Logout Button */}
      <div style={{ borderTop: '1px solid #e3e8ee', paddingTop: '20px' }}>
        <button 
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '12px',
            background: 'transparent',
            color: '#e25555',
            border: '1px solid #e25555',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px'
          }}
          onMouseOver={(e) => e.target.style.background = '#fff5f5'}
          onMouseOut={(e) => e.target.style.background = 'transparent'}
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default Sidebar;