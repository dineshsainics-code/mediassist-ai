import React, { useState } from 'react';
import { Check, Clock, Copy, MapPin, Phone } from 'lucide-react';
import { DEPARTMENTS, HOSPITAL_PROFILE } from '../data/hospitalData';
import type { BookingPrefill } from '../types/hospital';

interface HospitalInfoModuleProps {
  onStartBooking: (prefill?: BookingPrefill) => void;
}

export const HospitalInfoModule: React.FC<HospitalInfoModuleProps> = ({ onStartBooking }) => {
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  const emergencyContacts = [
    {
      label: '24/7 Emergency & Trauma Desk',
      number: HOSPITAL_PROFILE.emergencyPhone,
      detail: 'Immediate triage, cardiac emergencies, and acute care',
    },
    {
      label: 'Ambulance Dispatch',
      number: HOSPITAL_PROFILE.ambulanceHelpline,
      detail: 'GPS-equipped ALS/BLS ambulances around the clock',
    },
    {
      label: 'Outpatient Appointment Desk',
      number: HOSPITAL_PROFILE.appointmentDesk,
      detail: 'OPD scheduling, rescheduling, and billing queries',
    },
    {
      label: '24/7 Blood Bank & Transfusion',
      number: HOSPITAL_PROFILE.bloodBankPhone,
      detail: 'Component availability and donor coordination',
    },
    {
      label: 'Hospital Pharmacy Helpdesk',
      number: HOSPITAL_PROFILE.pharmacyPhone,
      detail: 'Ground Floor Main Atrium, open 24 hours',
    },
  ];

  const handleCopyNumber = async (num: string) => {
    try {
      await navigator.clipboard.writeText(num);
      setCopiedPhone(num);
      setTimeout(() => setCopiedPhone(null), 1800);
    } catch {
      // Clipboard restricted
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-blue-700">{HOSPITAL_PROFILE.accreditation}</p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Hospital Information
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {HOSPITAL_PROFILE.hospitalName} (<span lang="hi">{HOSPITAL_PROFILE.hindiHospitalName}</span>) — timings,
            clinical facilities, wing locations, and 24/7 emergency numbers.
          </p>
        </div>

        <p className="flex items-center gap-1.5 text-xs text-slate-600">
          <MapPin className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
          <span>{HOSPITAL_PROFILE.address}</span>
        </p>
      </div>

      <section aria-labelledby="emergency-contacts-heading" className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2
              id="emergency-contacts-heading"
              className="font-display text-lg font-bold text-slate-900"
            >
              Emergency &amp; Patient Helplines
            </h2>
            <p className="text-sm text-slate-600">
              Fictional demonstration hospital numbers for campus navigation.
            </p>
          </div>
          <span className="text-xs font-medium text-red-700">Emergency Open 24/7</span>
        </div>

        <div className="mt-4 divide-y divide-slate-100">
          {emergencyContacts.map((item) => (
            <div
              key={item.label}
              className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                <p className="text-xs text-slate-500">{item.detail}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-blue-800 tabular-nums">
                  <Phone className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
                  <span>{item.number}</span>
                </span>
                <button
                  type="button"
                  onClick={() => void handleCopyNumber(item.number)}
                  aria-label={`Copy ${item.label} number`}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50 text-xs text-slate-600 transition-colors"
                >
                  {copiedPhone === item.number ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section
          aria-labelledby="timings-heading"
          className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6"
        >
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <Clock className="w-4 h-4 text-blue-700" aria-hidden="true" />
            <h2 id="timings-heading" className="font-display text-lg font-bold text-slate-900">
              OPD &amp; Visiting Timings
            </h2>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {HOSPITAL_PROFILE.timings.map((slot) => (
              <div key={slot.label} className="py-3.5 first:pt-1 last:pb-0">
                <p className="text-sm font-semibold text-slate-900">{slot.label}</p>
                <p className="mt-0.5 font-mono text-xs font-medium text-blue-800 tabular-nums">
                  {slot.hours}
                </p>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">{slot.note}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="facilities-heading"
          className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6"
        >
          <div className="pb-4 border-b border-slate-100">
            <h2 id="facilities-heading" className="font-display text-lg font-bold text-slate-900">
              Clinical Facilities &amp; Patient Amenities
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Integrated diagnostics, surgical infrastructure, and accessible campus services.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {HOSPITAL_PROFILE.facilities.map((facility) => (
              <div key={facility.title} className="pb-4 border-b border-slate-100 last:border-b-0">
                <p className="text-xs text-slate-500">
                  {facility.category} · {facility.location}
                </p>
                <h3 className="mt-1 font-display text-sm font-semibold text-slate-900">
                  {facility.title}
                </h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  {facility.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section
        aria-labelledby="department-directory-heading"
        className="bg-white border border-slate-200 rounded-xl overflow-hidden"
      >
        <div className="p-6 pb-4 border-b border-slate-100">
          <h2
            id="department-directory-heading"
            className="font-display text-lg font-bold text-slate-900"
          >
            Department Floor &amp; Wing Directory
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Quick floor locator and consultation desk extensions for all 6 specialties.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                <th className="py-3 px-6">Department</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">OPD Hours</th>
                <th className="py-3 px-4">Desk Ext.</th>
                <th className="py-3 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {DEPARTMENTS.map((dept) => (
                <tr key={dept.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-6">
                    <p className="font-semibold text-slate-900">{dept.name}</p>
                    <p className="text-xs text-slate-500" lang="hi">
                      {dept.hindiName}
                    </p>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                    {dept.floor}, {dept.wing}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                    {dept.opdHours}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                    {dept.consultationDeskExt}
                  </td>
                  <td className="py-3.5 px-6 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() =>
                        onStartBooking({
                          departmentId: dept.id,
                          doctorId: dept.leadDoctorId,
                        })
                      }
                      className="text-xs font-medium text-blue-700 hover:text-blue-900 hover:underline"
                    >
                      Book Visit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
