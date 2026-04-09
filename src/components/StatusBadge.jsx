import { getAttendanceStatusLabel, getRequestStatusLabel } from '../utils/format';

const toneMap = {
  present: 'bg-emerald-100 text-emerald-700',
  late: 'bg-amber-100 text-amber-700',
  leave: 'bg-sky-100 text-sky-700',
  sick: 'bg-indigo-100 text-indigo-700',
  absent: 'bg-rose-100 text-rose-700',
  corrected: 'bg-fuchsia-100 text-fuchsia-700',
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
};

export default function StatusBadge({ status, type = 'attendance' }) {
  const label = type === 'request' ? getRequestStatusLabel(status) : getAttendanceStatusLabel(status);
  return <span className={`badge ${toneMap[status] ?? 'bg-slate-100 text-slate-700'}`}>{label}</span>;
}
