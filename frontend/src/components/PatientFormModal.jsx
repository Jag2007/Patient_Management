// Modal form used for both "New patient" and "Edit patient".
// Field errors returned by the backend (e.g. "Phone must be 10 to 13 digits") are shown under each input.
import { useEffect, useState } from 'react';
import { App, DatePicker, Form, Input, Modal } from 'antd';
import dayjs from 'dayjs';
import api, { errorMessage, fieldErrors } from '../api/client';

export default function PatientFormModal({ open, patient, onClose, onSaved }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const { message } = App.useApp();
  const isEdit = Boolean(patient);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (patient) form.setFieldsValue({ ...patient, dateOfBirth: dayjs(patient.dateOfBirth) });
  }, [open, patient, form]);

  async function handleSubmit(values) {
    setSaving(true);
    const body = { ...values, dateOfBirth: values.dateOfBirth.format('YYYY-MM-DD') };
    try {
      if (isEdit) await api.put(`/patients/${patient.patientId}`, body);
      else await api.post('/patients', body);
      message.success(isEdit ? 'Patient updated' : 'Patient created');
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
      title={isEdit ? `Edit ${patient.patientId}` : 'New patient'}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Save"
      confirmLoading={saving}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item name="name" label="Full name" rules={[{ required: true, message: 'Name is required' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="dateOfBirth" label="Date of birth" rules={[{ required: true, message: 'Date of birth is required' }]}>
          <DatePicker style={{ width: '100%' }} disabledDate={(day) => day.isAfter(dayjs())} />
        </Form.Item>
        <Form.Item name="phone" label="Phone" rules={[{ required: true, message: 'Phone is required' }]}>
          <Input placeholder="10 to 13 digits" />
        </Form.Item>
        <Form.Item name="email" label="Email">
          <Input />
        </Form.Item>
        <Form.Item name="address" label="Address">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
