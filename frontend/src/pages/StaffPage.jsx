// Admin-only page for managing staff logins: add a staff account, reset its password, disable/enable it, or delete it.
// Admin accounts are listed but can't be changed here. Staff never see this menu item, and the backend
// returns 403 if they call /api/users directly. A disabled account is logged out on its next request.
import { useCallback, useEffect, useState } from 'react';
import { App, Button, Card, Form, Input, Modal, Popconfirm, Space, Table, Typography } from 'antd';
import { CheckCircleOutlined, KeyOutlined, StopOutlined, TeamOutlined, UserAddOutlined, UserOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api, { errorMessage } from '../api/client';
import PageHeader from '../components/PageHeader';
import { SoftTag } from '../components/SoftTag';
import StatCard from '../components/StatCard';
import StatRow from '../components/StatRow';
import { colors } from '../theme';

// Same rules as the backend (userService.js), so mistakes show up before submitting.
const PASSWORD_RULES = [
  { required: true, message: 'Enter a password' },
  { min: 8, max: 64, message: 'Password must be 8 to 64 characters' },
  { pattern: /(?=.*[a-zA-Z])(?=.*\d)/, message: 'Use at least one letter and one number' },
];

function confirmRule({ getFieldValue }) {
  return {
    validator: (_, value) => (value === getFieldValue('password') ? Promise.resolve() : Promise.reject(new Error('Passwords do not match'))),
  };
}

function PasswordFields() {
  return (
    <>
      <Form.Item name="password" label="Password" rules={PASSWORD_RULES} extra="At least 8 characters, with a letter and a number.">
        <Input.Password autoComplete="new-password" />
      </Form.Item>
      <Form.Item name="confirm" label="Confirm password" dependencies={['password']} rules={[{ required: true, message: 'Repeat the password' }, confirmRule]}>
        <Input.Password autoComplete="new-password" />
      </Form.Item>
    </>
  );
}

export default function StaffPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [addForm] = Form.useForm();
  const [resetForm] = Form.useForm();
  const { message } = App.useApp();

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } catch (err) {
      message.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function run(action, successText) {
    setSaving(true);
    try {
      await action();
      message.success(successText);
      loadUsers();
      return true;
    } catch (err) {
      message.error(errorMessage(err));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function addStaff({ username, password }) {
    if (await run(() => api.post('/users', { username, password }), `Staff login "${username.trim().toLowerCase()}" created`)) setAdding(false);
  }

  async function resetPassword({ password }) {
    if (await run(() => api.put(`/users/${resetting._id}/password`, { password }), `Password reset for ${resetting.username}`)) setResetting(null);
  }

  const staff = users.filter((u) => u.role === 'staff');

  const columns = [
    {
      title: 'Account',
      dataIndex: 'username',
      render: (username, u) => (
        <Space>
          <UserOutlined style={{ color: colors.textMuted }} />
          <Typography.Text strong>{username}</Typography.Text>
          <SoftTag color={u.role === 'admin' ? colors.ai : colors.info}>{u.role}</SoftTag>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'active',
      render: (active) => (active ? <SoftTag color={colors.success}>Active</SoftTag> : <SoftTag color={colors.error}>Disabled</SoftTag>),
    },
    { title: 'Created', dataIndex: 'createdAt', render: (value) => dayjs(value).format('DD MMM YYYY') },
    { title: 'Last login', dataIndex: 'lastLoginAt', render: (value) => (value ? dayjs(value).format('DD MMM YYYY, HH:mm') : <Typography.Text type="secondary">Never</Typography.Text>) },
    {
      title: 'Actions',
      render: (_, u) =>
        u.role === 'admin' ? (
          <Typography.Text type="secondary">Admin accounts can't be changed here</Typography.Text>
        ) : (
          <Space size={4} wrap>
            <Button
              size="small"
              type="text"
              icon={<KeyOutlined />}
              onClick={() => {
                resetForm.resetFields();
                setResetting(u);
              }}
            >
              Reset password
            </Button>
            <Popconfirm
              title={u.active ? `Disable ${u.username}?` : `Enable ${u.username}?`}
              description={u.active ? 'They will be logged out and cannot log in until enabled again.' : 'They will be able to log in again.'}
              okText={u.active ? 'Disable' : 'Enable'}
              okButtonProps={{ danger: u.active }}
              onConfirm={() => run(() => api.patch(`/users/${u._id}/active`, { active: !u.active }), u.active ? `${u.username} disabled` : `${u.username} enabled`)}
            >
              <Button size="small" type="text" icon={u.active ? <StopOutlined /> : <CheckCircleOutlined />}>
                {u.active ? 'Disable' : 'Enable'}
              </Button>
            </Popconfirm>
            <Popconfirm
              title={`Delete ${u.username}?`}
              description="The login is removed permanently. Their past actions stay in the audit log."
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={() => run(() => api.delete(`/users/${u._id}`), `${u.username} deleted`)}
            >
              <Button size="small" type="text" danger icon={<DeleteOutlined />}>
                Delete
              </Button>
            </Popconfirm>
          </Space>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Staff"
        subtitle="Create and manage staff logins. Only admins can see this page."
        actions={
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={() => {
              addForm.resetFields();
              setAdding(true);
            }}
          >
            Add staff
          </Button>
        }
      />

      <StatRow>
        <StatCard icon={<TeamOutlined />} label="Staff accounts" value={staff.length} color={colors.primary} />
        <StatCard icon={<CheckCircleOutlined />} label="Active" value={staff.filter((u) => u.active).length} color={colors.success} />
        <StatCard icon={<StopOutlined />} label="Disabled" value={staff.filter((u) => !u.active).length} color={colors.error} />
        <StatCard icon={<UserOutlined />} label="Admins" value={users.length - staff.length} color={colors.ai} />
      </StatRow>

      <Card styles={{ body: { padding: 0 } }}>
        <Table rowKey="_id" columns={columns} dataSource={users} loading={loading} scroll={{ x: 'max-content' }} pagination={{ pageSize: 15, hideOnSinglePage: true }} />
      </Card>

      <Modal title="Add staff login" open={adding} onCancel={() => setAdding(false)} onOk={() => addForm.submit()} okText="Create login" confirmLoading={saving} destroyOnHidden>
        <Form form={addForm} layout="vertical" onFinish={addStaff}>
          <Form.Item
            name="username"
            label="Username"
            extra="3 to 30 characters: lowercase letters, numbers, dot, dash or underscore."
            rules={[
              { required: true, message: 'Enter a username' },
              { pattern: /^[a-zA-Z0-9._-]{3,30}$/, message: 'Use 3 to 30 letters, numbers, dot, dash or underscore' },
            ]}
          >
            <Input placeholder="e.g. nurse.asha" autoComplete="off" />
          </Form.Item>
          <PasswordFields />
          <Typography.Text type="secondary">New accounts always get the staff role. Share the password with the staff member privately.</Typography.Text>
        </Form>
      </Modal>

      <Modal
        title={`Reset password for ${resetting?.username}`}
        open={Boolean(resetting)}
        onCancel={() => setResetting(null)}
        onOk={() => resetForm.submit()}
        okText="Reset password"
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form form={resetForm} layout="vertical" onFinish={resetPassword}>
          <PasswordFields />
        </Form>
      </Modal>
    </>
  );
}
