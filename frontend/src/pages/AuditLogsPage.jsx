// Audit Log page (admin only): who viewed or changed which patient or staff account, and when, from /api/audit-logs.
// Clicking a patient opens PatientActivityDrawer with their full history.
import { useState } from 'react';
import { Alert, Button, Card, Table, Typography } from 'antd';
import dayjs from 'dayjs';
import useApi from '../api/useApi';
import PageHeader from '../components/PageHeader';
import PatientActivityDrawer from '../components/PatientActivityDrawer';
import { ACTIVITY, activityInfo } from '../components/activity';
import { SoftTag } from '../components/SoftTag';
import { DateCell } from '../components/cells';

export default function AuditLogsPage() {
  const { data: logs, loading, error } = useApi('/audit-logs', { toast: false });
  const [activityFor, setActivityFor] = useState(null);

  const users = [...new Set(logs.map((log) => log.username))];

  const columns = [
    {
      title: 'Time',
      dataIndex: 'createdAt',
      sorter: (a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf(),
      defaultSortOrder: 'descend',
      // Only flip between newest and oldest, never back to unsorted.
      sortDirections: ['descend', 'ascend', 'descend'],
      render: (value) => <DateCell value={value} timeFormat="HH:mm:ss" />,
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
