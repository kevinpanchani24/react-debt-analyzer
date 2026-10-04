import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotFoundPage = () => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-57px)]">
      <p className="text-6xl font-bold mb-4" style={{ color: 'var(--accent)' }}>404</p>
      <p className="text-lg mb-6" style={{ color: 'var(--text-secondary)' }}>Page not found.</p>
      <button onClick={() => navigate('/')} className="btn-primary">Go Home</button>
    </div>
  );
};

export default NotFoundPage;
