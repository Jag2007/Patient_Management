// Patients list with search by name or ID, plus buttons to view, edit and create patients.
// Viewing a patient calls the backend (GET /patients/:id), which records an audit entry.
import { useEffect, useState } from 'react';
import { App, Button, Descriptions, Input, Modal, Space, Table, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api, { errorMessage } from '../api/client';
import PatientFormModal from '../components/PatientFormModal';

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const { message } = App.useApp();

  async function loadPatients(term = search) {
    setLoading(true);
    try {
      const { data } = await api.get('/patients', { params: { search: term || undefined } });
      setPatients(data);
    } catch (err) {
      message.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPatients();
  }, []);

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
    { title: 'Patient ID', dataIndex: 'patientId', width: 110 },
    { title: 'Name', dataIndex: 'name' },
    { title: 'Date of birth', dataIndex: 'dateOfBirth', render: (value) => dayjs(value).format('DD MMM YYYY') },
    { title: 'Phone', dataIndex: 'phone' },
    { title: 'Email', dataIndex: 'email' },
    {
      title: 'Actions',
      width: 150,
      render: (_, patient) => (
        <Space>
          <Button size="small" onClick={() => viewPatient(patient.patientId)}>
            View
          </Button>
          <Button size="small" onClick={() => openForm(patient)}>
            Edit
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Patients
        </Typography.Title>
        <Space wrap>
          <Input.Search
            placeholder="Search by name or ID (e.g. P-0003)"
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={(term) => loadPatients(term)}
            style={{ width: 300 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>
            New patient
          </Button>
        </Space>
      </div>

      <Table rowKey="_id" columns={columns} dataSource={patients} loading={loading} scroll={{ x: true }} />

      <PatientFormModal
        open={formOpen}
        patient={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          loadPatients();
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
    </>
  );
}
