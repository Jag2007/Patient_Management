// Documents page (admin only): the clinic documents the AI assistant answers from, via /api/documents.
// Section numbers match the sources shown under chat answers, e.g. "billing.md (section 2)".
import { useState } from 'react';
import { Alert, Card, Drawer, Empty, Tag, Typography } from 'antd';
import { FileTextOutlined, ReadOutlined } from '@ant-design/icons';
import useApi from '../api/useApi';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import StatRow from '../components/StatRow';
import { colors } from '../theme';

export default function DocumentsPage() {
  const { data: documents, loading, error } = useApi('/documents', { toast: false });
  const [open, setOpen] = useState(null);

  const sectionCount = documents.reduce((total, doc) => total + doc.sections.length, 0);

  return (
    <>
      <PageHeader title="Documents" subtitle="The clinic documents the AI assistant answers from. Section numbers match the sources shown under chat answers." />

      <StatRow>
        <StatCard icon={<FileTextOutlined />} label="Documents" value={documents.length} color={colors.primary} />
        <StatCard icon={<ReadOutlined />} label="Searchable sections" value={sectionCount} color={colors.info} />
      </StatRow>

      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}
      {!loading && !error && documents.length === 0 && <Empty description="No documents yet. Run npm run seed in the backend." />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {documents.map((doc) => (
          <Card key={doc.source} className="stat-card" hoverable loading={loading} onClick={() => setOpen(doc)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, display: 'grid', placeItems: 'center', background: colors.primarySoft, color: colors.primary, fontSize: 18 }}>
                <FileTextOutlined />
              </div>
              <div>
                <Typography.Text strong style={{ display: 'block' }}>
                  {doc.title}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {doc.source} · {doc.sections.length} sections
                </Typography.Text>
              </div>
            </div>
            <Typography.Paragraph type="secondary" ellipsis={{ rows: 3 }} style={{ marginBottom: 0 }}>
              {doc.sections[0]?.text}
            </Typography.Paragraph>
          </Card>
        ))}
      </div>

      <Drawer title={open?.title} open={Boolean(open)} onClose={() => setOpen(null)} size={520}>
        {open && (
          <div className="page-enter">
            <Tag icon={<FileTextOutlined />} color="green" style={{ marginBottom: 16 }}>
              {open.source}
            </Tag>
            {open.sections.map(({ section, text }) => (
              <div key={section} style={{ marginBottom: 18 }}>
                <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Section {section}
                </Typography.Text>
                <Typography.Paragraph style={{ marginTop: 4, lineHeight: 1.7 }}>{text}</Typography.Paragraph>
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </>
  );
}
