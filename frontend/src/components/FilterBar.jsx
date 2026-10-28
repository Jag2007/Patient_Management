// Card above a table that holds the filter and sort controls, a "Showing x of y" count and a Clear button.
import { Button, Card, Typography } from 'antd';
import { ClearOutlined } from '@ant-design/icons';

export default function FilterBar({ children, shown, total, filtersActive, onClear }) {
  return (
    <Card size="small" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {children}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <Typography.Text type="secondary">
            Showing {shown} of {total}
          </Typography.Text>
          {filtersActive && (
            <Button size="small" type="link" icon={<ClearOutlined />} onClick={onClear}>
              Clear filters
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
