// AI assistant chat (bubbles slide in; animated dots while waiting). Sends each question to POST /api/chat with the
// current conversation ID. The backend stores every chat, and uses its earlier turns so follow-ups like
// "which patient are we talking about?" work. Past chats are listed on the left and can be reopened or deleted.
// Answers show their sources (built by the backend, never invented by the model) and a "Checked" tag when the
// second AI review (the judge) confirmed the answer matches the question and its sources. Input is limited to 500 characters.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, App, Avatar, Button, Card, Input, Popconfirm, Tooltip, Typography } from 'antd';
import { CheckCircleOutlined, DatabaseOutlined, DeleteOutlined, FileTextOutlined, HistoryOutlined, MessageOutlined, PlusOutlined, SendOutlined, UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api, { errorMessage } from '../api/client';
import { clearChat, loadChat, saveChat } from '../api/chatStorage';
import PageHeader from '../components/PageHeader';
import { SoftTag } from '../components/SoftTag';
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
      <Avatar icon={isUser ? <UserOutlined /> : <MessageOutlined />} style={{ background: isUser ? colors.accent : colors.primarySoft, color: isUser ? '#fff' : colors.primary, flexShrink: 0 }} />
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
              <SoftTag key={source.id} icon={source.id.startsWith('S') ? <FileTextOutlined /> : <DatabaseOutlined />} color={colors.primary}>
                {source.label}
              </SoftTag>
            ))}
            {message.verified && (
              <Tooltip title="A second AI review checked that this answer matches your question and is fully supported by the sources.">
                <span>
                  <SoftTag icon={<CheckCircleOutlined />} color={colors.success}>
                    Checked against sources
                  </SoftTag>
                </span>
              </Tooltip>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ChatHistory({ conversations, activeId, onOpen, onDelete }) {
  return (
    <Card
      size="small"
      title={
        <span>
          <HistoryOutlined /> Chat history
        </span>
      }
      styles={{ body: { padding: 8, maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' } }}
    >
      {conversations.length === 0 && (
        <Typography.Text type="secondary" style={{ display: 'block', padding: 8 }}>
          Your chats will appear here.
        </Typography.Text>
      )}
      {conversations.map((c) => (
        <div
          key={c._id}
          className={`chat-history-item${c._id === activeId ? ' active' : ''}`}
          onClick={() => onOpen(c._id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onOpen(c._id)}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <Typography.Text ellipsis style={{ display: 'block', fontWeight: 600 }}>
              {c.title}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {dayjs(c.updatedAt).format('DD MMM, HH:mm')}
            </Typography.Text>
          </div>
          <Popconfirm
            title="Delete this chat?"
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={(e) => {
              e?.stopPropagation();
              onDelete(c._id);
            }}
            onCancel={(e) => e?.stopPropagation()}
          >
            <Button size="small" type="text" icon={<DeleteOutlined />} aria-label="Delete chat" onClick={(e) => e.stopPropagation()} />
          </Popconfirm>
        </div>
      ))}
    </Card>
  );
}

export default function ChatPage() {
  const [conversationId, setConversationId] = useState(() => loadChat().conversationId);
  const [messages, setMessages] = useState(() => loadChat().messages);
  const [question, setQuestion] = useState(() => loadChat().draft);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const { message } = App.useApp();

  const loadConversations = useCallback(async () => {
    try {
      const { data } = await api.get('/chat/conversations');
      setConversations(data);
    } catch (err) {
      message.error(errorMessage(err));
    }
  }, [message]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    saveChat({ conversationId, messages, draft: question });
  }, [conversationId, messages, question]);

  function startNewChat() {
    clearChat();
    setConversationId(null);
    setMessages([]);
    setQuestion('');
    setError('');
  }

  async function openConversation(id) {
    if (loading) return;
    try {
      const { data } = await api.get(`/chat/conversations/${id}`);
      setConversationId(id);
      setMessages(data.messages);
      setError('');
    } catch (err) {
      message.error(errorMessage(err));
    }
  }

  async function deleteConversation(id) {
    try {
      await api.delete(`/chat/conversations/${id}`);
      if (id === conversationId) startNewChat();
      loadConversations();
    } catch (err) {
      message.error(errorMessage(err));
    }
  }

  async function ask(text = question) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setError('');
    setQuestion('');
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setLoading(true);
    try {
      const { data } = await api.post('/chat', { question: trimmed, conversationId: conversationId || undefined });
      setConversationId(data.conversationId);
      setMessages((prev) => [...prev, { role: 'assistant', text: data.answer, sources: data.sources, verified: data.verified }]);
      loadConversations();
    } catch (err) {
      // Nothing was saved on the server, so take the unanswered question back out of the chat.
      setMessages((prev) => prev.slice(0, -1));
      setQuestion(trimmed);
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
        actions={
          messages.length > 0 && (
            <Button icon={<PlusOutlined />} onClick={startNewChat} disabled={loading}>
              New chat
            </Button>
          )
        }
      />
      <div className="chat-layout">
        <ChatHistory conversations={conversations} activeId={conversationId} onOpen={openConversation} onDelete={deleteConversation} />
        <Card styles={{ body: { padding: 0 } }} style={{ minWidth: 0 }}>
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
      </div>
    </>
  );
}
