// One chat bubble on the AI Assistant page, with its sources and a "Checked" tag when the judge approved the answer.
// While an answer streams in (live), it shows the current step and the draft in grey until the checked answer replaces it.
import { Avatar, Tooltip, Typography } from 'antd';
import { CheckCircleOutlined, DatabaseOutlined, FileTextOutlined, MessageOutlined, UserOutlined } from '@ant-design/icons';
import { SoftTag } from './SoftTag';
import { colors } from '../theme';

function Typing() {
  return (
    <span className="typing" aria-label="Assistant is typing">
      <span />
      <span />
      <span />
    </span>
  );
}

export default function ChatMessage({ message, live }) {
  const isUser = message.role === 'user';
  return (
    <div className="bubble-in" style={{ display: 'flex', gap: 10, flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
      <Avatar icon={isUser ? <UserOutlined /> : <MessageOutlined />} style={{ background: isUser ? colors.accent : colors.primarySoft, color: isUser ? '#fff' : colors.primary, flexShrink: 0 }} />
      <div style={{ maxWidth: '75%' }}>
        <div
          style={{
            background: isUser ? colors.primary : '#fff',
            color: isUser ? '#fff' : live ? colors.textMuted : colors.text,
            border: isUser ? 'none' : `1px solid ${colors.border}`,
            padding: '10px 14px',
            borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            boxShadow: isUser ? 'none' : '0 2px 8px rgba(20,53,45,0.04)',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.55,
          }}
        >
          {live && !message.text ? <Typing /> : message.text}
        </div>
        {live && (
          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }} aria-live="polite">
            {live.status}…{message.text && live.status !== 'Checking the answer' ? ' (draft, checked before it is final)' : ''}
          </Typography.Text>
        )}
        {message.sources?.length > 0 && (
          <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Sources:
            </Typography.Text>
            {/* Document sections have ids like "S1"; patient records and earlier chat get the database icon. */}
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
