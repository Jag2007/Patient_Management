// Helpers for the Patients page: age, initials, city/area from the address, and the sort and filter options.
// initials() and age() are also used by PatientActivityDrawer.
import dayjs from 'dayjs';

export function initials(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export const age = (p) => dayjs().diff(p.dateOfBirth, 'year');
const added = (p) => dayjs(p.createdAt).valueOf();
const born = (p) => dayjs(p.dateOfBirth).valueOf();

export const SORTS = {
  id: { label: 'Patient ID', compare: (a, b) => a.patientId.localeCompare(b.patientId) },
  newest: { label: 'Newest added first', compare: (a, b) => added(b) - added(a) || b.patientId.localeCompare(a.patientId) },
  oldest: { label: 'Oldest added first', compare: (a, b) => added(a) - added(b) || a.patientId.localeCompare(b.patientId) },
  nameAz: { label: 'Name: A to Z', compare: (a, b) => a.name.localeCompare(b.name) },
  nameZa: { label: 'Name: Z to A', compare: (a, b) => b.name.localeCompare(a.name) },
  youngest: { label: 'Age: youngest first', compare: (a, b) => born(b) - born(a) },
  eldest: { label: 'Age: oldest first', compare: (a, b) => born(a) - born(b) },
};

export const AGE_GROUPS = {
  child: { label: 'Children (under 18)', test: (years) => years < 18 },
  adult: { label: 'Adults (18–59)', test: (years) => years >= 18 && years < 60 },
  senior: { label: 'Seniors (60+)', test: (years) => years >= 60 },
};

export const NO_FILTERS = { city: null, ageGroup: null, area: null, email: null };

// "12 MG Road, Hyderabad" -> area "MG Road", city "Hyderabad". A trailing PIN code ("..., Hyderabad, 500068") is skipped.
export function areaOf(patient) {
  return (patient.address || '')
    .split(',')[0]
    .replace(/^\d+\s*/, '')
    .trim();
}

export function cityOf(patient) {
  const parts = (patient.address || '')
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part && !/^\d+$/.test(part));
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

export function filterPatients(patients, filters) {
  return patients
    .filter((p) => !filters.city || cityOf(p) === filters.city)
    .filter((p) => !filters.ageGroup || AGE_GROUPS[filters.ageGroup].test(age(p)))
    .filter((p) => !filters.area || areaOf(p) === filters.area)
    .filter((p) => !filters.email || (filters.email === 'yes') === Boolean(p.email));
}
