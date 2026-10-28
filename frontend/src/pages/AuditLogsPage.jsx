// Admin-only page listing audit entries: who did what to which patient, and when.
// Actions are shown as readable labels with filters (by user and activity) and sorting by time; each row shows the patient's name and ID,
// and clicking a patient opens their details and full activity.
// Staff never see this menu item, and the backend returns 403 if they call the API directly.
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Table, Typography } from 'antd';
import dayjs from 'dayjs';
import api, { errorMessage } from '../api/client';
import PageHeader from '../components/PageHeader';
import PatientActivityDrawer from '../components/PatientActivityDrawer';
import { ACTIVITY, activityInfo } from '../components/activity';
import { SoftTag } from '../components/SoftTag';

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
      sorter: (a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf(),
      defaultSortOrder: 'descend',
      sortDirections: ['descend', 'ascend', 'descend'],
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
          <SoftTag icon={info.icon} color={info.color}>
            {info.label}
          </SoftTag>
        );
      },
    },
    {
      title: 'Patient or account',
      dataIndex: 'patientId',
      render: (patientId, log) =>
        log.targetUsername ? (
          <span>
            <Typography.Text strong>{log.targetUsername}</Typography.Text>
            <br />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Staff account
            </Typography.Text>
          </span>
        ) : (
          patientId && (
            <Button type="link" style={{ padding: 0, height: 'auto', textAlign: 'left' }} onClick={() => setActivityFor(patientId)}>
              <span>
                <Typography.Text strong style={{ color: 'inherit' }}>
                  {log.patientName || 'Unknown patient'}
                </Typography.Text>
                <br />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {patientId}
                </Typography.Text>
              </span>
            </Button>
          )
        ),
    },
  ];

  return (
    <>
      <PageHeader title="Audit Log" subtitle="Every view and change to patient records, and every staff account change. Click a patient to see their details and full activity." />
      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}
      <Card styles={{ body: { padding: 0 } }}>
        <Table rowKey="_id" columns={columns} dataSource={logs} loading={loading} scroll={{ x: 'max-content' }} pagination={{ pageSize: 15, hideOnSinglePage: true }} />
      </Card>
      <PatientActivityDrawer patientId={activityFor} onClose={() => setActivityFor(null)} />
    </>
  );
}
