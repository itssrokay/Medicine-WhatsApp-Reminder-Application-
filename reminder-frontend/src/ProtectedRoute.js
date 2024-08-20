import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from './AuthContext';

const ProtectedRoute = ({ children }) => {
  const { authState } = useContext(AuthContext);
  
  if (!authState.token) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

export default ProtectedRoute;