// Responsive grid that lays out StatCards in a row.
export default function StatRow({ children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 20 }}>
      {children}
    </div>
  );
}
