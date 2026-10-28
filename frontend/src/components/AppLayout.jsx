// Page frame shown after login: top menu, current user and role, and a logout button (with confirmation).
// The Audit Log menu item is shown only to admins; this is for convenience, not security.
import { Layout, Menu, Button, Popconfirm, Tag, Typography } from 'antd';
import { LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { getSession, clearSession } from '../api/session';

const { Header, Content } = Layout;

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = getSession();

  const items = [
    { key: '/patients', label: 'Patients' },
    { key: '/appointments', label: 'Appointments' },
    ...(user.role === 'admin' ? [{ key: '/audit-logs', label: 'Audit Log' }] : []),
  ];

  function logout() {
    clearSession();
    navigate('/login', { replace: true });
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <Typography.Text strong style={{ color: '#fff', fontSize: 16, whiteSpace: 'nowrap' }}>
          Patient Management
        </Typography.Text>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={items}
          onClick={({ key }) => navigate(key)}
          style={{ flex: 1, minWidth: 0 }}
        />
        <Typography.Text style={{ color: '#fff', whiteSpace: 'nowrap' }}>
          <UserOutlined /> {user.username}
        </Typography.Text>
        {user.role !== user.username && <Tag color={user.role === 'admin' ? 'gold' : 'blue'}>{user.role}</Tag>}
        <Popconfirm
          title="Log out?"
          description="Are you sure you want to log out?"
          okText="Log out"
          cancelText="Stay"
          placement="bottomRight"
          onConfirm={logout}
        >
          <Button icon={<LogoutOutlined />}>Logout</Button>
        </Popconfirm>
      </Header>
      <Content style={{ padding: 24, maxWidth: 1200, width: '100%', margin: '0 auto' }}>
        <Outlet />
      </Content>
    </Layout>
  );
}
