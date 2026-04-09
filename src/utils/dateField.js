const MONTH_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  month: 'long',
  year: 'numeric',
});

const WEEKDAY_LABELS = ['Mg', 'Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb'];

function pad(value) {
  return String(value).padStart(2, '0');
}

export function getWeekdayLabels() {
  return WEEKDAY_LABELS;
}

export function parseIsoDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function formatDateFieldValue(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return '';
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatDateDisplay(value) {
  const date = parseIsoDate(value);
  if (!date) {
    return '';
  }

  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function formatMonthLabel(date) {
  return MONTH_FORMATTER.format(date);
}

export function getMonthDays(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const gridStart = new Date(year, month, 1 - startOffset, 12, 0, 0, 0);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);

    return {
      date,
      value: formatDateFieldValue(date),
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === month,
    };
  });
}

export function moveMonth(date, offset) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1, 12, 0, 0, 0);
}

export function getInitialViewDate(value) {
  return parseIsoDate(value) ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12, 0, 0, 0);
}

export function isDateDisabled(value, min, max) {
  if (!value) {
    return true;
  }

  if (min && value < min) {
    return true;
  }

  if (max && value > max) {
    return true;
  }

  return false;
}

export function splitDateTimeValue(value) {
  if (!value || !value.includes('T')) {
    return { date: '', hour: '', minute: '' };
  }

  const [datePart, timePart] = value.split('T');
  const [hour = '', minute = ''] = timePart.split(':');

  return {
    date: /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : '',
    hour: hour.slice(0, 2),
    minute: minute.slice(0, 2),
  };
}

export function combineDateTimeValue(date, hour, minute) {
  if (!date) {
    return '';
  }

  if (!hour && !minute) {
    return `${date}T00:00`;
  }

  return `${date}T${hour || '00'}:${minute || '00'}`;
}

export function createTimeOptions(max) {
  return Array.from({ length: max }, (_, index) => {
    const label = pad(index);
    return { value: label, label };
  });
}
