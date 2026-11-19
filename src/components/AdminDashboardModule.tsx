import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Download,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DEPARTMENTS } from '../data/hospitalData';
import {
  fetchAdminStats,
  fetchAppointments,
  patchAppointmentStatus,
  removeAppointment,
} from '../services/api';
import type { AppointmentRecord, AppointmentStatus, DashboardStats } from '../types/hospital';

interface AdminDashboardModuleProps {
  onStatsUpdated: (stats: DashboardStats) => void;
  onTrackAppointment: (appointmentId: string) => void;
}

const ALL_STATUSES: AppointmentStatus[] = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  Pending: '#D97706',
  Confirmed: '#1D4ED8',
  Completed: '#16A34A',
  Cancelled: '#DC2626',
};

const STATUS_TEXT_CLASS: Record<AppointmentStatus, string> = {
  Pending: 'text-amber-700',
  Confirmed: 'text-blue-700',
  Completed: 'text-emerald-700',
  Cancelled: 'text-red-700',
};

export const AdminDashboardModule: React.FC<AdminDashboardModuleProps> = ({
  onStatsUpdated,
  onTrackAppointment,
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dbLabel, setDbLabel] = useState<string>('SQLite');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [statsRes, records] = await Promise.all([fetchAdminStats(), fetchAppointments()]);
      setStats(statsRes.stats);
      setDbLabel(`${statsRes.database.engine} · ${statsRes.database.file}`);
      setAppointments(records);
      onStatsUpdated(statsRes.stats);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to load admin dashboard statistics.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [onStatsUpdated]);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  const filteredAppointments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return appointments.filter((item) => {
      if (statusFilter !== 'All' && item.status !== statusFilter) return false;
      if (departmentFilter !== 'all' && item.departmentId !== departmentFilter) return false;
      if (!q) return true;
      return (
        item.id.toLowerCase().includes(q) ||
        item.patientName.toLowerCase().includes(q) ||
        item.doctorName.toLowerCase().includes(q) ||
        item.departmentName.toLowerCase().includes(q) ||
        item.contact.toLowerCase().includes(q)
      );
    });
  }, [appointments, searchQuery, statusFilter, departmentFilter]);

  const handleStatusChange = async (id: string, nextStatus: AppointmentStatus) => {
    setUpdatingId(id);
    setFeedbackMessage(null);
    setErrorMessage(null);

    try {
      const updated = await patchAppointmentStatus(id, nextStatus);
      setAppointments((prev) => prev.map((row) => (row.id === id ? updated : row)));
      const refreshed = await fetchAdminStats();
      setStats(refreshed.stats);
      onStatsUpdated(refreshed.stats);
      setFeedbackMessage(`Updated ${id} to ${nextStatus}.`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setUpdatingId(id);
    setFeedbackMessage(null);
    setErrorMessage(null);
    try {
      await removeAppointment(id);
      setAppointments((prev) => prev.filter((row) => row.id !== id));
      setConfirmDeleteId(null);
      const refreshed = await fetchAdminStats();
      setStats(refreshed.stats);
      onStatsUpdated(refreshed.stats);
      setFeedbackMessage(`Removed appointment record ${id}.`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to delete appointment.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Appointment ID',
      'Patient Name',
      'Age',
      'Contact',
      'Department',
      'Doctor',
      'Date',
      'Time Slot',
      'Status',
    ];
    const escapeCell = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`;
    const rows = filteredAppointments.map((r) =>
      [
        r.id,
        r.patientName,
        r.patientAge,
        r.contact,
        r.departmentName,
        r.doctorName,
        r.appointmentDate,
        r.timeSlot,
        r.status,
      ]
        .map(escapeCell)
        .join(','),
    );
    const csv = [headers.map(escapeCell).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mediassist-appointments-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const pieData = useMemo(() => {
    if (!stats) return [];
    return stats.statusBreakdown.filter((item) => item.count > 0);
  }, [stats]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500">Live Operations Console · {dbLabel}</p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Real-time appointment counts, department workload distribution, and live status
            management.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredAppointments.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 text-xs font-medium text-slate-700 transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => void loadDashboardData()}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-xs font-medium text-white transition-colors whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2.5 text-sm text-red-800"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      {feedbackMessage && (
        <div
          role="status"
          className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-xs font-medium text-blue-900"
        >
          {feedbackMessage}
        </div>
      )}

      <section aria-label="Appointment statistics">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-medium text-slate-500">Total Appointments</p>
            <p className="mt-2 font-display text-3xl font-bold text-slate-900 tabular-nums">
              {stats ? stats.totalAppointments : '—'}
            </p>
            <p className="mt-1 text-xs text-slate-500">Persisted in SQLite</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-medium text-amber-700">Pending Review</p>
            <p className="mt-2 font-display text-3xl font-bold text-slate-900 tabular-nums">
              {stats ? stats.pendingCount : '—'}
            </p>
            <p className="mt-1 text-xs text-slate-500">Awaiting desk confirmation</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-medium text-blue-700">Confirmed Visits</p>
            <p className="mt-2 font-display text-3xl font-bold text-slate-900 tabular-nums">
              {stats ? stats.confirmedCount : '—'}
            </p>
            <p className="mt-1 text-xs text-slate-500">Scheduled for OPD</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-medium text-emerald-700">Completed</p>
            <p className="mt-2 font-display text-3xl font-bold text-slate-900 tabular-nums">
              {stats ? stats.completedCount : '—'}
            </p>
            <p className="mt-1 text-xs text-slate-500 tabular-nums">
              {stats ? `${stats.cancelledCount} cancelled` : ''}
            </p>
          </div>
        </div>
      </section>

      <section aria-label="Department and status analytics" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Appointments by Department
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live count across all 6 clinical specialties
            </p>
          </div>
          <div className="mt-4 h-64 w-full">
            {stats ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.departmentBreakdown}
                  margin={{ top: 10, right: 12, left: -16, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="departmentName"
                    tick={{ fontSize: 11, fill: '#475569' }}
                    tickLine={false}
                    axisLine={{ stroke: '#CBD5E1' }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={48}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#475569' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: '#F1F5F9' }}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" name="Appointments" fill="#1D4ED8" radius={[6, 6, 0, 0]} maxBarSize={42} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                Loading chart data...
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Status Distribution
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Share of pending, confirmed, completed, and cancelled visits
            </p>
          </div>

          <div className="mt-4 h-48 w-full">
            {stats && pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={76}
                    paddingAngle={2}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                No appointment status data yet
              </div>
            )}
          </div>

          {stats && (
            <div className="mt-2 grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
              {stats.statusBreakdown.map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                  <span className={`font-medium ${STATUS_TEXT_CLASS[item.status]}`}>
                    {item.status}
                  </span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section
        aria-labelledby="appointments-table-heading"
        className="bg-white border border-slate-200 rounded-xl overflow-hidden"
      >
        <div className="p-6 pb-4 border-b border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2
                id="appointments-table-heading"
                className="font-display text-base font-semibold text-slate-900"
              >
                Appointment Requests ({filteredAppointments.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Change status inline to update live counts, charts, and the patient tracker.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative w-full sm:w-56">
                <Search
                  className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <label htmlFor="admin-search" className="sr-only">
                  Search appointments
                </label>
                <input
                  id="admin-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search ID, patient, doctor..."
                  className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <label htmlFor="admin-dept-filter" className="sr-only">
                Filter by department
              </label>
              <select
                id="admin-dept-filter"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="all">All Departments</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            role="group"
            aria-label="Filter appointments by status"
            className="inline-flex items-center p-1 rounded-lg bg-slate-100 overflow-x-auto max-w-full"
          >
            {(['All', ...ALL_STATUSES] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  statusFilter === status
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 space-y-3 animate-pulse">
              {[1, 2, 3, 4].map((row) => (
                <div key={row} className="h-10 bg-slate-100 rounded" />
              ))}
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-display text-sm font-semibold text-slate-900">
                No appointment records match your current filter
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Reset filters or book a new appointment to see entries here.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="py-3 px-5">Appointment ID</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Department &amp; Doctor</th>
                  <th className="py-3 px-4">Schedule</th>
                  <th className="py-3 px-4">Status Update</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredAppointments.map((row) => {
                  const isBusy = updatingId === row.id;
                  const isConfirmingDelete = confirmDeleteId === row.id;

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onTrackAppointment(row.id)}
                          className="font-mono text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline tabular-nums"
                        >
                          {row.id}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-900">{row.patientName}</p>
                        <p className="text-xs text-slate-500 tabular-nums">
                          Age {row.patientAge} · {row.contact}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-900">{row.departmentName}</p>
                        <p className="text-xs text-slate-500">{row.doctorName}</p>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <p className="font-mono text-xs text-slate-900 tabular-nums">
                          {row.appointmentDate}
                        </p>
                        <p className="font-mono text-xs text-slate-500 tabular-nums">
                          {row.timeSlot}
                        </p>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <label htmlFor={`status-${row.id}`} className="sr-only">
                            Status for {row.id}
                          </label>
                          <select
                            id={`status-${row.id}`}
                            value={row.status}
                            disabled={isBusy}
                            onChange={(e) =>
                              void handleStatusChange(
                                row.id,
                                e.target.value as AppointmentStatus,
                              )
                            }
                            className={`rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50 ${STATUS_TEXT_CLASS[row.status]}`}
                          >
                            {ALL_STATUSES.map((st) => (
                              <option key={st} value={st} className="text-slate-900 font-normal">
                                {st}
                              </option>
                            ))}
                          </select>
                          {isBusy && (
                            <Loader2
                              className="w-3.5 h-3.5 animate-spin text-blue-700"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-5 text-right whitespace-nowrap">
                        {isConfirmingDelete ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleDelete(row.id)}
                              className="text-xs font-semibold text-red-700 hover:text-red-900"
                            >
                              Confirm Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-xs text-slate-500 hover:text-slate-800"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(row.id)}
                            aria-label={`Delete appointment ${row.id}`}
                            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-700 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Remove</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
};
