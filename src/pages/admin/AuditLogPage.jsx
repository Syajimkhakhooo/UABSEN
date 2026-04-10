import { useEffect, useState } from 'react';
import CustomSelect from '../../components/CustomSelect';
import DatePicker from '../../components/DatePicker';
import SectionCard from '../../components/SectionCard';
import { AUDIT_ACTION_OPTIONS } from '../../lib/constants';
import { listAuditLogs } from '../../lib/uabsenApi';
import { formatDateTime } from '../../utils/format';

export default function AuditLogPage() {
  const [filters, setFilters] = useState({
    action: '',
    dateFrom: '',
    dateTo: '',
  });
  const [logs, setLogs] = useState([]);
  const actionOptions = [{ value: '', label: 'Semua aksi' }, ...AUDIT_ACTION_OPTIONS.map((action) => ({ value: action, label: action }))];

  useEffect(() => {
    async function load() {
      const data = await listAuditLogs(filters);
      setLogs(data);
    }

    load();
  }, [filters.action, filters.dateFrom, filters.dateTo]);

  return (
    <SectionCard
      title="Audit Log"
      description="Semua aksi penting sistem direkam untuk kebutuhan kontrol operasional dan jejak perubahan."
    >
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <CustomSelect
          value={filters.action}
          onChange={(nextValue) => setFilters((value) => ({ ...value, action: nextValue }))}
          options={actionOptions}
          placeholder="Semua aksi"
        />
        <DatePicker
          value={filters.dateFrom}
          onChange={(nextValue) => setFilters((value) => ({ ...value, dateFrom: nextValue }))}
        />
        <DatePicker
          value={filters.dateTo}
          onChange={(nextValue) => setFilters((value) => ({ ...value, dateTo: nextValue }))}
        />
      </div>

      <div className="table-shell">
        <table className="responsive-table">
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Aksi</th>
              <th>Deskripsi</th>
              <th>Metadata</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-slate-100">
                <td data-label="Waktu">{formatDateTime(log.created_at)}</td>
                <td data-label="Aksi" className="font-semibold text-ink">{log.action}</td>
                <td data-label="Deskripsi">{log.description}</td>
                <td data-label="Metadata">
                  <pre className="max-w-sm whitespace-pre-wrap text-xs text-slate-500">
                    {JSON.stringify(log.metadata ?? {}, null, 2)}
                  </pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
