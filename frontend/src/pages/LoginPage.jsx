// Login form. Sends username and password to the backend and stores the returned token.
// Any backend error (e.g. "Invalid username or password") is shown in an Alert.
import { useState } from 'react';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import api, { errorMessage } from '../api/client';
import { saveSession } from '../api/session';

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
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f0f5f4', padding: 16 }}>
      <Card style={{ width: 360, maxWidth: '100%' }}>
        <Typography.Title level={3} style={{ marginTop: 0 }}>
          Patient Management
        </Typography.Title>
        <Typography.Paragraph type="secondary">Staff login</Typography.Paragraph>
        {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}
        <Form layout="vertical" onFinish={handleLogin}>
          <Form.Item name="username" label="Username" rules={[{ required: true, message: 'Enter your username' }]}>
            <Input autoFocus />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Enter your password' }]}>
            <Input.Password />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            Log in
          </Button>
        </Form>
      </Card>
    </div>
  );
}
