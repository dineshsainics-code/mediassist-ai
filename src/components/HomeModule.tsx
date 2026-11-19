import React from 'react';
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarPlus,
  ClipboardCheck,
  Info,
  MessageSquareText,
  Stethoscope,
} from 'lucide-react';
import { DEPARTMENTS, DOCTORS, HOSPITAL_PROFILE } from '../data/hospitalData';
import type { BookingPrefill, DashboardStats, ModuleId } from '../types/hospital';
import { ResilientImage } from './ResilientImage';

interface HomeModuleProps {
  stats: DashboardStats | null;
  onNavigate: (module: ModuleId) => void;
  onStartBooking: (prefill?: BookingPrefill) => void;
}

export const HomeModule: React.FC<HomeModuleProps> = ({
  stats,
  onNavigate,
  onStartBooking,
}) => {
  const services: Array<{
    id: ModuleId;
    title: string;
    meta: string;
    description: string;
    cta: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: 'assistant',
      title: 'AI Patient Assistant',
      meta: 'English, हिन्दी & Hinglish',
      description:
        'Ask questions about departments, consultation schedules, timings, and booking steps in English, Hindi, or Hinglish.',
      cta: 'Start conversation',
      icon: MessageSquareText,
    },
    {
      id: 'departments',
      title: 'Department Finder',
      meta: `${DEPARTMENTS.length} clinical specialties`,
      description:
        'Search Cardiology, Neurology, Orthopedics, Pediatrics, Dermatology, and General Medicine by concern or service.',
      cta: 'Explore departments',
      icon: Building2,
    },
    {
      id: 'doctors',
      title: 'Doctor Directory',
      meta: `${DOCTORS.length} senior specialists`,
      description:
        'Browse specialist credentials, spoken languages, OPD consultation hours, and demo appointment slots.',
      cta: 'View specialists',
      icon: Stethoscope,
    },
    {
      id: 'booking',
      title: 'Appointment Booking',
      meta: 'Instant unique Appointment ID',
      description:
        'Submit outpatient consultation requests with real-time validation and persistent confirmation records.',
      cta: 'Schedule a visit',
      icon: CalendarPlus,
    },
    {
      id: 'tracker',
      title: 'Appointment Tracker',
      meta: 'Live database lookup',
      description:
        'Check your saved request status, assigned doctor, clinic wing, and scheduled time using your Appointment ID.',
      cta: 'Track status',
      icon: ClipboardCheck,
    },
    {
      id: 'info',
      title: 'Hospital Information',
      meta: '24/7 emergency & OPD hours',
      description:
        'Access visiting hours, diagnostic lab timings, floor maps, facilities, and direct emergency helpline numbers.',
      cta: 'View hospital guide',
      icon: Info,
    },
  ];

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-blue-700">
              {HOSPITAL_PROFILE.hospitalName} · {HOSPITAL_PROFILE.accreditation}
            </p>
            <h1 className="mt-3 font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-[1.15] [text-wrap:balance]">
              Clear, guided hospital care from first question to confirmed visit.
            </h1>
            <p className="mt-4 text-base text-slate-600 leading-relaxed max-w-2xl">
              MediAssist AI helps patients and families find the right specialty department,
              explore fictional doctor schedules, request outpatient appointments, and track live
              booking updates in English, Hindi, or Hinglish.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onStartBooking()}
              className="px-5 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              Book an Appointment
            </button>
            <button
              type="button"
              onClick={() => onNavigate('assistant')}
              className="px-5 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              Ask MediAssist AI
            </button>
            <button
              type="button"
              onClick={() => onNavigate('tracker')}
              className="px-4 py-2.5 text-sm font-medium text-blue-700 hover:text-blue-900 transition-colors whitespace-nowrap shrink-0"
            >
              Track Existing ID
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 relative rounded-xl overflow-hidden border border-slate-200 min-h-[260px] lg:min-h-0">
          <ResilientImage
            src={HOSPITAL_PROFILE.heroImageUrl}
            alt="Sunlit modern glass atrium and patient welcome lounge at Horizon Care Multi-Specialty Hospital"
            fallbackLabel={HOSPITAL_PROFILE.hospitalName}
            fallbackVariant="hospital"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/35 to-transparent p-5 text-white">
            <p className="text-xs font-medium text-blue-100">24/7 Emergency &amp; Trauma Triage</p>
            <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
              {HOSPITAL_PROFILE.emergencyPhone}
            </p>
          </div>
        </div>
      </section>

      <section aria-label="Hospital summary metrics">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-medium text-slate-500">Clinical Departments</p>
            <p className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
              {DEPARTMENTS.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">Multi-specialty outpatient wings</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-medium text-slate-500">Featured Specialists</p>
            <p className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
              {DOCTORS.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {DOCTORS.filter((d) => d.availableToday).length} available for OPD today
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-medium text-slate-500">Saved Appointments</p>
            <p className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
              {stats ? stats.totalAppointments : '—'}
            </p>
            <p className="mt-1 text-xs text-slate-500 tabular-nums">
              {stats ? `${stats.pendingCount} pending · ${stats.confirmedCount} confirmed` : 'Loading live count'}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-medium text-slate-500">Outpatient Hours</p>
            <p className="mt-2 font-display text-2xl font-bold text-slate-900 tabular-nums">
              08:30 – 18:00
            </p>
            <p className="mt-1 text-xs text-slate-500">Mon – Sat · Emergency 24/7</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="patient-services-heading" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2
              id="patient-services-heading"
              className="font-display text-xl font-bold tracking-tight text-slate-900"
            >
              Patient &amp; Hospital Services
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Navigate hospital care modules directly without switching applications.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('admin')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-900 transition-colors whitespace-nowrap shrink-0"
          >
            <BarChart3 className="w-4 h-4" aria-hidden="true" />
            <span>Open Admin Dashboard</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <button
                key={service.id}
                type="button"
                onClick={() => onNavigate(service.id)}
                className="group text-left bg-white border border-slate-200 hover:border-blue-300 rounded-xl p-6 transition-colors duration-150 flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" aria-hidden="true" />
                    </span>
                    <span className="text-xs text-slate-500">{service.meta}</span>
                  </div>
                  <h3 className="mt-4 font-display text-base font-semibold text-slate-900 group-hover:text-blue-800 transition-colors">
                    {service.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                    {service.description}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-sm font-medium text-blue-700">
                  <span>{service.cta}</span>
                  <ArrowRight
                    className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="quick-departments-heading" className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
          <div>
            <h2
              id="quick-departments-heading"
              className="font-display text-lg font-bold text-slate-900"
            >
              Core Specialty Departments
            </h2>
            <p className="mt-0.5 text-sm text-slate-600">
              Select a department to schedule an outpatient consultation directly.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('departments')}
            className="text-sm font-medium text-blue-700 hover:text-blue-900 transition-colors whitespace-nowrap shrink-0"
          >
            Compare all 6 departments
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
          {DEPARTMENTS.map((dept) => (
            <div key={dept.id} className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-display text-sm font-semibold text-slate-900">{dept.name}</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {dept.floor} · {dept.opdHours}
                </p>
                <p className="mt-1 text-xs text-slate-600 line-clamp-2">{dept.tagline}</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  onStartBooking({
                    departmentId: dept.id,
                    doctorId: dept.leadDoctorId,
                  })
                }
                className="text-xs font-medium text-blue-700 hover:text-blue-900 whitespace-nowrap shrink-0 mt-0.5"
              >
                Book
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
