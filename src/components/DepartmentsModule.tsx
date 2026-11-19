import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Baby,
  Bone,
  Brain,
  Clock,
  HeartPulse,
  MapPin,
  Search,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import { DEPARTMENTS, getDoctorById } from '../data/hospitalData';
import type { BookingPrefill, Department } from '../types/hospital';

interface DepartmentsModuleProps {
  onStartBooking: (prefill: BookingPrefill) => void;
  onViewDepartmentDoctors: (departmentId: string) => void;
}

const DEPARTMENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  cardiology: HeartPulse,
  neurology: Brain,
  orthopedics: Bone,
  pediatrics: Baby,
  dermatology: Sparkles,
  'general-medicine': Stethoscope,
};

export const DepartmentsModule: React.FC<DepartmentsModuleProps> = ({
  onStartBooking,
  onViewDepartmentDoctors,
}) => {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>(DEPARTMENTS[0].id);

  const filteredDepartments = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DEPARTMENTS;
    return DEPARTMENTS.filter(
      (dept) =>
        dept.name.toLowerCase().includes(q) ||
        dept.hindiName.toLowerCase().includes(q) ||
        dept.tagline.toLowerCase().includes(q) ||
        dept.description.toLowerCase().includes(q) ||
        dept.conditions.some((c) => c.toLowerCase().includes(q)) ||
        dept.services.some((s) => s.toLowerCase().includes(q)) ||
        dept.keywords.some((k) => k.toLowerCase().includes(q)),
    );
  }, [query]);

  const activeDepartment: Department | undefined =
    filteredDepartments.find((d) => d.id === selectedId) ?? filteredDepartments[0];

  const leadDoctor = activeDepartment ? getDoctorById(activeDepartment.leadDoctorId) : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Department Finder
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Explore all 6 clinical specialties or search by health concern, diagnostic test, or
            department name.
          </p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <label htmlFor="department-search" className="sr-only">
            Search departments or concerns
          </label>
          <input
            id="department-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search e.g. heart, knee, child, skin..."
            className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      {filteredDepartments.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="font-display text-base font-semibold text-slate-900">
            No matching departments found for &ldquo;{query}&rdquo;
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Try searching for Cardiology, Neurology, Orthopedics, Pediatrics, Dermatology, or
            General Medicine.
          </p>
          <button
            type="button"
            onClick={() => setQuery('')}
            className="mt-4 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium transition-colors"
          >
            Show All 6 Departments
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-3">
            {filteredDepartments.map((dept) => {
              const Icon = DEPARTMENT_ICONS[dept.id] ?? Stethoscope;
              const isSelected = activeDepartment?.id === dept.id;

              return (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => setSelectedId(dept.id)}
                  className={`w-full text-left rounded-xl border p-4 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-400'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <span
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-blue-700 text-white' : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      <Icon className="w-5 h-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="font-display text-base font-semibold text-slate-900">
                          {dept.name}
                        </h2>
                        <span className="text-xs text-slate-500 whitespace-nowrap">
                          {dept.floor}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5" lang="hi">
                        {dept.hindiName}
                      </p>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">{dept.tagline}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {activeDepartment && (
            <section
              aria-label={`${activeDepartment.name} details`}
              className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6"
            >
              <div className="pb-5 border-b border-slate-100">
                <p className="text-xs font-medium text-blue-700">
                  {activeDepartment.floor} · {activeDepartment.wing} ·{' '}
                  {activeDepartment.consultationDeskExt}
                </p>
                <h2 className="mt-1.5 font-display text-2xl font-bold text-slate-900">
                  {activeDepartment.name}
                </h2>
                <p className="text-sm text-slate-500" lang="hi">
                  {activeDepartment.hindiName}
                </p>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  {activeDepartment.description}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
                    <span>OPD: {activeDepartment.opdHours}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
                    <span>
                      {activeDepartment.floor}, {activeDepartment.wing}
                    </span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-display text-sm font-semibold text-slate-900">
                    Common Consultations
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    {activeDepartment.conditions.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="text-blue-700 font-semibold" aria-hidden="true">
                          –
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-display text-sm font-semibold text-slate-900">
                    Available Diagnostics &amp; Services
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    {activeDepartment.services.map((service) => (
                      <li key={service} className="flex items-start gap-2">
                        <span className="text-blue-700 font-semibold" aria-hidden="true">
                          –
                        </span>
                        <span>{service}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {leadDoctor && (
                <div className="pt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-slate-500">
                      Lead Specialist · {activeDepartment.teamSize} clinicians in department
                    </p>
                    <p className="mt-0.5 font-display text-base font-semibold text-slate-900">
                      {leadDoctor.name}{' '}
                      <span className="text-sm font-normal text-slate-500">
                        ({leadDoctor.credentials})
                      </span>
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {leadDoctor.availabilityDays} · {leadDoctor.availabilityHours} ·{' '}
                      {leadDoctor.roomNumber}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => onViewDepartmentDoctors(activeDepartment.id)}
                      className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-medium transition-colors whitespace-nowrap"
                    >
                      View Profile
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onStartBooking({
                          departmentId: activeDepartment.id,
                          doctorId: leadDoctor.id,
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium transition-colors whitespace-nowrap"
                    >
                      <span>Book Consultation</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
};
