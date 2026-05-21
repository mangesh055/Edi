/**
 * StatsFlow Navigation Bar
 * --------------------------
 * Displays the brand, pipeline progress steps, and navigation links.
 * Steps are disabled until the user has completed the prerequisite phases.
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import './Layout.css';


const STEPS = [
  { label: 'Upload',     path: '/upload',    icon: '📁', minStep: 0 },
  { label: 'Clean',      path: '/dashboard', icon: '🧹', minStep: 1 },
  { label: 'Visualize',  path: '/visualize', icon: '📊', minStep: 2 },
  { label: 'Chat',       path: '/chat',      icon: '🤖', minStep: 2 },
  { label: 'Notebook',   path: '/notebook',  icon: '🐍', minStep: 0 },
];

function Navbar() {
  const { currentStep, filename, resetAll, theme, toggleTheme } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleAuthClick = () => {
    if (user) {
      navigate('/profile');
    } else {
      navigate('/auth');
    }
  };

  const handleStepClick = (step) => {
    if (currentStep >= step.minStep) {
      navigate(step.path);
    }
  };

  const handleReset = () => {
    if (window.confirm('Start over? All current session data will be cleared.')) {
      resetAll();
      navigate('/');
    }
  };

  return (
    <nav className="navbar">
      {/* Brand */}
      <div className="navbar-brand" onClick={() => navigate('/')}>
        <div className="navbar-logo">
          <span className="navbar-logo-icon">⚡</span>
        </div>
        <div>
          <div className="navbar-title">StatsFlow</div>
          <div className="navbar-subtitle">AI Data Processing Platform</div>
        </div>
      </div>

      {/* Pipeline Steps */}
      <div className="navbar-steps">
        {STEPS.map((step, idx) => {
          const isActive    = location.pathname === step.path;
          const isCompleted = currentStep > step.minStep;
          const isAccessible = currentStep >= step.minStep;

          return (
            <button
              key={step.path}
              className={[
                'navbar-step',
                isActive    ? 'navbar-step--active'    : '',
                isCompleted ? 'navbar-step--completed' : '',
                !isAccessible ? 'navbar-step--locked' : '',
              ].join(' ')}
              onClick={() => handleStepClick(step)}
              disabled={!isAccessible}
              title={!isAccessible ? `Complete previous step first` : step.label}
            >
              <span className="navbar-step-icon">
                {isCompleted && !isActive ? '✅' : step.icon}
              </span>
              <span className="navbar-step-label">{step.label}</span>
              {idx < STEPS.length - 1 && (
                <span className="navbar-step-arrow">›</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Right Side */}
      <div className="navbar-right">
        <button
          className="btn btn-secondary navbar-theme-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
        >
          {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
        </button>
        {filename && (
          <div className="navbar-file-badge">
            <span>📄</span>
            <span className="navbar-filename">
              {filename.length > 20 ? filename.slice(0, 18) + '...' : filename}
            </span>
          </div>
        )}
        {currentStep > 0 && (
          <button className="btn btn-secondary navbar-reset-btn" onClick={handleReset}>
            ↺ Reset
          </button>
        )}
        <button 
          onClick={handleAuthClick}
          style={{
            padding: user ? '6px' : '6px 14px', 
            borderRadius: user ? '50%' : '8px', 
            fontSize: '13px', fontWeight: 600,
            cursor: 'pointer', border: '1px solid #cbd5e1', 
            backgroundColor: user ? '#e0e7ff' : '#f8fafc',
            color: user ? '#4f46e5' : '#1e293b', 
            marginLeft: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            width: user ? '36px' : 'auto', height: user ? '36px' : 'auto'
          }}
          title={user ? "My Profile" : "Sign In"}
        >
          {user ? (
            <span style={{ fontSize: '16px' }}>{(user.email?.[0] || 'U').toUpperCase()}</span>
          ) : (
            <><span>🔐</span> Sign In</>
          )}
        </button>
      </div>
    </nav>
  );
}

export default Navbar;