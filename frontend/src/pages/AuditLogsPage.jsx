// Admin-only page listing audit entries: who did what to which patient, and when.
// Actions are shown as readable labels with filters; clicking a patient ID opens that patient's activity.
// Staff never see this menu item, and the backend returns 403 if they call the API directly.
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Table, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import api, { errorMessage } from '../api/client';
import PageHeader from '../components/PageHeader';
import PatientActivityDrawer from '../components/PatientActivityDrawer';
import { ACTIVITY, activityInfo } from '../components/activity';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activityFor, setActivityFor] = useState(null);

  useEffect(() => {
    api
      .get('/audit-logs')
      .then(({ data }) => setLogs(data))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const users = [...new Set(logs.map((log) => log.username))];

  const columns = [
    {
      title: 'Time',
      dataIndex: 'createdAt',
      render: (value) => (
        <>
          <Typography.Text>{dayjs(value).format('DD MMM YYYY')}</Typography.Text>
          <br />
          <Typography.Text type="secondary">{dayjs(value).format('HH:mm:ss')}</Typography.Text>
        </>
      ),
    },
    {
      title: 'User',
      dataIndex: 'username',
      filters: users.map((u) => ({ text: u, value: u })),
      onFilter: (value, log) => log.username === value,
    },
    {
      title: 'Activity',
      dataIndex: 'action',
      filters: Object.entries(ACTIVITY).map(([value, info]) => ({ text: info.label, value })),
      onFilter: (value, log) => log.action === value,
      render: (action) => {
        const info = activityInfo(action);
        return (
          <Tag icon={info.icon} color={info.color} variant="outlined">
            {info.label}
          </Tag>
        );
      },
    },
    {
      title: 'Patient',
      dataIndex: 'patientId',
      render: (patientId) =>
        patientId && (
          <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setActivityFor(patientId)}>
            {patientId}
          </Button>
        ),
    },
  ];

  return (
    <>
      <PageHeader title="Audit Log" subtitle="Every view and change to patient records. Click a patient ID to see their full activity." />
      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}
      <Card styles={{ body: { padding: 0 } }}>
        <Table rowKey="_id" columns={columns} dataSource={logs} loading={loading} scroll={{ x: true }} pagination={{ pageSize: 15, hideOnSinglePage: true }} />
      </Card>
      <PatientActivityDrawer patientId={activityFor} onClose={() => setActivityFor(null)} />
    </>
  );
}
