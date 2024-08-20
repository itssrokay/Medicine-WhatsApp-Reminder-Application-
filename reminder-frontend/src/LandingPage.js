import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div className="landing-page">
      <h1>Welcome to WhatsApp Reminder</h1>
      <div className="auth-options">
        <Link to="/login" className="auth-button">Login</Link>
        <Link to="/signup" className="auth-button">Signup</Link>
      </div>
    </div>
  );
};

export default LandingPage;