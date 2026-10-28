// Page frame shown after login: a hospital-style left sidebar (brand, menu, signed-in user, logout)
// and the page content, which fades in on every page change. On small screens the sidebar collapses.
// The Documents, Audit Log and Staff menu items are shown only to admins; this is for convenience, not security.
// Pages load on demand: a small spinner shows while a page's code arrives, and the rest are preloaded when idle.
import { Suspense, useEffect } from 'react';
import { Avatar, Button, Layout, Menu, Popconfirm, Spin, Typography } from 'antd';
import { AuditOutlined, CalendarOutlined, FileTextOutlined, IdcardOutlined, LogoutOutlined, MessageOutlined, TeamOutlined } from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { getSession, clearSession } from '../api/session';
import { colors } from '../theme';
import BrandMark from './BrandMark';
import { preloadPages } from '../pages/pageLoaders';

const { Sider, Content } = Layout;

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = getSession();

  useEffect(() => {
    const adminPages = user.role === 'admin' ? ['documents', 'auditLogs', 'staff'] : [];
    preloadPages(['patients', 'appointments', 'assistant', ...adminPages]);
  }, [user.role]);

  const items = [
    { key: '/patients', label: 'Patients', icon: <TeamOutlined /> },
    { key: '/appointments', label: 'Appointments', icon: <CalendarOutlined /> },
    { key: '/assistant', label: 'AI Assistant', icon: <MessageOutlined /> },
    ...(user.role === 'admin'
      ? [
          { key: '/documents', label: 'Documents', icon: <FileTextOutlined /> },
          { key: '/audit-logs', label: 'Audit Log', icon: <AuditOutlined /> },
          { key: '/staff', label: 'Staff', icon: <IdcardOutlined /> },
        ]
      : []),
  ];

  function logout() {
    clearSession();
    navigate('/login', { replace: true });
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={248} breakpoint="lg" collapsedWidth={0} zeroWidthTriggerStyle={{ top: 14 }} style={{ position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '24px 20px 28px' }}>
            <BrandMark />
            <div>
              <Typography.Text strong style={{ color: '#fff', fontSize: 15, display: 'block', lineHeight: 1.2 }}>
                Patient Management
              </Typography.Text>
              <Typography.Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>Clinic staff portal</Typography.Text>
            </div>
          </div>

          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={items}
            onClick={({ key }) => navigate(key)}
            style={{ padding: '0 12px', borderInlineEnd: 'none', flex: 1 }}
          />

          <div style={{ margin: 12, padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Avatar style={{ background: colors.accent, fontWeight: 700 }}>{user.username[0].toUpperCase()}</Avatar>
              <div style={{ lineHeight: 1.25 }}>
                <Typography.Text style={{ color: '#fff', display: 'block' }}>{user.username}</Typography.Text>
                <Typography.Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, textTransform: 'capitalize' }}>
                  {user.role === user.username ? 'Signed in' : user.role}
                </Typography.Text>
              </div>
            </div>
            <Popconfirm
              title="Log out?"
              description="Are you sure you want to log out?"
              okText="Log out"
              cancelText="Stay"
              placement="topLeft"
              onConfirm={logout}
            >
              <Button block icon={<LogoutOutlined />} style={{ background: 'transparent', color: '#fff', borderColor: 'rgba(255,255,255,0.25)' }}>
                Logout
              </Button>
            </Popconfirm>
          </div>
        </div>
      </Sider>

      <Layout>
        <Content className="app-content">
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            {dayjs().format('dddd, D MMMM YYYY')}
          </Typography.Text>
          <div key={location.pathname} className="page-enter" style={{ marginTop: 6 }}>
            <Suspense fallback={<Spin style={{ display: 'block', margin: '80px auto' }} />}>
              <Outlet />
            </Suspense>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
