// One dynamic import per page, so Vite puts each page in its own file.
// App.jsx lazy-loads them and AppLayout preloads them once the browser is idle.
export const pageLoaders = {
  patients: () => import('./PatientsPage'),
  appointments: () => import('./AppointmentsPage'),
  assistant: () => import('./ChatPage'),
  documents: () => import('./DocumentsPage'),
  auditLogs: () => import('./AuditLogsPage'),
  staff: () => import('./StaffPage'),
};

export function preloadPages(names) {
  const run = () => names.forEach((name) => pageLoaders[name]());
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 3000 });
  else setTimeout(run, 1500);
}
