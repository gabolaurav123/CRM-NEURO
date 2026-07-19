import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import { AUTH_EXPIRED_EVENT, apiRequest, clearSelectedCrm, clearToken, getToken } from './api/client';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Conversations from './pages/Conversations';
import Dashboard from './pages/Dashboard';
import FollowUps from './pages/FollowUps';
import LeadDetail from './pages/LeadDetail';
import Leads from './pages/Leads';
import Login from './pages/Login';
import Payments from './pages/Payments';
import Settings from './pages/Settings';
import WhatsAppQR from './pages/WhatsAppQR';

export default function App() {
  return <BrowserRouter><AppRoutes /></BrowserRouter>;
}

function AppRoutes() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);

  function resetSession() {
    clearToken();
    clearSelectedCrm();
    setAdmin(null);
    navigate('/login', { replace: true });
  }

  useEffect(() => {
    window.addEventListener(AUTH_EXPIRED_EVENT, resetSession);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, resetSession);
  }, []);

  useEffect(() => {
    clearSelectedCrm();
    if (!getToken()) return;
    apiRequest('/auth/me').then((payload) => setAdmin(payload.admin)).catch(resetSession);
  }, []);

  async function logout() {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // El cierre local debe funcionar incluso cuando la sesion ya vencio.
    }
    resetSession();
  }

  return (
    <Routes>
      <Route path="/login" element={<Login onLogin={setAdmin} />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<PrivateShell admin={admin} onLogout={logout} />}>
          <Route index element={<Dashboard />} />
          <Route path="leads" element={<Leads />} />
          <Route path="leads/:id" element={<LeadDetail />} />
          <Route path="conversations" element={<Conversations />} />
          <Route path="conversations/:leadId" element={<Conversations />} />
          <Route path="whatsapp" element={<WhatsAppQR />} />
          <Route path="payments" element={<Payments />} />
          <Route path="followups" element={<FollowUps />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>
      <Route path="select-crm" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function PrivateShell({ admin, onLogout }) {
  return <Layout admin={admin} onLogout={onLogout}><Outlet /></Layout>;
}
