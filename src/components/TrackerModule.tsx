import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Search,
  User,
  XCircle,
} from 'lucide-react';
import { getDepartmentById, getDoctorById } from '../data/hospitalData';
import { fetchAppointmentById } from '../services/api';
import type { AppointmentRecord, AppointmentStatus } from '../types/hospital';

interface TrackerModuleProps {
  initialAppointmentId?: string;
  recentAppointments: AppointmentRecord[];
  onBookNew: () => void;
}

const STATUS_META: Record<
  AppointmentStatus,
  { colorClass: string; description: string; stepIndex: number }
> = {
  Pending: {
    colorClass: 'text-amber-700',
    description: 'Request received and queued for hospital desk confirmation.',
    stepIndex: 0,
  },
  Confirmed: {
    colorClass: 'text-blue-700',
    description: 'Appointment slot is confirmed. Please arrive 15 minutes before your time slot.',
    stepIndex: 1,
  },
  Completed: {
    colorClass: 'text-emerald-700',
    description: 'Outpatient consultation has been marked completed by the clinic desk.',
    stepIndex: 2,
  },
  Cancelled: {
    colorClass: 'text-red-700',
    description: 'This appointment request was cancelled. You may schedule a new visit anytime.',
    stepIndex: -1,
  },
};

export const TrackerModule: React.FC<TrackerModuleProps> = ({
  initialAppointmentId = '',
  recentAppointments,
  onBookNew,
}) => {
  const [lookupId, setLookupId] = useState(initialAppointmentId);
  const [record, setRecord] = useState<AppointmentRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const performLookup = async (idToFetch: string) => {
    const cleaned = idToFetch.trim().toUpperCase();
    if (!cleaned) {
      setErrorMessage('Enter an Appointment ID (for example, MA-2026-1042).');
      return;
    }

    setLookupId(cleaned);
    setIsLoading(true);
    setErrorMessage(null);
    setHasSearched(true);

    try {
      const found = await fetchAppointmentById(cleaned);
      setRecord(found);
    } catch (err) {
      setRecord(null);
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to locate an appointment with that ID.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialAppointmentId) {
      void performLookup(initialAppointmentId);
    }
  }, [initialAppointmentId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void performLookup(lookupId);
  };

  const dept = record ? getDepartmentById(record.departmentId) : undefined;
  const doc = record ? getDoctorById(record.doctorId) : undefined;
  const statusInfo = record ? STATUS_META[record.status] : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Appointment Tracker
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Look up real saved appointment records and live status updates using your unique
          Appointment ID.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
      >
        <label htmlFor="tracker-id-input" className="block text-sm font-semibold text-slate-900">
          Enter Appointment ID
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="tracker-id-input"
              type="text"
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
              placeholder="e.g., MA-2026-1042"
              className="w-full rounded-lg border border-slate-300 pl-10 pr-4 py-2.5 font-mono text-sm uppercase text-slate-900 placeholder:normal-case placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0"
          >
            {isLoading ? 'Checking...' : 'Track Appointment'}
          </button>
        </div>

        {recentAppointments.length > 0 && (
          <div className="pt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>Recent saved IDs:</span>
            {recentAppointments.slice(0, 5).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void performLookup(item.id)}
                className="font-mono text-blue-700 hover:text-blue-900 hover:underline tabular-nums px-1.5 py-0.5"
              >
                {item.id}
              </button>
            ))}
          </div>
        )}
      </form>

      {isLoading && (
        <div
          aria-live="polite"
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 animate-pulse"
        >
          <div className="h-5 w-48 bg-slate-200 rounded" />
          <div className="h-4 w-72 bg-slate-100 rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <div className="h-16 bg-slate-100 rounded-lg" />
            <div className="h-16 bg-slate-100 rounded-lg" />
            <div className="h-16 bg-slate-100 rounded-lg" />
          </div>
        </div>
      )}

      {!isLoading && errorMessage && (
        <div
          role="alert"
          className="bg-white border border-red-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-display text-sm font-semibold text-slate-900">
                Appointment Record Not Found
              </p>
              <p className="mt-0.5 text-sm text-slate-600">{errorMessage}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onBookNew}
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-sm font-medium text-slate-800 whitespace-nowrap shrink-0"
          >
            Book New Appointment
          </button>
        </div>
      )}

      {!isLoading && !hasSearched && !record && !errorMessage && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <p className="font-display text-base font-semibold text-slate-900">
            Enter an Appointment ID above to inspect live status
          </p>
          <p className="mt-1 text-sm text-slate-600 max-w-lg mx-auto">
            Select any of the recent saved IDs listed under the search bar or use an ID generated
            from the Appointment Booking module.
          </p>
        </div>
      )}

      {!isLoading && record && statusInfo && (
        <section
          aria-label="Tracked appointment details"
          className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-100">
            <div>
              <p className="font-mono text-xs text-slate-500 tabular-nums">
                Appointment ID · {record.id}
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold text-slate-900">
                {record.departmentName} Consultation
              </h2>
              <p className="mt-1 text-sm text-slate-600">{statusInfo.description}</p>
            </div>
            <div className="sm:text-right shrink-0">
              <p className="text-xs text-slate-500">Current Status</p>
              <p className={`mt-0.5 font-display text-lg font-bold ${statusInfo.colorClass}`}>
                {record.status}
              </p>
            </div>
          </div>

          {record.status === 'Cancelled' ? (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2.5 text-sm text-red-800">
              <XCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                Status: Cancelled · Last updated{' '}
                <span className="font-mono tabular-nums">
                  {new Date(record.updatedAt).toLocaleString()}
                </span>
              </span>
            </div>
          ) : (
            <ol className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(['Pending', 'Confirmed', 'Completed'] as const).map((step, idx) => {
                const reached = statusInfo.stepIndex >= idx;
                return (
                  <li
                    key={step}
                    className={`rounded-lg border px-4 py-3 flex items-center gap-3 ${
                      reached
                        ? 'border-blue-300 bg-blue-50/50 text-slate-900'
                        : 'border-slate-200 bg-slate-50/50 text-slate-400'
                    }`}
                  >
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 ${reached ? 'text-blue-700' : 'text-slate-300'}`}
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-xs font-mono tabular-nums">Step 0{idx + 1}</p>
                      <p className="text-sm font-semibold">{step}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-2">
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                <User className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
                <span>Patient</span>
              </p>
              <p className="text-sm font-semibold text-slate-900">{record.patientName}</p>
              <p className="text-xs text-slate-500 tabular-nums">
                Age {record.patientAge} · {record.contact}
              </p>
            </div>

            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                <Calendar className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
                <span>Scheduled Date</span>
              </p>
              <p className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                {record.appointmentDate}
              </p>
              <p className="font-mono text-xs text-slate-500 tabular-nums">{record.timeSlot}</p>
            </div>

            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                <MapPin className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
                <span>Specialist &amp; Room</span>
              </p>
              <p className="text-sm font-semibold text-slate-900">{record.doctorName}</p>
              <p className="text-xs text-slate-500">
                {doc ? doc.roomNumber : dept ? `${dept.floor}, ${dept.wing}` : record.departmentName}
              </p>
            </div>

            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
                <span>Last Updated</span>
              </p>
              <p className="font-mono text-xs font-medium text-slate-900 tabular-nums">
                {new Date(record.updatedAt).toLocaleDateString()}
              </p>
              <p className="font-mono text-xs text-slate-500 tabular-nums">
                {new Date(record.updatedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          {record.reason && (
            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500">Submitted Visit Note</p>
              <p className="mt-1 text-sm text-slate-700">{record.reason}</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
