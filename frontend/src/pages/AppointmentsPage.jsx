// Appointments page: lists, filters, books, edits and cancels appointments via /api/appointments.
// Filters and sort options live in appointmentHelpers.js; the backend makes each cancel a single transaction.
import { useState } from 'react';
import { App, Button, Card, DatePicker, Input, Segmented, Select, Space, Table, Typography } from 'antd';
import { CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, EditOutlined, PlusOutlined, SafetyCertificateOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api, { errorMessage } from '../api/client';
import useApi from '../api/useApi';
import PageHeader from '../components/PageHeader';
import AppointmentFormModal from '../components/AppointmentFormModal';
import FilterBar from '../components/FilterBar';
import { DateCell, PersonCell } from '../components/cells';
import { StatusTag } from '../components/SoftTag';
import StatCard from '../components/StatCard';
import StatRow from '../components/StatRow';
import { colors } from '../theme';
import { NO_FILTERS, SORTS, STATUSES, filterAppointments } from './appointmentHelpers';

export default function AppointmentsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filters, setFilters] = useState(NO_FILTERS);
  const [sortBy, setSortBy] = useState('newest');
  const { message, modal } = App.useApp();
  const { data: appointments, loading, reload } = useApi('/appointments');

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
    reload();
  }

  const visible = filterAppointments(appointments, filters).sort(SORTS[sortBy].compare);

  const clinicians = [...new Set(appointments.map((a) => a.clinician))].sort();
  const filtersActive = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS);
  const countByStatus = (status) => appointments.filter((a) => a.status === status).length;
  const todayCount = appointments.filter((a) => a.status === 'scheduled' && dayjs(a.dateTime).isSame(dayjs(), 'day')).length;

  const columns = [
    {
      title: 'Date and time',
      dataIndex: 'dateTime',
      render: (value) => <DateCell value={value} timeFormat="ddd, HH:mm" strong />,
    },
    {
      title: 'Patient',
      render: (_, a) => <PersonCell name={a.patient?.name} id={a.patient?.patientId} />,
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
          reload();
        }}
      />
    </>
  );
}
