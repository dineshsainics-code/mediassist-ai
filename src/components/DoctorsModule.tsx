import React, { useEffect, useMemo, useState } from 'react';
import { CalendarPlus, Clock, MapPin, Search } from 'lucide-react';
import { DEPARTMENTS, DOCTORS } from '../data/hospitalData';
import type { BookingPrefill } from '../types/hospital';
import { ResilientImage } from './ResilientImage';

interface DoctorsModuleProps {
  initialDepartmentFilter?: string;
  onStartBooking: (prefill: BookingPrefill) => void;
}

export const DoctorsModule: React.FC<DoctorsModuleProps> = ({
  initialDepartmentFilter = 'all',
  onStartBooking,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>(initialDepartmentFilter);
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'today' | 'hindi'>('all');

  useEffect(() => {
    setDepartmentFilter(initialDepartmentFilter);
  }, [initialDepartmentFilter]);

  const filteredDoctors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return DOCTORS.filter((doc) => {
      if (departmentFilter !== 'all' && doc.departmentId !== departmentFilter) {
        return false;
      }
      if (availabilityFilter === 'today' && !doc.availableToday) {
        return false;
      }
      if (availabilityFilter === 'hindi' && !doc.languages.includes('Hindi')) {
        return false;
      }
      if (!q) return true;
      return (
        doc.name.toLowerCase().includes(q) ||
        doc.specialization.toLowerCase().includes(q) ||
        doc.departmentName.toLowerCase().includes(q) ||
        doc.credentials.toLowerCase().includes(q) ||
        doc.languages.some((l) => l.toLowerCase().includes(q))
      );
    });
  }, [searchQuery, departmentFilter, availabilityFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Doctor Directory
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Browse fictional specialist profiles, spoken languages, consultation hours, and demo
            outpatient slots.
          </p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <label htmlFor="doctor-search" className="sr-only">
            Search doctors by name or specialty
          </label>
          <input
            id="doctor-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, specialty, language..."
            className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div
          role="group"
          aria-label="Filter by department"
          className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0"
        >
          <button
            type="button"
            onClick={() => setDepartmentFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              departmentFilter === 'all'
                ? 'bg-blue-700 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            All Departments
          </button>
          {DEPARTMENTS.map((dept) => (
            <button
              key={dept.id}
              type="button"
              onClick={() => setDepartmentFilter(dept.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                departmentFilter === dept.id
                  ? 'bg-blue-700 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              {dept.name}
            </button>
          ))}
        </div>

        <div
          role="group"
          aria-label="Filter by availability or language"
          className="inline-flex items-center p-1 rounded-lg bg-slate-200/70 self-start lg:self-auto shrink-0"
        >
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'today', label: 'Available Today' },
              { id: 'hindi', label: 'Hindi Speaking' },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setAvailabilityFilter(option.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                availabilityFilter === option.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-500 tabular-nums">
        Showing {filteredDoctors.length} of {DOCTORS.length} specialists
      </p>

      {filteredDoctors.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="font-display text-base font-semibold text-slate-900">
            No specialists match your current filters
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Clear your search query or reset filters to view all 6 fictional hospital specialists.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setDepartmentFilter('all');
              setAvailabilityFilter('all');
            }}
            className="mt-4 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredDoctors.map((doc) => (
            <article
              key={doc.id}
              className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-5"
            >
              <div>
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                    <ResilientImage
                      src={doc.photoUrl}
                      alt={`Portrait of ${doc.name}, ${doc.departmentName}`}
                      fallbackLabel={doc.initials}
                      fallbackVariant="doctor"
                      className="w-full h-full object-cover object-top"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-blue-700">
                      {doc.departmentName} ·{' '}
                      <span className={doc.availableToday ? 'text-emerald-700' : 'text-amber-700'}>
                        {doc.availableToday ? 'OPD Open Today' : 'Next Slot Tomorrow'}
                      </span>
                    </p>
                    <h2 className="mt-1 font-display text-lg font-bold text-slate-900 truncate">
                      {doc.name}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {doc.credentials} · {doc.experienceYears} yrs experience
                    </p>
                    <p className="mt-1.5 text-sm text-slate-700 font-medium">{doc.specialization}</p>
                  </div>
                </div>

                <p className="mt-4 text-sm text-slate-600 leading-relaxed">{doc.bio}</p>

                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-700 shrink-0" aria-hidden="true" />
                    <span>
                      {doc.availabilityDays} · {doc.availabilityHours}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-700 shrink-0" aria-hidden="true" />
                    <span>{doc.roomNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Languages:</span>{' '}
                    <span className="text-slate-800 font-medium">{doc.languages.join(', ')}</span>
                  </div>
                  <div className="tabular-nums">
                    <span className="text-slate-500">Demo Consultation Fee:</span>{' '}
                    <span className="text-slate-800 font-semibold">INR {doc.consultationFee}</span>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-medium text-slate-500 mb-2">
                    Select a demo slot to book directly:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {doc.slots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() =>
                          onStartBooking({
                            departmentId: doc.departmentId,
                            doctorId: doc.id,
                            timeSlot: slot,
                          })
                        }
                        className="px-2.5 py-1.5 rounded-md border border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-xs font-mono text-slate-700 hover:text-blue-800 transition-colors tabular-nums"
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() =>
                    onStartBooking({
                      departmentId: doc.departmentId,
                      doctorId: doc.id,
                    })
                  }
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium transition-colors whitespace-nowrap"
                >
                  <CalendarPlus className="w-4 h-4" aria-hidden="true" />
                  <span>Book Appointment</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
