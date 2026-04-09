import { ATTENDANCE_STATUS_LABELS, REQUEST_STATUS_LABELS } from '../lib/constants';

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
});

const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatDate(value) {
  if (!value) return '-';
  return dateFormatter.format(new Date(value));
}

export function formatDateTime(value) {
  if (!value) return '-';
  return dateTimeFormatter.format(new Date(value));
}

export function formatTime(value) {
  if (!value) return '-';
  if (/^\d{2}:\d{2}/.test(value)) return value.slice(0, 5);
  return new Date(value).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getAttendanceStatusLabel(status) {
  return ATTENDANCE_STATUS_LABELS[status] ?? status;
}

export function getRequestStatusLabel(status) {
  return REQUEST_STATUS_LABELS[status] ?? status;
}
