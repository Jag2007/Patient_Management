// App routes. /login is public; every other page sits inside AppLayout and needs a session.
// The Documents, Audit Log and Staff routes are only rendered for admins (the backend also returns 403 for staff).
// Each page is loaded on demand (React.lazy), so opening the site downloads only the page you land on;
// the other pages are fetched in the background once the browser is idle (see pages/pageLoaders.js).
import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { getSession } from './api/session';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import { pageLoaders } from './pages/pageLoaders';

const PatientsPage = lazy(pageLoaders.patients);
const AppointmentsPage = lazy(pageLoaders.appointments);
const ChatPage = lazy(pageLoaders.assistant);
const DocumentsPage = lazy(pageLoaders.documents);
const AuditLogsPage = lazy(pageLoaders.auditLogs);
const StaffPage = lazy(pageLoaders.staff);

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
        <Route path="/assistant" element={<ChatPage />} />
        {isAdmin && <Route path="/documents" element={<DocumentsPage />} />}
        {isAdmin && <Route path="/audit-logs" element={<AuditLogsPage />} />}
        {isAdmin && <Route path="/staff" element={<StaffPage />} />}
      </Route>
      <Route path="*" element={<Navigate to="/patients" replace />} />
    </Routes>
  );
}
