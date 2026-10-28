// Patients page: search, filter, view, create and edit patients via /api/patients.
// Search runs on the backend; filters and sorting run in the browser (see patientHelpers.js).
import { useState } from 'react';
import { App, Avatar, Button, Card, Descriptions, Input, Modal, Select, Space, Table, Typography } from 'antd';
import { EditOutlined, EyeOutlined, HistoryOutlined, PlusOutlined, SearchOutlined, TeamOutlined, SmileOutlined, UserOutlined, HeartOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api, { errorMessage } from '../api/client';
import { getSession } from '../api/session';
import useApi from '../api/useApi';
import PageHeader from '../components/PageHeader';
import PatientFormModal from '../components/PatientFormModal';
import PatientActivityDrawer from '../components/PatientActivityDrawer';
import FilterBar from '../components/FilterBar';
import { PersonCell } from '../components/cells';
import StatCard from '../components/StatCard';
import StatRow from '../components/StatRow';
import { colors } from '../theme';
import { AGE_GROUPS, NO_FILTERS, SORTS, age, areaOf, cityOf, filterPatients, initials } from './patientHelpers';

export default function PatientsPage() {
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [activityFor, setActivityFor] = useState(null);
  const [filters, setFilters] = useState(NO_FILTERS);
  const [sortBy, setSortBy] = useState('id');
  const { message } = App.useApp();
  const isAdmin = getSession()?.user?.role === 'admin';

  // Wait 300 ms after typing stops before searching, but load straight away when the box is empty.
  const term = search.trim();
  const { data: patients, loading, reload } = useApi('/patients', { params: { search: term || undefined }, delay: term ? 300 : 0 });

  async function viewPatient(patientId) {
    try {
      const { data } = await api.get(`/patients/${patientId}`);
      setViewing(data);
    } catch (err) {
      message.error(errorMessage(err));
    }
  }

  function openForm(patient = null) {
    setEditing(patient);
    setFormOpen(true);
  }

  const columns = [
    {
      title: 'Patient',
      render: (_, p) => (
        <Space>
          <Avatar style={{ background: colors.primarySoft, color: colors.primary }}>{initials(p.name)}</Avatar>
          <PersonCell name={p.name} id={p.patientId} strong />
        </Space>
      ),
    },
    {
      title: 'Date of birth',
      dataIndex: 'dateOfBirth',
      render: (value, p) => (
        <>
          {dayjs(value).format('DD MMM YYYY')}
          <Typography.Text type="secondary"> · {age(p)} yrs</Typography.Text>
        </>
      ),
    },
    { title: 'Phone', dataIndex: 'phone' },
    { title: 'Email', dataIndex: 'email', render: (value) => value || '-' },
    {
      title: 'Actions',
      render: (_, patient) => (
        <Space size={4} wrap>
          <Button size="small" type="text" icon={<EyeOutlined />} onClick={() => viewPatient(patient.patientId)}>
            View
          </Button>
          <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openForm(patient)}>
            Edit
          </Button>
          {isAdmin && (
            <Button size="small" type="text" icon={<HistoryOutlined />} onClick={() => setActivityFor(patient.patientId)}>
              Activity
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const ages = patients.map(age);
  const countAges = (group) => ages.filter(AGE_GROUPS[group].test).length;
  const setFilter = (name) => (value) => setFilters((prev) => ({ ...prev, [name]: value ?? null }));
  const cities = [...new Set(patients.map(cityOf).filter(Boolean))].sort();
  const areas = [
    ...new Set(
      patients
        .filter((p) => !filters.city || cityOf(p) === filters.city)
        .map(areaOf)
        .filter(Boolean),
    ),
  ].sort();
  const filtersActive = Object.values(filters).some(Boolean);
  const visible = filterPatients(patients, filters).sort(SORTS[sortBy].compare);

  return (
    <>
      <PageHeader
        title="Patients"
        subtitle="Search, view and update patient records"
        actions={
          <>
            <Input prefix={<SearchOutlined />} placeholder="Search by name or ID (e.g. P-0003)" allowClear value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 300 }} />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>
              New patient
            </Button>
          </>
        }
      />

      <StatRow>
        <StatCard icon={<TeamOutlined />} label={search ? 'Matching patients' : 'Total patients'} value={patients.length} color={colors.primary} />
        <StatCard icon={<SmileOutlined />} label={AGE_GROUPS.child.label} value={countAges('child')} color={colors.info} />
        <StatCard icon={<UserOutlined />} label={AGE_GROUPS.adult.label} value={countAges('adult')} color={colors.accent} />
        <StatCard icon={<HeartOutlined />} label={AGE_GROUPS.senior.label} value={countAges('senior')} color={colors.ai} />
      </StatRow>

      <FilterBar shown={visible.length} total={patients.length} filtersActive={filtersActive} onClear={() => setFilters(NO_FILTERS)}>
        <Select
          placeholder="All cities"
          allowClear
          value={filters.city}
          onChange={(value) => setFilters((prev) => ({ ...prev, city: value ?? null, area: null }))}
          options={cities.map((city) => ({ value: city, label: city }))}
          style={{ width: 150 }}
        />
        <Select
          placeholder="All ages"
          allowClear
          value={filters.ageGroup}
          onChange={setFilter('ageGroup')}
          options={Object.entries(AGE_GROUPS).map(([value, group]) => ({ value, label: group.label }))}
          style={{ width: 190 }}
        />
        <Select placeholder="All areas" allowClear showSearch value={filters.area} onChange={setFilter('area')} options={areas.map((area) => ({ value: area, label: area }))} style={{ width: 170 }} />
        <Select
          placeholder="Email: any"
          allowClear
          value={filters.email}
          onChange={setFilter('email')}
          options={[
            { value: 'yes', label: 'Has email' },
            { value: 'no', label: 'No email' },
          ]}
          style={{ width: 140 }}
        />
        <Select value={sortBy} onChange={setSortBy} prefix="Sort by" options={Object.entries(SORTS).map(([value, sort]) => ({ value, label: sort.label }))} style={{ width: 250 }} />
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

      <PatientFormModal
        open={formOpen}
        patient={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          reload();
        }}
      />

      <Modal title="Patient details" open={Boolean(viewing)} onCancel={() => setViewing(null)} footer={null}>
        {viewing && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Patient ID">{viewing.patientId}</Descriptions.Item>
            <Descriptions.Item label="Name">{viewing.name}</Descriptions.Item>
            <Descriptions.Item label="Date of birth">{dayjs(viewing.dateOfBirth).format('DD MMM YYYY')}</Descriptions.Item>
            <Descriptions.Item label="Phone">{viewing.phone}</Descriptions.Item>
            <Descriptions.Item label="Email">{viewing.email || '-'}</Descriptions.Item>
            <Descriptions.Item label="Address">{viewing.address || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      <PatientActivityDrawer patientId={activityFor} onClose={() => setActivityFor(null)} />
    </>
  );
}
