// Admin-only page listing the latest audit entries: who did what to which patient, and when.
// Staff never see this menu item, and the backend returns 403 if they call the API directly.
import { useEffect, useState } from 'react';
import { Alert, Table, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import api, { errorMessage } from '../api/client';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/audit-logs')
      .then(({ data }) => setLogs(data))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { title: 'Time', dataIndex: 'createdAt', render: (value) => dayjs(value).format('DD MMM YYYY, HH:mm:ss') },
    { title: 'User', dataIndex: 'username' },
    { title: 'Action', dataIndex: 'action', render: (action) => <Tag>{action}</Tag> },
    { title: 'Patient ID', dataIndex: 'patientId' },
  ];

  return (
    <>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Audit Log
      </Typography.Title>
      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}
      <Table rowKey="_id" columns={columns} dataSource={logs} loading={loading} scroll={{ x: true }} />
    </>
  );
}
