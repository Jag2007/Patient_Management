// Login page: a calm welcome panel with an animated heartbeat line on the left, the login form on the right.
// Sends username and password to the backend and stores the returned token.
// Any backend error (e.g. "Invalid username or password") is shown in an Alert.
import { useState } from 'react';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { CheckCircleFilled, LockOutlined, UserOutlined } from '@ant-design/icons';
import api, { errorMessage } from '../api/client';
import { saveSession } from '../api/session';
import BrandMark from '../components/BrandMark';
import { colors } from '../theme';

const FEATURES = ['Patient records and search', 'Appointment booking and safe cancellation', 'AI assistant grounded in clinic documents'];

function HeartbeatLine() {
  return (
    <svg viewBox="0 0 400 80" width="100%" height="80" aria-hidden="true" style={{ maxWidth: 420, margin: '28px 0' }}>
      <path d="M0 40 H130 L145 40 L155 15 L170 65 L182 28 L192 40 H400" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
      <path
        className="ecg-line"
        d="M0 40 H130 L145 40 L155 15 L170 65 L182 28 L192 40 H400"
        fill="none"
        stroke={colors.accent}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
          flex: '1 1 420px',
          background: `radial-gradient(circle at 20% 15%, #2A6E5D 0%, ${colors.primaryDark} 60%)`,
          color: '#fff',
          padding: '56px 48px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <div className="page-enter">
          <BrandMark size={52} light />
          <Typography.Title style={{ color: '#fff', margin: '28px 0 8px', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Patient Management
          </Typography.Title>
          <Typography.Paragraph style={{ color: 'rgba(255,255,255,0.75)', fontSize: 16, maxWidth: 440, margin: 0 }}>
            One calm place for your clinic team to manage patients, appointments and everyday questions.
          </Typography.Paragraph>
          <HeartbeatLine />
          {FEATURES.map((feature) => (
            <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, color: 'rgba(255,255,255,0.85)' }}>
              <CheckCircleFilled style={{ color: colors.accent }} />
              {feature}
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: '1 1 420px', display: 'grid', placeItems: 'center', padding: 24, background: colors.background }}>
        <Card className="page-enter" style={{ width: 400, maxWidth: '100%', boxShadow: '0 20px 48px rgba(20,53,45,0.10)', border: 'none' }} styles={{ body: { padding: 32 } }}>
          <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 4, fontWeight: 800 }}>
            Welcome back
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
            Sign in with your staff account
          </Typography.Paragraph>
          {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}
          <Form layout="vertical" onFinish={handleLogin} requiredMark={false}>
            <Form.Item name="username" label="Username" rules={[{ required: true, message: 'Enter your username' }]}>
              <Input prefix={<UserOutlined />} size="large" autoFocus />
            </Form.Item>
            <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Enter your password' }]}>
              <Input.Password prefix={<LockOutlined />} size="large" />
            </Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={loading} style={{ marginTop: 4 }}>
              Sign in
            </Button>
          </Form>
        </Card>
      </div>
    </div>
  );
}
