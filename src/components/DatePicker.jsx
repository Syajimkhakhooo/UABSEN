import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  formatDateDisplay,
  formatDateFieldValue,
  formatMonthLabel,
  getInitialViewDate,
  getMonthDays,
  getWeekdayLabels,
  isDateDisabled,
  moveMonth,
} from '../utils/dateField';

export default function DatePicker({
  value,
  onChange,
  placeholder = 'dd/mm/yyyy',
  disabled = false,
  min,
  max,
  clearable = true,
  className = '',
  popoverAlign = 'left',
}) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => getInitialViewDate(value));
  const rootRef = useRef(null);

  const monthDays = useMemo(() => getMonthDays(viewDate), [viewDate]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    setViewDate(getInitialViewDate(value));

    function handlePointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, value]);

  return (
    <div ref={rootRef} className={['relative', className].join(' ').trim()}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={[
          'custom-field justify-between text-left',
          open ? 'custom-field-active' : '',
          disabled ? 'cursor-not-allowed opacity-60' : '',
        ]
          .join(' ')
          .trim()}
      >
        <span className={['min-w-0 flex-1 truncate', value ? 'text-slate-700' : 'text-slate-400'].join(' ')}>
          {value ? formatDateDisplay(value) : placeholder}
        </span>
        <CalendarDays size={18} className="shrink-0 text-slate-400" />
      </button>

      {open && (
        <div className={['custom-popover absolute top-[calc(100%+0.55rem)] z-40 w-[min(19.5rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] p-3', popoverAlign === 'right' ? 'right-0' : 'left-0'].join(' ')}>
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              className="calendar-nav-button"
              onClick={() => setViewDate((current) => moveMonth(current, -1))}
            >
              <ChevronLeft size={16} />
            </button>
            <p className="text-sm font-semibold capitalize tracking-[-0.02em] text-ink">
              {formatMonthLabel(viewDate)}
            </p>
            <button
              type="button"
              className="calendar-nav-button"
              onClick={() => setViewDate((current) => moveMonth(current, 1))}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {getWeekdayLabels().map((label) => (
              <span key={label} className="py-1">
                {label}
              </span>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1">
            {monthDays.map((item) => {
              const isSelected = item.value === value;
              const isDisabled = isDateDisabled(item.value, min, max);
              const isToday = item.value === formatDateFieldValue(new Date());

              return (
                <button
                  key={item.value}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  className={[
                    'calendar-day',
                    item.isCurrentMonth ? 'text-slate-700' : 'text-slate-300',
                    isSelected ? 'calendar-day-selected' : '',
                    isToday && !isSelected ? 'calendar-day-today' : '',
                    isDisabled ? 'cursor-not-allowed opacity-30' : '',
                  ]
                    .join(' ')
                    .trim()}
                >
                  {item.dayNumber}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-slate-200/80 pt-3">
            <button
              type="button"
              className="calendar-footer-button"
              onClick={() => {
                if (clearable) {
                  onChange('');
                }
                setOpen(false);
              }}
            >
              Bersihkan
            </button>
            <button
              type="button"
              className="calendar-footer-button"
              onClick={() => {
                const todayValue = formatDateFieldValue(new Date());
                if (!isDateDisabled(todayValue, min, max)) {
                  onChange(todayValue);
                }
                setOpen(false);
              }}
            >
              Hari ini
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
