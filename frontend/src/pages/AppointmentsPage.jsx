// Appointments list with status tags and filters, a "New appointment" form, and a Cancel button.
// Cancel asks "Are you sure?" first; the backend then cancels atomically, so double clicks are safe.
import { useEffect, useState } from 'react';
import { App, Button, Card, Popconfirm, Segmented, Table, Tag, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api, { errorMessage } from '../api/client';
import PageHeader from '../components/PageHeader';
import AppointmentFormModal from '../components/AppointmentFormModal';

const STATUS_COLORS = { scheduled: 'processing', completed: 'success', cancelled: 'error' };
const FILTERS = ['all', 'scheduled', 'completed', 'cancelled'];

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const { message } = App.useApp();

  async function loadAppointments() {
    setLoading(true);
    try {
      const { data } = await api.get('/appointments');
      setAppointments(data);
    } catch (err) {
      message.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAppointments();
  }, []);

  async function cancelAppointment(id) {
    try {
      await api.patch(`/appointments/${id}/cancel`);
      message.success('Appointment cancelled');
    } catch (err) {
      message.error(errorMessage(err));
    }
    loadAppointments();
  }

  const visible = statusFilter === 'all' ? appointments : appointments.filter((a) => a.status === statusFilter);

  const columns = [
    {
      title: 'Date and time',
      dataIndex: 'dateTime',
      render: (value) => (
        <>
          <Typography.Text strong>{dayjs(value).format('DD MMM YYYY')}</Typography.Text>
          <br />
          <Typography.Text type="secondary">{dayjs(value).format('ddd, HH:mm')}</Typography.Text>
        </>
      ),
    },
    {
      title: 'Patient',
      render: (_, a) => (
        <>
          <Typography.Text>{a.patient?.name}</Typography.Text>
          <br />
          <Typography.Text type="secondary">{a.patient?.patientId}</Typography.Text>
        </>
      ),
    },
    { title: 'Clinician', dataIndex: 'clinician' },
    { title: 'Reason', dataIndex: 'reason' },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (status) => (
        <Tag color={STATUS_COLORS[status]} style={{ textTransform: 'capitalize' }}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      render: (_, a) =>
        a.status === 'scheduled' && (
          <Popconfirm
            title="Cancel this appointment?"
            description="Are you sure? This cannot be undone."
            okText="Yes, cancel"
            cancelText="No"
            onConfirm={() => cancelAppointment(a._id)}
          >
            <Button size="small" danger>
              Cancel
            </Button>
          </Popconfirm>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Appointments"
        subtitle={`${appointments.filter((a) => a.status === 'scheduled').length} upcoming`}
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>
            New appointment
          </Button>
        }
      />

      <Segmented
        options={FILTERS.map((f) => ({ value: f, label: f[0].toUpperCase() + f.slice(1) }))}
        value={statusFilter}
        onChange={setStatusFilter}
        style={{ marginBottom: 16 }}
      />

      <Card styles={{ body: { padding: 0 } }}>
        <Table rowKey="_id" columns={columns} dataSource={visible} loading={loading} scroll={{ x: true }} pagination={{ pageSize: 10, hideOnSinglePage: true }} />
      </Card>

      <AppointmentFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          loadAppointments();
        }}
      />
    </>
  );
}
