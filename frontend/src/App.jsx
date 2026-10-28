// App routes. /login is public; every other page sits inside AppLayout and needs a session.
// The Audit Log route is only rendered for admins (the backend also returns 403 for staff).
import { Navigate, Route, Routes } from 'react-router-dom';
import { getSession } from './api/session';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import PatientsPage from './pages/PatientsPage';
import AppointmentsPage from './pages/AppointmentsPage';
import AuditLogsPage from './pages/AuditLogsPage';

function RequireSession({ children }) {
  return getSession() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const isAdmin = getSession()?.user?.role === 'admin';

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireSession>
            <AppLayout />
          </RequireSession>
        }
      >
        <Route path="/patients" element={<PatientsPage />} />
        <Route path="/appointments" element={<AppointmentsPage />} />
        {isAdmin && <Route path="/audit-logs" element={<AuditLogsPage />} />}
      </Route>
      <Route path="*" element={<Navigate to="/patients" replace />} />
    </Routes>
  );
}
