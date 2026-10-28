// AI assistant chat (bubbles slide in; animated dots while waiting). Sends each question to POST /api/chat and shows the answer with its sources.
// Sources come from the backend response (never invented by the model). Errors appear in an Alert.
// The input is limited to 500 characters, the same limit the backend enforces.
import { useEffect, useRef, useState } from 'react';
import { Alert, Avatar, Button, Card, Input, Tag, Typography } from 'antd';
import { FileTextOutlined, DatabaseOutlined, MessageOutlined, SendOutlined, UserOutlined } from '@ant-design/icons';
import api, { errorMessage } from '../api/client';
import PageHeader from '../components/PageHeader';
import { colors } from '../theme';

const SUGGESTIONS = [
  'What are your opening hours on Saturday?',
  'What is the late cancellation fee?',
  'Which insurance partners do you work with?',
  'Show appointments for P-0003',
  'Tell me about Priya Sharma',
];

function Message({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className="bubble-in" style={{ display: 'flex', gap: 10, flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
      <Avatar
        icon={isUser ? <UserOutlined /> : <MessageOutlined />}
        style={{ background: isUser ? colors.accent : colors.primarySoft, color: isUser ? '#fff' : colors.primary, flexShrink: 0 }}
      />
      <div style={{ maxWidth: '75%' }}>
        <div
          style={{
            background: isUser ? colors.primary : '#fff',
            color: isUser ? '#fff' : colors.text,
            border: isUser ? 'none' : `1px solid ${colors.border}`,
            padding: '10px 14px',
            borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            boxShadow: isUser ? 'none' : '0 2px 8px rgba(20,53,45,0.04)',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.55,
          }}
        >
          {message.text}
        </div>
        {message.sources?.length > 0 && (
          <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Sources:
            </Typography.Text>
            {message.sources.map((source) => (
              <Tag key={source.id} icon={source.id.startsWith('T') ? <DatabaseOutlined /> : <FileTextOutlined />} color="green">
                {source.label}
              </Tag>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function ask(text = question) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setError('');
    setQuestion('');
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setLoading(true);
    try {
      const { data } = await api.post('/chat', { question: trimmed });
      setMessages((prev) => [...prev, { role: 'assistant', text: data.answer, sources: data.sources }]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        title="AI Assistant"
        subtitle="Answers come only from clinic documents and patient records. It does not give medical advice."
      />
      <Card styles={{ body: { padding: 0 } }}>
        <div style={{ height: 'calc(100vh - 330px)', minHeight: 320, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16, background: '#FBFAF7' }}>
          {messages.length === 0 && (
            <div style={{ margin: 'auto', textAlign: 'center', maxWidth: 520 }}>
              <Avatar size={56} icon={<MessageOutlined />} style={{ background: colors.primarySoft, color: colors.primary }} />
              <Typography.Title level={4}>How can I help?</Typography.Title>
              <Typography.Paragraph type="secondary">Try one of these:</Typography.Paragraph>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                {SUGGESTIONS.map((suggestion) => (
                  <Button key={suggestion} shape="round" onClick={() => ask(suggestion)}>
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {messages.map((message, index) => (
            <Message key={index} message={message} />
          ))}
          {loading && (
            <Message
              message={{
                role: 'assistant',
                text: (
                  <span className="typing" aria-label="Assistant is typing">
                    <span />
                    <span />
                    <span />
                  </span>
                ),
              }}
            />
          )}
          <div ref={bottomRef} />
        </div>

        <div style={{ padding: 16, borderTop: `1px solid ${colors.border}` }}>
          {error && <Alert type="error" title={error} showIcon closable onClose={() => setError('')} style={{ marginBottom: 12 }} />}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <Input.TextArea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  ask();
                }
              }}
              placeholder="Ask about the clinic, or about a patient by name or ID (e.g. Priya Sharma, P-0003)"
              maxLength={500}
              showCount
              autoSize={{ minRows: 1, maxRows: 4 }}
            />
            <Button type="primary" icon={<SendOutlined />} onClick={() => ask()} loading={loading} disabled={!question.trim()}>
              Send
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
}
