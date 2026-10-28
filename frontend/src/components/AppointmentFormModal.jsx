// Modal form for booking a new appointment, or editing a scheduled one (pass `appointment`).
// When editing, the patient is fixed and only date/time, clinician and reason can change.
// The date picker blocks past dates and dates more than a year ahead; the backend checks again.
import { useEffect, useState } from 'react';
import { App, DatePicker, Form, Input, Modal, Select } from 'antd';
import dayjs from 'dayjs';
import api, { errorMessage, showFieldErrors } from '../api/client';

function isOutsideBookingWindow(day) {
  return day.isBefore(dayjs(), 'day') || day.isAfter(dayjs().add(1, 'year'));
}

export default function AppointmentFormModal({ open, appointment, onClose, onSaved }) {
  const [form] = Form.useForm();
  const [patients, setPatients] = useState([]);
  const [saving, setSaving] = useState(false);
  const { message } = App.useApp();
  const isEdit = Boolean(appointment);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (isEdit) {
      form.setFieldsValue({
        patientId: appointment.patient?.patientId,
        dateTime: dayjs(appointment.dateTime),
        clinician: appointment.clinician,
        reason: appointment.reason,
      });
      return;
    }
    api
      .get('/patients')
      .then(({ data }) => setPatients(data))
      .catch((err) => message.error(errorMessage(err)));
  }, [open, isEdit, appointment, form, message]);

  async function handleSubmit(values) {
    setSaving(true);
    try {
      if (isEdit) {
        // Only send what changed, so an unchanged date is not re-checked.
        const changes = { clinician: values.clinician, reason: values.reason };
        if (!values.dateTime.isSame(dayjs(appointment.dateTime), 'minute')) changes.dateTime = values.dateTime.toISOString();
        await api.put(`/appointments/${appointment._id}`, changes);
        message.success('Appointment updated');
      } else {
        await api.post('/appointments', { ...values, dateTime: values.dateTime.toISOString() });
        message.success('Appointment booked');
      }
      onSaved();
    } catch (err) {
      showFieldErrors(form, err);
      message.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={isEdit ? 'Edit appointment' : 'New appointment'}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText={isEdit ? 'Save changes' : 'Book'}
      confirmLoading={saving}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item name="patientId" label="Patient" rules={[{ required: true, message: 'Choose a patient' }]}>
          {isEdit ? (
            <Select disabled options={[{ value: appointment.patient?.patientId, label: `${appointment.patient?.patientId} - ${appointment.patient?.name}` }]} />
          ) : (
            <Select showSearch optionFilterProp="label" placeholder="Search patient" options={patients.map((p) => ({ value: p.patientId, label: `${p.patientId} - ${p.name}` }))} />
          )}
        </Form.Item>
        <Form.Item name="dateTime" label="Date and time" rules={[{ required: true, message: 'Choose a date and time' }]}>
          <DatePicker showTime={{ format: 'HH:mm', minuteStep: 15 }} format="DD MMM YYYY HH:mm" disabledDate={isOutsideBookingWindow} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="clinician" label="Clinician" rules={[{ required: true, message: 'Clinician is required' }]}>
          <Input placeholder="e.g. Dr. Kavya Iyer" maxLength={100} />
        </Form.Item>
        <Form.Item name="reason" label="Reason for visit" rules={[{ required: true, message: 'Reason is required' }]}>
          <Input.TextArea rows={2} maxLength={300} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
