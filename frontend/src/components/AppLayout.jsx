// Page frame shown after login: brand, top menu, current user, and a logout button (with confirmation).
// The Audit Log menu item is shown only to admins; this is for convenience, not security.
import { Avatar, Button, Layout, Menu, Popconfirm, Tag, Typography } from 'antd';
import { AuditOutlined, CalendarOutlined, LogoutOutlined, MedicineBoxFilled, RobotOutlined, TeamOutlined } from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { getSession, clearSession } from '../api/session';
import { colors } from '../theme';

const { Header, Content } = Layout;

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = getSession();

  const items = [
    { key: '/patients', label: 'Patients', icon: <TeamOutlined /> },
    { key: '/appointments', label: 'Appointments', icon: <CalendarOutlined /> },
    { key: '/assistant', label: 'AI Assistant', icon: <RobotOutlined /> },
    ...(user.role === 'admin' ? [{ key: '/audit-logs', label: 'Audit Log', icon: <AuditOutlined /> }] : []),
  ];

  function logout() {
    clearSession();
    navigate('/login', { replace: true });
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          borderBottom: `1px solid ${colors.border}`,
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap' }}>
          <Avatar shape="square" style={{ background: colors.primary }} icon={<MedicineBoxFilled />} />
          <Typography.Text strong style={{ fontSize: 16 }}>
            Patient Management
          </Typography.Text>
        </div>
        <Menu
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={items}
          onClick={({ key }) => navigate(key)}
          style={{ flex: 1, minWidth: 0, borderBottom: 'none' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
          <Avatar style={{ background: colors.primaryTint, color: colors.primary }}>
            {user.username[0].toUpperCase()}
          </Avatar>
          <Typography.Text>{user.username}</Typography.Text>
          {user.role !== user.username && <Tag color={user.role === 'admin' ? 'gold' : 'blue'}>{user.role}</Tag>}
        </div>
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
      <Content style={{ padding: '28px 24px', maxWidth: 1200, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        <Outlet />
      </Content>
    </Layout>
  );
}
