// Patients list with search by name or ID, plus actions to view, edit and create patients.
// Search runs automatically 300 ms after the user stops typing (debounce), so we don't call the API on every key.
// Viewing a patient calls the backend (GET /patients/:id), which records an audit entry.
// Admins also get "Activity", which opens that patient's audit history in a side drawer.
import { useCallback, useEffect, useState } from 'react';
import { App, Avatar, Button, Card, Descriptions, Input, Modal, Space, Table, Typography } from 'antd';
import { EditOutlined, EyeOutlined, HistoryOutlined, PlusOutlined, SearchOutlined, TeamOutlined, SmileOutlined, UserOutlined, HeartOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api, { errorMessage } from '../api/client';
import { getSession } from '../api/session';
import PageHeader from '../components/PageHeader';
import PatientFormModal from '../components/PatientFormModal';
import PatientActivityDrawer from '../components/PatientActivityDrawer';
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

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [activityFor, setActivityFor] = useState(null);
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
    [message]
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

  const ages = patients.map((p) => dayjs().diff(p.dateOfBirth, 'year'));

  return (
    <>
      <PageHeader
        title="Patients"
        subtitle="Search, view and update patient records"
        actions={
          <>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Search by name or ID (e.g. P-0003)"
              allowClear
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 300 }}
            />
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

      <Card styles={{ body: { padding: 0 } }}>
        <Table rowKey="_id" columns={columns} dataSource={patients} loading={loading} scroll={{ x: 'max-content' }} pagination={{ defaultPageSize: 10, showSizeChanger: true, hideOnSinglePage: true }} />
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
