import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import Dashboard from './components/dashboard/Dashboard';
import InvitationManager from './components/admin/InvitationManager';
import SchematicDetail from './components/schematic/SchematicDetail';
import UploadPage from './components/upload/UploadPage';
import { Layers } from 'lucide-react';

import { NotificationProvider } from './contexts/NotificationContext';
import { ConfirmProvider } from './contexts/ConfirmContext';

// Basic Auth Layout wrapper for the centering effect
const AuthLayout = ({ children }) => {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '2rem'
      }}>
        <h1 style={{ fontSize: '1.5rem', letterSpacing: '-0.03em' }}>SGU Server</h1>
      </div>

      {children}
    </div>
  );
};

// Dashboard route guard logic handled within Dashboard or via wrapper
// To keep layout clean, we use the Dashboard component directly
function App() {
  return (
    <ConfirmProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={
              <AuthLayout>
                <LoginForm />
              </AuthLayout>
            } />
            <Route path="/register" element={
              <AuthLayout>
                <RegisterForm />
              </AuthLayout>
            } />
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/admin/invitations" element={<InvitationManager />} />
            <Route path="/schematic/:id" element={<SchematicDetail />} />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </ConfirmProvider>
  );
}

export default App;
