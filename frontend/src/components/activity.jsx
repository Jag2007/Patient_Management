// Turns audit action codes (e.g. "appointment.cancel") into readable labels, colours and icons.
// Used by the Audit Log page and the patient activity drawer so both look the same.
import {
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  KeyOutlined,
  StopOutlined,
  EyeOutlined,
  RobotOutlined,
  UserAddOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons';
import { colors } from '../theme';

export const ACTIVITY = {
  'patient.view': { label: 'Viewed patient', color: colors.textMuted, icon: <EyeOutlined /> },
  'patient.create': { label: 'Created patient', color: colors.success, icon: <UserAddOutlined /> },
  'patient.update': { label: 'Edited patient', color: colors.warning, icon: <EditOutlined /> },
  'appointment.create': { label: 'Booked appointment', color: colors.primary, icon: <CalendarOutlined /> },
  'appointment.update': { label: 'Edited appointment', color: colors.warning, icon: <EditOutlined /> },
  'appointment.cancel': { label: 'Cancelled appointment', color: colors.error, icon: <CloseCircleOutlined /> },
  'ai.tool.get_patient_appointments': { label: 'AI looked up appointments', color: colors.ai, icon: <RobotOutlined /> },
  'ai.tool.get_patient_details': { label: 'AI looked up patient details', color: colors.ai, icon: <RobotOutlined /> },
  'staff.create': { label: 'Created staff login', color: colors.info, icon: <UsergroupAddOutlined /> },
  'staff.reset_password': { label: 'Reset staff password', color: colors.warning, icon: <KeyOutlined /> },
  'staff.disable': { label: 'Disabled staff login', color: colors.error, icon: <StopOutlined /> },
  'staff.enable': { label: 'Enabled staff login', color: colors.success, icon: <CheckCircleOutlined /> },
  'staff.delete': { label: 'Deleted staff login', color: colors.error, icon: <DeleteOutlined /> },
};

export function activityInfo(action) {
  return ACTIVITY[action] || { label: action, color: colors.textMuted, icon: <EyeOutlined /> };
}
