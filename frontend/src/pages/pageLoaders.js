// How each page's code is loaded. Pages are split into separate files by Vite, so the browser downloads
// a page only when it's needed. App.jsx turns these into lazy routes; AppLayout preloads them when the browser is idle,
// so clicking a menu item afterwards is instant.
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
