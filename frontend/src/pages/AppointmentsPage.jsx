// Appointments list with status tags, a filter bar (search, status, clinician, date range) and "Sort by",
// a "New appointment" form, and Edit / Cancel actions for scheduled appointments.
// Cancel opens a confirmation showing exactly which appointment will be cancelled. The backend then cancels it
// in one transaction (status change + audit entry together), and only if it is still scheduled, so double clicks are safe.
import { useCallback, useEffect, useState } from 'react';
import { App, Button, Card, DatePicker, Input, Segmented, Select, Space, Table, Typography } from 'antd';
import { CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, EditOutlined, PlusOutlined, SafetyCertificateOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api, { errorMessage } from '../api/client';
import PageHeader from '../components/PageHeader';
import AppointmentFormModal from '../components/AppointmentFormModal';
import FilterBar from '../components/FilterBar';
import { StatusTag } from '../components/SoftTag';
import StatCard from '../components/StatCard';
import StatRow from '../components/StatRow';
import { colors } from '../theme';

const STATUSES = ['all', 'scheduled', 'completed', 'cancelled'];

const time = (a) => dayjs(a.dateTime).valueOf();
const byText = (field) => (a, b) => field(a).localeCompare(field(b));

const SORTS = {
  newest: { label: 'Date: newest first', compare: (a, b) => time(b) - time(a) },
  oldest: { label: 'Date: oldest first', compare: (a, b) => time(a) - time(b) },
  patientAz: { label: 'Patient name: A to Z', compare: byText((a) => a.patient?.name || '') },
  patientZa: { label: 'Patient name: Z to A', compare: (a, b) => byText((x) => x.patient?.name || '')(b, a) },
  clinician: { label: 'Clinician: A to Z', compare: byText((a) => a.clinician) },
};

const NO_FILTERS = { status: 'all', search: '', clinician: null, dates: null };

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filters, setFilters] = useState(NO_FILTERS);
  const [sortBy, setSortBy] = useState('newest');
  const { message, modal } = App.useApp();

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

  const setFilter = (name) => (value) => setFilters((prev) => ({ ...prev, [name]: value }));

  function openForm(appointment = null) {
    setEditing(appointment);
    setFormOpen(true);
  }

  function confirmCancel(a) {
    modal.confirm({
      title: 'Cancel this appointment?',
      icon: <CloseCircleOutlined style={{ color: colors.error }} />,
      content: (
        <>
          <Typography.Paragraph style={{ marginBottom: 8 }}>
            <strong>{a.patient?.name}</strong> ({a.patient?.patientId}) with <strong>{a.clinician}</strong>
            <br />
            {dayjs(a.dateTime).format('ddd, DD MMM YYYY [at] HH:mm')} · {a.reason}
          </Typography.Paragraph>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            <SafetyCertificateOutlined /> Transaction-safe: the cancellation and its audit entry are saved together, and an appointment can only be cancelled once. This cannot be undone.
          </Typography.Text>
        </>
      ),
      okText: 'Yes, cancel appointment',
      okButtonProps: { danger: true },
      cancelText: 'Keep appointment',
      onOk: () => cancelAppointment(a._id),
    });
  }

  async function cancelAppointment(id) {
    try {
      await api.patch(`/appointments/${id}/cancel`);
      message.success('Appointment cancelled');
    } catch (err) {
      message.error(errorMessage(err));
    }
    loadAppointments();
  }

  const term = filters.search.trim().toLowerCase();
  const visible = appointments
    .filter((a) => filters.status === 'all' || a.status === filters.status)
    .filter((a) => !filters.clinician || a.clinician === filters.clinician)
    .filter((a) => !filters.dates || (!dayjs(a.dateTime).isBefore(filters.dates[0], 'day') && !dayjs(a.dateTime).isAfter(filters.dates[1], 'day')))
    .filter((a) => !term || [a.patient?.name, a.patient?.patientId, a.reason].some((value) => value?.toLowerCase().includes(term)))
    .sort(SORTS[sortBy].compare);

  const clinicians = [...new Set(appointments.map((a) => a.clinician))].sort();
  const filtersActive = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS);
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
    { title: 'Status', dataIndex: 'status', render: (status) => <StatusTag status={status} /> },
    {
      title: 'Actions',
      render: (_, a) =>
        a.status === 'scheduled' && (
          <Space size={4}>
            <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openForm(a)}>
              Edit
            </Button>
            <Button size="small" danger onClick={() => confirmCancel(a)}>
              Cancel
            </Button>
          </Space>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Appointments"
        subtitle="Book, edit, track and cancel patient appointments"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>
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

      <Segmented options={STATUSES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))} value={filters.status} onChange={setFilter('status')} style={{ marginBottom: 12 }} />

      <FilterBar shown={visible.length} total={appointments.length} filtersActive={filtersActive} onClear={() => setFilters(NO_FILTERS)}>
        <Input prefix={<SearchOutlined />} placeholder="Patient, ID or reason" allowClear value={filters.search} onChange={(e) => setFilter('search')(e.target.value)} style={{ width: 220 }} />
        <Select
          placeholder="All clinicians"
          allowClear
          value={filters.clinician}
          onChange={(value) => setFilter('clinician')(value ?? null)}
          options={clinicians.map((c) => ({ value: c, label: c }))}
          style={{ width: 180 }}
        />
        <DatePicker.RangePicker value={filters.dates} onChange={setFilter('dates')} format="DD MMM YYYY" allowEmpty={[false, false]} />
        <Select value={sortBy} onChange={setSortBy} prefix="Sort by" options={Object.entries(SORTS).map(([value, sort]) => ({ value, label: sort.label }))} style={{ width: 260 }} />
      </FilterBar>

      <Card styles={{ body: { padding: 0 } }}>
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={visible}
          loading={loading}
          scroll={{ x: 'max-content' }}
          pagination={{ defaultPageSize: 10, showSizeChanger: true, hideOnSinglePage: true }}
        />
      </Card>

      <AppointmentFormModal
        open={formOpen}
        appointment={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          loadAppointments();
        }}
      />
    </>
  );
}
