// Lays out StatCards in a responsive row (4 across on wide screens, fewer on small ones).
export default function StatRow({ children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 20 }}>
      {children}
    </div>
  );
}
