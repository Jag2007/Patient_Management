// Helpers for the Appointments page: status tabs, sort options and the filter function.
import dayjs from 'dayjs';

export const STATUSES = ['all', 'scheduled', 'completed', 'cancelled'];

export const NO_FILTERS = { status: 'all', search: '', clinician: null, dates: null };

const time = (a) => dayjs(a.dateTime).valueOf();
const patientName = (a) => a.patient?.name || '';

export const SORTS = {
  newest: { label: 'Date: newest first', compare: (a, b) => time(b) - time(a) },
  oldest: { label: 'Date: oldest first', compare: (a, b) => time(a) - time(b) },
  patientAz: { label: 'Patient name: A to Z', compare: (a, b) => patientName(a).localeCompare(patientName(b)) },
  patientZa: { label: 'Patient name: Z to A', compare: (a, b) => patientName(b).localeCompare(patientName(a)) },
  clinician: { label: 'Clinician: A to Z', compare: (a, b) => a.clinician.localeCompare(b.clinician) },
};

export function filterAppointments(appointments, filters) {
  const term = filters.search.trim().toLowerCase();
  return (
    appointments
      .filter((a) => filters.status === 'all' || a.status === filters.status)
      .filter((a) => !filters.clinician || a.clinician === filters.clinician)
      // Compare by day so both ends of the date range are included.
      .filter((a) => !filters.dates || (!dayjs(a.dateTime).isBefore(filters.dates[0], 'day') && !dayjs(a.dateTime).isAfter(filters.dates[1], 'day')))
      .filter((a) => !term || [a.patient?.name, a.patient?.patientId, a.reason].some((value) => value?.toLowerCase().includes(term)))
  );
}
