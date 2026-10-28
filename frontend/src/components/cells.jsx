// Two-line table cells shared by the Patients, Appointments and Audit Log tables.
import { Typography } from 'antd';
import dayjs from 'dayjs';

export function DateCell({ value, timeFormat, strong = false }) {
  return (
    <>
      <Typography.Text strong={strong}>{dayjs(value).format('DD MMM YYYY')}</Typography.Text>
      <br />
      <Typography.Text type="secondary">{dayjs(value).format(timeFormat)}</Typography.Text>
    </>
  );
}

export function PersonCell({ name, id, strong = false }) {
  return (
    <div>
      <Typography.Text strong={strong}>{name}</Typography.Text>
      <br />
      <Typography.Text type="secondary">{id}</Typography.Text>
    </div>
  );
}
