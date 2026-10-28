// Side drawer (admin only) for one patient: their details at the top, then their activity history as a timeline
// (who viewed, edited, booked or cancelled, and when). Opened from the Patients page or by clicking a patient in the Audit Log.
// Loads GET /patients/:id (which is itself audited as a view) and then GET /audit-logs?patientId=.
import { useEffect, useState } from 'react';
import { Alert, Avatar, Descriptions, Divider, Drawer, Empty, Spin, Timeline, Typography } from 'antd';
import dayjs from 'dayjs';
import api, { errorMessage } from '../api/client';
import { activityInfo } from './activity';
import { colors } from '../theme';

export default function PatientActivityDrawer({ patientId, onClose }) {
  const [patient, setPatient] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!patientId) return;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const { data: details } = await api.get(`/patients/${patientId}`);
        const { data: activity } = await api.get('/audit-logs', { params: { patientId } });
        setPatient(details);
        setLogs(activity);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
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
    <Drawer title="Patient details" open={Boolean(patientId)} onClose={onClose} size={440}>
      {error && <Alert type="error" title={error} showIcon />}
      {loading && <Spin />}
      {!loading && !error && patient && (
        <div className="page-enter">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <Avatar size={52} style={{ background: colors.primarySoft, color: colors.primary, fontWeight: 700, fontSize: 18 }}>
              {patient.name
                .split(' ')
                .map((part) => part[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </Avatar>
            <div>
              <Typography.Title level={4} style={{ margin: 0 }}>
                {patient.name}
              </Typography.Title>
              <Typography.Text type="secondary">
                {patient.patientId} · {dayjs().diff(patient.dateOfBirth, 'year')} years
              </Typography.Text>
            </div>
          </div>

          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Date of birth">{dayjs(patient.dateOfBirth).format('DD MMM YYYY')}</Descriptions.Item>
            <Descriptions.Item label="Phone">{patient.phone}</Descriptions.Item>
            <Descriptions.Item label="Email">{patient.email || '-'}</Descriptions.Item>
            <Descriptions.Item label="Address">{patient.address || '-'}</Descriptions.Item>
          </Descriptions>

          <Divider titlePlacement="start" style={{ marginTop: 28 }}>
            Activity
          </Divider>
          {items.length ? <Timeline items={items} /> : <Empty description="No activity yet" />}
        </div>
      )}
    </Drawer>
  );
}
