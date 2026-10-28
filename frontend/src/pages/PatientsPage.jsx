// Patients list with search by name or ID, a filter bar (city, age group, area, email) and "Sort by", plus actions to view,
// edit and create patients. Search runs on the backend 300 ms after the user stops typing (debounce), so we don't
// call the API on every key; sorting and filters then work on the loaded list in the browser.
// Viewing a patient calls the backend (GET /patients/:id), which records an audit entry.
// Admins also get "Activity", which opens that patient's audit history in a side drawer.
import { useCallback, useEffect, useState } from 'react';
import { App, Avatar, Button, Card, Descriptions, Input, Modal, Select, Space, Table, Typography } from 'antd';
import { EditOutlined, EyeOutlined, HistoryOutlined, PlusOutlined, SearchOutlined, TeamOutlined, SmileOutlined, UserOutlined, HeartOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api, { errorMessage } from '../api/client';
import { getSession } from '../api/session';
import PageHeader from '../components/PageHeader';
import PatientFormModal from '../components/PatientFormModal';
import PatientActivityDrawer from '../components/PatientActivityDrawer';
import FilterBar from '../components/FilterBar';
import StatCard from '../components/StatCard';
import StatRow from '../components/StatRow';
import { colors } from '../theme';

function initials(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const age = (p) => dayjs().diff(p.dateOfBirth, 'year');
const added = (p) => dayjs(p.createdAt).valueOf();

const SORTS = {
  id: { label: 'Patient ID', compare: (a, b) => a.patientId.localeCompare(b.patientId) },
  newest: { label: 'Newest added first', compare: (a, b) => added(b) - added(a) || b.patientId.localeCompare(a.patientId) },
  oldest: { label: 'Oldest added first', compare: (a, b) => added(a) - added(b) || a.patientId.localeCompare(b.patientId) },
  nameAz: { label: 'Name: A to Z', compare: (a, b) => a.name.localeCompare(b.name) },
  nameZa: { label: 'Name: Z to A', compare: (a, b) => b.name.localeCompare(a.name) },
  youngest: { label: 'Age: youngest first', compare: (a, b) => dayjs(b.dateOfBirth).valueOf() - dayjs(a.dateOfBirth).valueOf() },
  eldest: { label: 'Age: oldest first', compare: (a, b) => dayjs(a.dateOfBirth).valueOf() - dayjs(b.dateOfBirth).valueOf() },
};

const AGE_GROUPS = {
  child: { label: 'Children (under 18)', test: (years) => years < 18 },
  adult: { label: 'Adults (18–59)', test: (years) => years >= 18 && years < 60 },
  senior: { label: 'Seniors (60+)', test: (years) => years >= 60 },
};

// "12 MG Road, Hyderabad" -> area "MG Road", city "Hyderabad". A trailing PIN code ("..., Hyderabad, 500068") is skipped.
function areaOf(patient) {
  return (patient.address || '')
    .split(',')[0]
    .replace(/^\d+\s*/, '')
    .trim();
}

function cityOf(patient) {
  const parts = (patient.address || '')
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part && !/^\d+$/.test(part));
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

const NO_FILTERS = { city: null, ageGroup: null, area: null, email: null };

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [activityFor, setActivityFor] = useState(null);
  const [filters, setFilters] = useState(NO_FILTERS);
  const [sortBy, setSortBy] = useState('id');
  const { message } = App.useApp();
  const isAdmin = getSession()?.user?.role === 'admin';

  const loadPatients = useCallback(
    async (term) => {
      setLoading(true);
      try {
        const { data } = await api.get('/patients', { params: { search: term || undefined } });
        setPatients(data);
      } catch (err) {
        message.error(errorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [message],
  );

  useEffect(() => {
    const timer = setTimeout(() => loadPatients(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search, loadPatients]);

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
          <div>
            <Typography.Text strong>{p.name}</Typography.Text>
            <br />
            <Typography.Text type="secondary">{p.patientId}</Typography.Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Date of birth',
      dataIndex: 'dateOfBirth',
      render: (value) => (
        <>
          {dayjs(value).format('DD MMM YYYY')}
          <Typography.Text type="secondary"> · {dayjs().diff(value, 'year')} yrs</Typography.Text>
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
  const visible = patients
    .filter((p) => !filters.city || cityOf(p) === filters.city)
    .filter((p) => !filters.ageGroup || AGE_GROUPS[filters.ageGroup].test(age(p)))
    .filter((p) => !filters.area || areaOf(p) === filters.area)
    .filter((p) => !filters.email || (filters.email === 'yes') === Boolean(p.email))
    .sort(SORTS[sortBy].compare);

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
        <StatCard icon={<SmileOutlined />} label="Children (under 18)" value={ages.filter((age) => age < 18).length} color={colors.info} />
        <StatCard icon={<UserOutlined />} label="Adults (18–59)" value={ages.filter((age) => age >= 18 && age < 60).length} color={colors.accent} />
        <StatCard icon={<HeartOutlined />} label="Seniors (60+)" value={ages.filter((age) => age >= 60).length} color={colors.ai} />
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
          loadPatients(search.trim());
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
