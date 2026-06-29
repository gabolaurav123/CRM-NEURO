import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import { AUTH_EXPIRED_EVENT, apiRequest, clearSelectedCrm, clearToken, getSelectedCrm, getToken, setSelectedCrm } from './api/client';
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
  const [activeCrmKey, setActiveCrmKey] = useState('');
  const [loadingActiveCrm, setLoadingActiveCrm] = useState(false);
  const [activatingCrmKey, setActivatingCrmKey] = useState('');
  const [crmActivationError, setCrmActivationError] = useState('');

  function resetSession() {
    clearToken();
    clearSelectedCrm();
    setAdmin(null);
    setCrmKey(null);
    setActiveCrmKey('');
    setCrmActivationError('');
    setActivatingCrmKey('');
    navigate('/login', { replace: true });
  }

  useEffect(() => {
    window.addEventListener(AUTH_EXPIRED_EVENT, resetSession);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, resetSession);
  }, []);

  useEffect(() => {
    if (!getToken()) return;
    apiRequest('/auth/me')
      .then((payload) => setAdmin(payload.admin))
      .catch(resetSession);
  }, []);

  useEffect(() => {
    if (!getToken() || !admin) return undefined;
    let cancelled = false;
    setLoadingActiveCrm(true);
    apiRequest('/whatsapp/active-crm')
      .then((payload) => {
        if (cancelled) return;
        setActiveCrmKey(payload.crm_key || payload.active_crm_key || payload.whatsapp_active_crm_key || '');
      })
      .catch((error) => {
        if (error.status === 401) return resetSession();
        if (!cancelled) setCrmActivationError(error.message || 'No se pudo leer el CRM activo para WhatsApp.');
      })
      .finally(() => {
        if (!cancelled) setLoadingActiveCrm(false);
      });
    return () => {
      cancelled = true;
    };
  }, [admin]);

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
    setActiveCrmKey('');
    setCrmActivationError('');
    setActivatingCrmKey('');
    navigate('/login', { replace: true });
  }

  async function chooseCrm(nextCrmKey) {
    setCrmActivationError('');
    setSelectedCrm(nextCrmKey);
    setCrmKey(nextCrmKey);
    navigate('/', { replace: true });
  }

  async function activateCrm(nextCrmKey) {
    setCrmActivationError('');
    setActivatingCrmKey(nextCrmKey);
    try {
      const payload = await apiRequest('/whatsapp/activate-crm', {
        method: 'POST',
        headers: { 'x-crm-key': nextCrmKey }
      });
      setActiveCrmKey(payload.crm_key || payload.active_crm_key || payload.whatsapp_active_crm_key || nextCrmKey);
    } catch (error) {
      if (error.status === 401) return resetSession();
      setCrmActivationError(error.message || 'No se pudo activar el CRM para WhatsApp.');
    } finally {
      setActivatingCrmKey('');
    }
  }

  function handleLogin(nextAdmin) {
    clearSelectedCrm();
    setCrmKey(null);
    setActiveCrmKey('');
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
          element={
            <CrmSelect
              admin={admin}
              activeCrmKey={activeCrmKey}
              loadingActiveCrm={loadingActiveCrm}
              activatingCrmKey={activatingCrmKey}
              error={crmActivationError}
              onActivate={activateCrm}
              onSelect={chooseCrm}
              onLogout={logout}
            />
          }
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
