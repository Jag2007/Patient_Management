// AI Assistant page: sends questions to /api/chat and keeps the open chat in sessionStorage (chatStorage.js).
// Past chats come from /api/chat/conversations and can be reopened or deleted.
import { useEffect, useRef, useState } from 'react';
import { Alert, App, Avatar, Button, Card, Input, Typography } from 'antd';
import { MessageOutlined, PlusOutlined, SendOutlined } from '@ant-design/icons';
import api, { errorMessage } from '../api/client';
import { clearChat, loadChat, saveChat } from '../api/chatStorage';
import useApi from '../api/useApi';
import PageHeader from '../components/PageHeader';
import ChatHistory from '../components/ChatHistory';
import ChatMessage from '../components/ChatMessage';
import { colors } from '../theme';

const SUGGESTIONS = [
  'What are your opening hours on Saturday?',
  'What is the late cancellation fee?',
  'Which insurance partners do you work with?',
  'Show appointments for P-0003',
  'Tell me about Priya Sharma',
];

export default function ChatPage() {
  const [conversationId, setConversationId] = useState(() => loadChat().conversationId);
  const [messages, setMessages] = useState(() => loadChat().messages);
  const [question, setQuestion] = useState(() => loadChat().draft);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const { message } = App.useApp();
  const { data: conversations, reload: loadConversations } = useApi('/chat/conversations');

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
      // The server saved nothing, so take the question out of the chat and put it back in the box.
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
              <ChatMessage key={index} message={message} />
            ))}
            {loading && (
              <ChatMessage
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
