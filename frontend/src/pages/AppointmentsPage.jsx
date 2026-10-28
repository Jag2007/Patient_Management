// Appointments list with status tags, a "New appointment" form, and a Cancel button.
// Cancel asks "Are you sure?" first; the backend then cancels atomically, so double clicks are safe.
import { useEffect, useState } from 'react';
import { App, Button, Popconfirm, Table, Tag, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api, { errorMessage } from '../api/client';
import AppointmentFormModal from '../components/AppointmentFormModal';

const STATUS_COLORS = { scheduled: 'blue', completed: 'green', cancelled: 'red' };

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
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

  const columns = [
    { title: 'Date and time', dataIndex: 'dateTime', render: (value) => dayjs(value).format('DD MMM YYYY, HH:mm') },
    { title: 'Patient', render: (_, a) => `${a.patient?.patientId} - ${a.patient?.name}` },
    { title: 'Clinician', dataIndex: 'clinician' },
    { title: 'Reason', dataIndex: 'reason' },
    { title: 'Status', dataIndex: 'status', render: (status) => <Tag color={STATUS_COLORS[status]}>{status}</Tag> },
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
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Appointments
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>
          New appointment
        </Button>
      </div>

      <Table rowKey="_id" columns={columns} dataSource={appointments} loading={loading} scroll={{ x: true }} />

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
