// Modal form for booking an appointment: choose a patient, date/time, clinician and reason.
// The date picker blocks past dates and dates more than a year ahead; the backend checks again.
import { useEffect, useState } from 'react';
import { App, DatePicker, Form, Input, Modal, Select } from 'antd';
import dayjs from 'dayjs';
import api, { errorMessage, fieldErrors } from '../api/client';

function isOutsideBookingWindow(day) {
  return day.isBefore(dayjs(), 'day') || day.isAfter(dayjs().add(1, 'year'));
}

export default function AppointmentFormModal({ open, onClose, onSaved }) {
  const [form] = Form.useForm();
  const [patients, setPatients] = useState([]);
  const [saving, setSaving] = useState(false);
  const { message } = App.useApp();

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    api
      .get('/patients')
      .then(({ data }) => setPatients(data))
      .catch((err) => message.error(errorMessage(err)));
  }, [open, form, message]);

  async function handleSubmit(values) {
    setSaving(true);
    try {
      await api.post('/appointments', { ...values, dateTime: values.dateTime.toISOString() });
      message.success('Appointment booked');
      onSaved();
    } catch (err) {
      const fields = fieldErrors(err);
      form.setFields(Object.entries(fields).map(([name, msg]) => ({ name, errors: [msg] })));
      message.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="New appointment"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Book"
      confirmLoading={saving}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item name="patientId" label="Patient" rules={[{ required: true, message: 'Choose a patient' }]}>
          <Select
            showSearch
            optionFilterProp="label"
            placeholder="Search patient"
            options={patients.map((p) => ({ value: p.patientId, label: `${p.patientId} - ${p.name}` }))}
          />
        </Form.Item>
        <Form.Item name="dateTime" label="Date and time" rules={[{ required: true, message: 'Choose a date and time' }]}>
          <DatePicker
            showTime={{ format: 'HH:mm', minuteStep: 15 }}
            format="DD MMM YYYY HH:mm"
            disabledDate={isOutsideBookingWindow}
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Form.Item name="clinician" label="Clinician" rules={[{ required: true, message: 'Clinician is required' }]}>
          <Input placeholder="e.g. Dr. Kavya Iyer" />
        </Form.Item>
        <Form.Item name="reason" label="Reason" rules={[{ required: true, message: 'Reason is required' }]}>
          <Input.TextArea rows={2} maxLength={300} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
