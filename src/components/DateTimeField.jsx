import CustomSelect from './CustomSelect';
import DatePicker from './DatePicker';
import { combineDateTimeValue, createTimeOptions, splitDateTimeValue } from '../utils/dateField';

const HOUR_OPTIONS = [{ value: '', label: 'Jam' }, ...createTimeOptions(24)];
const MINUTE_OPTIONS = [{ value: '', label: 'Menit' }, ...createTimeOptions(60)];

export default function DateTimeField({
  value,
  onChange,
  datePlaceholder = 'Pilih tanggal',
  className = '',
}) {
  const { date, hour, minute } = splitDateTimeValue(value);

  function updateNextValue(nextDate, nextHour = hour, nextMinute = minute) {
    onChange(combineDateTimeValue(nextDate, nextHour, nextMinute));
  }

  return (
    <div className={['grid gap-2', className].join(' ').trim()}>
      <DatePicker value={date} onChange={(nextDate) => updateNextValue(nextDate)} placeholder={datePlaceholder} />
      <div className="grid grid-cols-[1fr_1fr] gap-2">
        <CustomSelect
          value={hour}
          onChange={(nextHour) => updateNextValue(date, nextHour, minute)}
          options={HOUR_OPTIONS}
          placeholder="Jam"
        />
        <CustomSelect
          value={minute}
          onChange={(nextMinute) => updateNextValue(date, hour, nextMinute)}
          options={MINUTE_OPTIONS}
          placeholder="Menit"
        />
      </div>
    </div>
  );
}
