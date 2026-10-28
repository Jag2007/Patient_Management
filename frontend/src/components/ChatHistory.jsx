// Past chats list on the AI Assistant page. Click one to reopen it, or delete it with the bin button.
import { Button, Card, Popconfirm, Typography } from 'antd';
import { DeleteOutlined, HistoryOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

export default function ChatHistory({ conversations, activeId, onOpen, onDelete }) {
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
          {/* stopPropagation so deleting doesn't also open the chat underneath. */}
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
