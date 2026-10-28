// Login page: a short product intro on the left and the login form on the right.
// Sends username and password to the backend and stores the returned token.
// Any backend error (e.g. "Invalid username or password") is shown in an Alert.
import { useState } from 'react';
import { Alert, Avatar, Button, Card, Form, Input, Typography } from 'antd';
import { LockOutlined, MedicineBoxFilled, UserOutlined } from '@ant-design/icons';
import api, { errorMessage } from '../api/client';
import { saveSession } from '../api/session';
import { colors } from '../theme';

const FEATURES = ['Patient records and search', 'Appointment booking', 'AI assistant grounded in clinic documents'];

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(values) {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', values);
      saveSession(data);
      window.location.href = '/patients';
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexWrap: 'wrap' }}>
      <div
        style={{
          flex: '1 1 380px',
          background: `linear-gradient(160deg, ${colors.primaryDeep} 0%, ${colors.primary} 100%)`,
          color: '#fff',
          padding: '48px 40px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <Avatar shape="square" size={48} style={{ background: 'rgba(255,255,255,0.15)' }} icon={<MedicineBoxFilled />} />
        <Typography.Title style={{ color: '#fff', margin: '24px 0 8px' }}>Patient Management</Typography.Title>
        <Typography.Paragraph style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, maxWidth: 420 }}>
          Manage patients and appointments, and get answers from clinic documents.
        </Typography.Paragraph>
        <ul style={{ paddingLeft: 18, color: 'rgba(255,255,255,0.85)', lineHeight: 2 }}>
          {FEATURES.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </div>

      <div style={{ flex: '1 1 380px', display: 'grid', placeItems: 'center', padding: 24, background: colors.background }}>
        <Card style={{ width: 380, maxWidth: '100%', boxShadow: '0 12px 32px rgba(20,33,61,0.08)' }}>
          <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 4 }}>
            Welcome back
          </Typography.Title>
          <Typography.Paragraph type="secondary">Log in with your staff account</Typography.Paragraph>
          {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}
          <Form layout="vertical" onFinish={handleLogin} requiredMark={false}>
            <Form.Item name="username" label="Username" rules={[{ required: true, message: 'Enter your username' }]}>
              <Input prefix={<UserOutlined />} size="large" autoFocus />
            </Form.Item>
            <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Enter your password' }]}>
              <Input.Password prefix={<LockOutlined />} size="large" />
            </Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={loading}>
              Log in
            </Button>
          </Form>
        </Card>
      </div>
    </div>
  );
}
