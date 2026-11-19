import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Loader2,
} from 'lucide-react';
import {
  DEPARTMENTS,
  getDepartmentById,
  getDoctorById,
  getDoctorsByDepartment,
} from '../data/hospitalData';
import { submitAppointment } from '../services/api';
import type { AppointmentRecord, BookingPrefill } from '../types/hospital';

interface BookingModuleProps {
  prefill?: BookingPrefill;
  onAppointmentCreated: (appointment: AppointmentRecord) => void;
  onTrackAppointment: (appointmentId: string) => void;
}

function getDefaultDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().slice(0, 10);
}

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export const BookingModule: React.FC<BookingModuleProps> = ({
  prefill,
  onAppointmentCreated,
  onTrackAppointment,
}) => {
  const initialDepartmentId = prefill?.departmentId ?? DEPARTMENTS[0].id;
  const initialDepartmentDoctors = getDoctorsByDepartment(initialDepartmentId);
  const initialDoctorId =
    prefill?.doctorId && initialDepartmentDoctors.some((d) => d.id === prefill.doctorId)
      ? prefill.doctorId
      : initialDepartmentDoctors[0]?.id ?? '';
  const initialDoctor = getDoctorById(initialDoctorId);

  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [contact, setContact] = useState('');
  const [departmentId, setDepartmentId] = useState(initialDepartmentId);
  const [doctorId, setDoctorId] = useState(initialDoctorId);
  const [appointmentDate, setAppointmentDate] = useState(getDefaultDate);
  const [timeSlot, setTimeSlot] = useState(
    prefill?.timeSlot ?? initialDoctor?.slots[0] ?? '09:30 AM',
  );
  const [reason, setReason] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedRecord, setConfirmedRecord] = useState<AppointmentRecord | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (!prefill) return;
    if (prefill.departmentId) {
      setDepartmentId(prefill.departmentId);
      const deptDocs = getDoctorsByDepartment(prefill.departmentId);
      const chosenDocId =
        prefill.doctorId && deptDocs.some((d) => d.id === prefill.doctorId)
          ? prefill.doctorId
          : deptDocs[0]?.id ?? '';
      setDoctorId(chosenDocId);
      const chosenDoc = getDoctorById(chosenDocId);
      setTimeSlot(prefill.timeSlot ?? chosenDoc?.slots[0] ?? '09:30 AM');
      setConfirmedRecord(null);
    }
  }, [prefill]);

  const availableDoctors = useMemo(
    () => getDoctorsByDepartment(departmentId),
    [departmentId],
  );

  const selectedDepartment = getDepartmentById(departmentId);
  const selectedDoctor = getDoctorById(doctorId) ?? availableDoctors[0];

  const handleDepartmentChange = (nextDeptId: string) => {
    setDepartmentId(nextDeptId);
    const docs = getDoctorsByDepartment(nextDeptId);
    const nextDoc = docs[0];
    setDoctorId(nextDoc?.id ?? '');
    setTimeSlot(nextDoc?.slots[0] ?? '09:30 AM');
    setFieldErrors((prev) => ({ ...prev, departmentId: '', doctorId: '' }));
  };

  const handleDoctorChange = (nextDocId: string) => {
    setDoctorId(nextDocId);
    const doc = getDoctorById(nextDocId);
    if (doc && !doc.slots.includes(timeSlot)) {
      setTimeSlot(doc.slots[0] ?? '09:30 AM');
    }
  };

  const validateForm = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    const trimmedName = patientName.trim();
    const ageNum = Number(patientAge);
    const trimmedContact = contact.trim();

    if (trimmedName.length < 2) {
      errors.patientName = 'Enter the patient full name (at least 2 characters).';
    }
    if (!patientAge || !Number.isInteger(ageNum) || ageNum < 1 || ageNum > 120) {
      errors.patientAge = 'Enter a valid age between 1 and 120.';
    }
    const validPhone = /^[\d+\-\s()]{7,20}$/.test(trimmedContact);
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedContact);
    if (!validPhone && !validEmail) {
      errors.contact = 'Enter a valid phone number or email address.';
    }
    if (!departmentId) {
      errors.departmentId = 'Select a hospital department.';
    }
    if (!doctorId) {
      errors.doctorId = 'Select an available specialist.';
    }
    if (!appointmentDate || appointmentDate < getTodayDate()) {
      errors.appointmentDate = 'Select today or a future appointment date.';
    }
    if (!timeSlot) {
      errors.timeSlot = 'Select a preferred consultation time slot.';
    }
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const errors = validateForm();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await submitAppointment({
        patientName: patientName.trim(),
        patientAge: Number(patientAge),
        contact: contact.trim(),
        departmentId,
        doctorId,
        appointmentDate,
        timeSlot,
        reason: reason.trim(),
      });
      setConfirmedRecord(created);
      onAppointmentCreated(created);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Unable to submit appointment request.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      // Clipboard API unavailable
    }
  };

  const handleBookAnother = () => {
    setConfirmedRecord(null);
    setPatientName('');
    setPatientAge('');
    setContact('');
    setReason('');
    setFieldErrors({});
    setSubmitError(null);
  };

  if (confirmedRecord) {
    const dept = getDepartmentById(confirmedRecord.departmentId);
    const doc = getDoctorById(confirmedRecord.doctorId);

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-3.5 pb-5 border-b border-slate-100">
            <span className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-medium text-emerald-700">
                Appointment Request Saved · Status: {confirmedRecord.status}
              </p>
              <h1 className="mt-1 font-display text-2xl font-bold text-slate-900">
                Booking Confirmation Receipt
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Your outpatient request has been persisted in the hospital database. Keep your
                Appointment ID below to track status updates.
              </p>
            </div>
          </div>

          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-blue-800">Unique Appointment ID</p>
              <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums tracking-tight">
                {confirmedRecord.id}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleCopyId(confirmedRecord.id)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-blue-300 bg-white hover:bg-blue-50 text-xs font-medium text-blue-800 transition-colors whitespace-nowrap self-start sm:self-auto"
            >
              {copiedId ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                  <span>Copied ID</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Copy ID</span>
                </>
              )}
            </button>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Patient Name &amp; Age</dt>
              <dd className="mt-0.5 font-medium text-slate-900">
                {confirmedRecord.patientName} ({confirmedRecord.patientAge} yrs)
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Contact</dt>
              <dd className="mt-0.5 font-medium text-slate-900 tabular-nums">
                {confirmedRecord.contact}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Department &amp; Wing</dt>
              <dd className="mt-0.5 font-medium text-slate-900">
                {confirmedRecord.departmentName}
                {dept ? ` · ${dept.floor}, ${dept.wing}` : ''}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Assigned Specialist</dt>
              <dd className="mt-0.5 font-medium text-slate-900">
                {confirmedRecord.doctorName}
                {doc ? ` · ${doc.roomNumber}` : ''}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Requested Date &amp; Time Slot</dt>
              <dd className="mt-0.5 font-mono font-medium text-slate-900 tabular-nums">
                {confirmedRecord.appointmentDate} · {confirmedRecord.timeSlot}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Current Status</dt>
              <dd className="mt-0.5 font-medium text-amber-700">{confirmedRecord.status}</dd>
            </div>
          </dl>

          {confirmedRecord.reason && (
            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500">Reason for Visit</p>
              <p className="mt-1 text-sm text-slate-700">{confirmedRecord.reason}</p>
            </div>
          )}

          <div className="pt-5 border-t border-slate-100 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onTrackAppointment(confirmedRecord.id)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium transition-colors whitespace-nowrap"
            >
              <ClipboardCheck className="w-4 h-4" aria-hidden="true" />
              <span>Track This Appointment</span>
            </button>
            <button
              type="button"
              onClick={handleBookAnother}
              className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-medium transition-colors whitespace-nowrap"
            >
              Submit Another Request
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Appointment Booking
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Submit an outpatient appointment request using fictional demo details to generate a
          persistent Appointment ID.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6"
        >
          {submitError && (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-start gap-2.5 text-sm text-red-800"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="space-y-4">
            <h2 className="font-display text-base font-semibold text-slate-900 pb-2 border-b border-slate-100">
              1. Patient Information (Fictional Demo Data Only)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-8">
                <label
                  htmlFor="patient-name"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Patient Full Name <span className="text-red-600">*</span>
                </label>
                <input
                  id="patient-name"
                  type="text"
                  value={patientName}
                  onChange={(e) => {
                    setPatientName(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, patientName: '' }));
                  }}
                  placeholder="e.g., Rohan Sharma"
                  aria-invalid={Boolean(fieldErrors.patientName)}
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                    fieldErrors.patientName ? 'border-red-400 bg-red-50/30' : 'border-slate-300'
                  }`}
                />
                {fieldErrors.patientName && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.patientName}</p>
                )}
              </div>

              <div className="sm:col-span-4">
                <label
                  htmlFor="patient-age"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Age (Years) <span className="text-red-600">*</span>
                </label>
                <input
                  id="patient-age"
                  type="number"
                  min={1}
                  max={120}
                  value={patientAge}
                  onChange={(e) => {
                    setPatientAge(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, patientAge: '' }));
                  }}
                  placeholder="e.g., 36"
                  aria-invalid={Boolean(fieldErrors.patientAge)}
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 tabular-nums placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                    fieldErrors.patientAge ? 'border-red-400 bg-red-50/30' : 'border-slate-300'
                  }`}
                />
                {fieldErrors.patientAge && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.patientAge}</p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="patient-contact"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Phone Number or Email <span className="text-red-600">*</span>
              </label>
              <input
                id="patient-contact"
                type="text"
                value={contact}
                onChange={(e) => {
                  setContact(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, contact: '' }));
                }}
                placeholder="e.g., +91-98100-55500 or demo.patient@example.org"
                aria-invalid={Boolean(fieldErrors.contact)}
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                  fieldErrors.contact ? 'border-red-400 bg-red-50/30' : 'border-slate-300'
                }`}
              />
              {fieldErrors.contact && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.contact}</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="font-display text-base font-semibold text-slate-900 pb-2 border-b border-slate-100">
              2. Department, Specialist &amp; Schedule
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="booking-department"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Department <span className="text-red-600">*</span>
                </label>
                <select
                  id="booking-department"
                  value={departmentId}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.floor})
                    </option>
                  ))}
                </select>
                {fieldErrors.departmentId && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.departmentId}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="booking-doctor"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Specialist Doctor <span className="text-red-600">*</span>
                </label>
                <select
                  id="booking-doctor"
                  value={doctorId}
                  onChange={(e) => handleDoctorChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {availableDoctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name} — {doc.credentials}
                    </option>
                  ))}
                </select>
                {fieldErrors.doctorId && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.doctorId}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="booking-date"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Preferred Date <span className="text-red-600">*</span>
                </label>
                <input
                  id="booking-date"
                  type="date"
                  min={getTodayDate()}
                  value={appointmentDate}
                  onChange={(e) => {
                    setAppointmentDate(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, appointmentDate: '' }));
                  }}
                  aria-invalid={Boolean(fieldErrors.appointmentDate)}
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                    fieldErrors.appointmentDate ? 'border-red-400 bg-red-50/30' : 'border-slate-300'
                  }`}
                />
                {fieldErrors.appointmentDate && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.appointmentDate}</p>
                )}
              </div>

              <div>
                <span className="block text-xs font-medium text-slate-700 mb-1.5">
                  Preferred Time Slot <span className="text-red-600">*</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {(selectedDoctor?.slots ?? ['09:30 AM', '11:00 AM', '02:00 PM']).map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => {
                        setTimeSlot(slot);
                        setFieldErrors((prev) => ({ ...prev, timeSlot: '' }));
                      }}
                      className={`px-3 py-2 rounded-lg text-xs font-mono tabular-nums border transition-colors ${
                        timeSlot === slot
                          ? 'bg-blue-700 border-blue-700 text-white font-medium'
                          : 'bg-white border-slate-300 text-slate-700 hover:border-blue-400'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
                {fieldErrors.timeSlot && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.timeSlot}</p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="booking-reason"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Visit Note (Optional)
              </label>
              <textarea
                id="booking-reason"
                rows={3}
                maxLength={400}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Brief note for the clinic desk (e.g., annual preventive screening or follow-up check)."
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              Do not enter real sensitive medical records. Fictional demo entries only.
            </p>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              <span>{isSubmitting ? 'Saving Request...' : 'Confirm Appointment Request'}</span>
            </button>
          </div>
        </form>

        <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <h2 className="font-display text-base font-semibold text-slate-900 pb-3 border-b border-slate-100">
            Selected Clinic Summary
          </h2>

          {selectedDepartment && selectedDoctor && (
            <dl className="space-y-3.5 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Department</dt>
                <dd className="mt-0.5 font-semibold text-slate-900">{selectedDepartment.name}</dd>
                <dd className="text-xs text-slate-500">
                  {selectedDepartment.floor} · {selectedDepartment.wing}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Specialist</dt>
                <dd className="mt-0.5 font-semibold text-slate-900">{selectedDoctor.name}</dd>
                <dd className="text-xs text-slate-500">{selectedDoctor.specialization}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">OPD Schedule &amp; Room</dt>
                <dd className="mt-0.5 text-slate-800">{selectedDoctor.availabilityDays}</dd>
                <dd className="text-xs text-slate-500">{selectedDoctor.roomNumber}</dd>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                <div>
                  <dt className="text-xs text-slate-500">Date</dt>
                  <dd className="mt-0.5 font-mono text-xs font-semibold text-slate-900 tabular-nums">
                    {appointmentDate}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Slot</dt>
                  <dd className="mt-0.5 font-mono text-xs font-semibold text-slate-900 tabular-nums">
                    {timeSlot}
                  </dd>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Demo Consultation Fee</span>
                <span className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                  INR {selectedDoctor.consultationFee}
                </span>
              </div>
            </dl>
          )}

          <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 leading-relaxed">
            Upon submission, your request receives a unique Appointment ID stored in our persistent
            database and immediately appears in the Appointment Tracker and Admin Dashboard.
          </div>
        </aside>
      </div>
    </div>
  );
};
