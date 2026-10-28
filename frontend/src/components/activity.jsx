// Turns audit action codes (e.g. "appointment.cancel") into readable labels, colours and icons.
// Used by the Audit Log page and the patient activity drawer so both look the same.
import {
  CalendarOutlined,
  CloseCircleOutlined,
  EditOutlined,
  EyeOutlined,
  RobotOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { colors } from '../theme';

export const ACTIVITY = {
  'patient.view': { label: 'Viewed patient', color: colors.textMuted, icon: <EyeOutlined /> },
  'patient.create': { label: 'Created patient', color: colors.success, icon: <UserAddOutlined /> },
  'patient.update': { label: 'Edited patient', color: colors.warning, icon: <EditOutlined /> },
  'appointment.create': { label: 'Booked appointment', color: colors.primary, icon: <CalendarOutlined /> },
  'appointment.cancel': { label: 'Cancelled appointment', color: colors.error, icon: <CloseCircleOutlined /> },
  'ai.tool.get_patient_appointments': { label: 'AI looked up appointments', color: colors.purple, icon: <RobotOutlined /> },
};

export function activityInfo(action) {
  return ACTIVITY[action] || { label: action, color: colors.textMuted, icon: <EyeOutlined /> };
}
