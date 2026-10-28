// Side drawer (admin only) showing one patient's activity history as a timeline:
// who viewed, edited, booked or cancelled, and when. Data comes from GET /audit-logs?patientId=.
import { useEffect, useState } from 'react';
import { Alert, Drawer, Empty, Spin, Timeline, Typography } from 'antd';
import dayjs from 'dayjs';
import api, { errorMessage } from '../api/client';
import { activityInfo } from './activity';

export default function PatientActivityDrawer({ patientId, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    setError('');
    api
      .get('/audit-logs', { params: { patientId } })
      .then(({ data }) => setLogs(data))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [patientId]);

  const items = logs.map((log) => {
    const info = activityInfo(log.action);
    return {
      color: info.color,
      icon: <span style={{ color: info.color }}>{info.icon}</span>,
      content: (
        <>
          <Typography.Text strong>{info.label}</Typography.Text>
          <br />
          <Typography.Text type="secondary">
            by {log.username} · {dayjs(log.createdAt).format('DD MMM YYYY, HH:mm')}
          </Typography.Text>
        </>
      ),
    };
  });

  return (
    <Drawer title={`Activity for ${patientId || ''}`} open={Boolean(patientId)} onClose={onClose} size={420}>
      {error && <Alert type="error" title={error} showIcon />}
      {loading ? <Spin /> : !error && (items.length ? <Timeline items={items} /> : <Empty description="No activity yet" />)}
    </Drawer>
  );
}
