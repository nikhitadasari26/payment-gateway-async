import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Webhooks from './pages/Webhooks';
import Docs from './pages/Docs';

// Components
import Sidebar from './components/Sidebar'; // Ensure this exists in src/components/

// Styles
import './index.css';

function App() {
  // Check localStorage on load to keep user logged in
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem('isAuthenticated') === 'true'
  );

  const setAuth = (boolean) => {
    setIsAuthenticated(boolean);
    if (boolean) {
      localStorage.setItem('isAuthenticated', 'true');
    } else {
      localStorage.removeItem('isAuthenticated');
    }
  };

  // Layout wrapper to ensure Sidebar only shows on authenticated pages
  const DashboardLayout = ({ children }) => (
    <div className="app-container" style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div className="main-content" style={{ flex: 1, padding: '20px', backgroundColor: '#f4f6f8' }}>
        {children}
      </div>
    </div>
  );

  return (
    <Router>
      <Routes>
        {/* Public Route: Login */}
        <Route 
          path="/login" 
          element={!isAuthenticated ? <Login setAuth={setAuth} /> : <Navigate to="/dashboard" />} 
        />

        {/* Protected Route: Dashboard */}
        <Route 
          path="/dashboard" 
          element={
            isAuthenticated ? (
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />

        {/* Protected Route: Transactions */}
        <Route 
          path="/dashboard/transactions" 
          element={
            isAuthenticated ? (
              <DashboardLayout>
                <Transactions />
              </DashboardLayout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />

        {/* Protected Route: Webhooks (NEW) */}
        <Route 
          path="/dashboard/webhooks" 
          element={
            isAuthenticated ? (
              <DashboardLayout>
                <Webhooks />
              </DashboardLayout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />

        {/* Protected Route: API Docs (NEW) */}
        <Route 
          path="/dashboard/docs" 
          element={
            isAuthenticated ? (
              <DashboardLayout>
                <Docs />
              </DashboardLayout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />

        {/* Catch-all Redirect */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;