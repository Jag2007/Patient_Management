// Appointments list with status tags and filters, a "New appointment" form, and a Cancel button.
// Cancel asks "Are you sure?" first; the backend then cancels atomically, so double clicks are safe.
import { useCallback, useEffect, useState } from 'react';
import { App, Button, Card, Popconfirm, Segmented, Table, Tag, Typography } from 'antd';
import { CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api, { errorMessage } from '../api/client';
import PageHeader from '../components/PageHeader';
import AppointmentFormModal from '../components/AppointmentFormModal';
import StatCard from '../components/StatCard';
import StatRow from '../components/StatRow';
import { colors } from '../theme';

const STATUS_COLORS = { scheduled: 'processing', completed: 'success', cancelled: 'error' };
const FILTERS = ['all', 'scheduled', 'completed', 'cancelled'];

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const { message } = App.useApp();

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/appointments');
      setAppointments(data);
    } catch (err) {
      message.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

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
  const countByStatus = (status) => appointments.filter((a) => a.status === status).length;
  const todayCount = appointments.filter((a) => a.status === 'scheduled' && dayjs(a.dateTime).isSame(dayjs(), 'day')).length;

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
        subtitle="Book, track and cancel patient appointments"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>
            New appointment
          </Button>
        }
      />

      <StatRow>
        <StatCard icon={<ClockCircleOutlined />} label="Today" value={todayCount} color={colors.accent} />
        <StatCard icon={<CalendarOutlined />} label="Upcoming" value={countByStatus('scheduled')} color={colors.info} />
        <StatCard icon={<CheckCircleOutlined />} label="Completed" value={countByStatus('completed')} color={colors.success} />
        <StatCard icon={<CloseCircleOutlined />} label="Cancelled" value={countByStatus('cancelled')} color={colors.error} />
      </StatRow>

      <Segmented
        options={FILTERS.map((f) => ({ value: f, label: f[0].toUpperCase() + f.slice(1) }))}
        value={statusFilter}
        onChange={setStatusFilter}
        style={{ marginBottom: 16 }}
      />

      <Card styles={{ body: { padding: 0 } }}>
        <Table rowKey="_id" columns={columns} dataSource={visible} loading={loading} scroll={{ x: 'max-content' }} pagination={{ defaultPageSize: 10, showSizeChanger: true, hideOnSinglePage: true }} />
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
