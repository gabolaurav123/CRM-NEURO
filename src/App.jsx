import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import { apiRequest, clearSelectedCrm, clearToken, getSelectedCrm, getToken, setSelectedCrm } from './api/client';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Conversations from './pages/Conversations';
import CrmSelect from './pages/CrmSelect';
import Dashboard from './pages/Dashboard';
import FollowUps from './pages/FollowUps';
import LeadDetail from './pages/LeadDetail';
import Leads from './pages/Leads';
import Login from './pages/Login';
import Payments from './pages/Payments';
import Settings from './pages/Settings';
import WhatsAppQR from './pages/WhatsAppQR';
import { getCrmByKey } from './utils/crm';

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

function AppRoutes() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [crmKey, setCrmKey] = useState(getSelectedCrm());
  const [activatingCrmKey, setActivatingCrmKey] = useState('');
  const [crmActivationError, setCrmActivationError] = useState('');

  useEffect(() => {
    if (!getToken()) return;
    apiRequest('/auth/me')
      .then((payload) => setAdmin(payload.admin))
      .catch(() => {
        clearToken();
        clearSelectedCrm();
        setAdmin(null);
        setCrmKey(null);
      });
  }, []);

  useEffect(() => {
    if (!getToken() || !crmKey) return undefined;
    let cancelled = false;
    apiRequest('/whatsapp/activate-crm', { method: 'POST' }).catch((error) => {
      if (!cancelled) setCrmActivationError(error.message || 'No se pudo activar el CRM para WhatsApp.');
    });
    return () => {
      cancelled = true;
    };
  }, [crmKey]);

  async function logout() {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // Logout is local even if the token is already expired.
    }
    clearToken();
    clearSelectedCrm();
    setAdmin(null);
    setCrmKey(null);
    navigate('/login', { replace: true });
  }

  async function chooseCrm(nextCrmKey) {
    setCrmActivationError('');
    setActivatingCrmKey(nextCrmKey);
    setSelectedCrm(nextCrmKey);
    try {
      await apiRequest('/whatsapp/activate-crm', { method: 'POST' });
      setCrmKey(nextCrmKey);
      navigate('/', { replace: true });
    } catch (error) {
      clearSelectedCrm();
      setCrmKey(null);
      setCrmActivationError(error.message || 'No se pudo activar el CRM para WhatsApp.');
    } finally {
      setActivatingCrmKey('');
    }
  }

  function handleLogin(nextAdmin) {
    clearSelectedCrm();
    setCrmKey(null);
    setAdmin(nextAdmin);
  }

  function changeCrm() {
    clearSelectedCrm();
    setCrmKey(null);
    navigate('/select-crm', { replace: true });
  }

  return (
    <Routes>
      <Route path="/login" element={<Login onLogin={handleLogin} />} />
      <Route element={<ProtectedRoute />}>
        <Route
          path="select-crm"
          element={<CrmSelect admin={admin} activatingCrmKey={activatingCrmKey} error={crmActivationError} onSelect={chooseCrm} onLogout={logout} />}
        />
        <Route element={<RequireCrm crmKey={crmKey} />}>
          <Route element={<PrivateShell admin={admin} crmKey={crmKey} onChangeCrm={changeCrm} onLogout={logout} />}>
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
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function RequireCrm({ crmKey }) {
  return crmKey ? <Outlet /> : <Navigate to="/select-crm" replace />;
}

function PrivateShell({ admin, crmKey, onChangeCrm, onLogout }) {
  const crm = getCrmByKey(crmKey);
  return (
    <Layout admin={admin} crm={crm} onChangeCrm={onChangeCrm} onLogout={onLogout}>
      <Outlet />
    </Layout>
  );
}
