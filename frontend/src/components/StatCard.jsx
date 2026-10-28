// Summary card (icon, number, label) shown at the top of the list pages.
import { Card, Typography } from 'antd';

export default function StatCard({ icon, label, value, color }) {
  return (
    <Card className="stat-card" styles={{ body: { padding: 18, display: 'flex', alignItems: 'center', gap: 14 } }}>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          display: 'grid',
          placeItems: 'center',
          fontSize: 20,
          color,
          background: `${color}1A`,
        }}
      >
        {icon}
      </div>
      <div>
        <Typography.Text style={{ fontSize: 24, fontWeight: 700, display: 'block', lineHeight: 1.1 }}>{value}</Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          {label}
        </Typography.Text>
      </div>
    </Card>
  );
}
