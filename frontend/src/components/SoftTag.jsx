// Light, easy-to-read tags. SoftTag tints any colour (light background, coloured text and border);
// StatusTag shows an appointment status with the colours in theme.js (blue scheduled, green completed, red cancelled).
import { Tag } from 'antd';
import { statusColors } from '../theme';

export function SoftTag({ color, icon, children }) {
  return (
    <Tag icon={icon} style={{ background: `${color}14`, borderColor: `${color}40`, color, fontWeight: 600 }}>
      {children}
    </Tag>
  );
}

export function StatusTag({ status }) {
  const style = statusColors[status] || statusColors.scheduled;
  return <Tag style={{ background: style.background, borderColor: style.border, color: style.text, fontWeight: 600, textTransform: 'capitalize' }}>{status}</Tag>;
}
