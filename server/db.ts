import Database from 'better-sqlite3';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { DEPARTMENTS, DOCTORS, getDepartmentById, getDoctorById } from '../src/data/hospitalData';
import type { AppointmentRecord, AppointmentStatus, DashboardStats } from '../src/types/hospital';

const DEFAULT_DB_PATH = path.resolve(process.cwd(), 'data', 'mediassist.db');

function resolveDatabasePath(): string {
  const raw = process.env.DATABASE_PATH?.trim().replace(/^["']|["']$/g, '').trim();
  if (!raw) {
    return DEFAULT_DB_PATH;
  }
  const resolved = path.resolve(process.cwd(), raw);
  if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
    return path.join(resolved, 'mediassist.db');
  }
  return resolved;
}

const DB_PATH = resolveDatabasePath();

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('busy_timeout = 5000');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    patient_name TEXT NOT NULL,
    patient_age INTEGER NOT NULL,
    contact TEXT NOT NULL,
    department_id TEXT NOT NULL,
    department_name TEXT NOT NULL,
    doctor_id TEXT NOT NULL,
    doctor_name TEXT NOT NULL,
    appointment_date TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    reason TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Pending',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
  CREATE INDEX IF NOT EXISTS idx_appointments_department ON appointments(department_id);
  CREATE INDEX IF NOT EXISTS idx_appointments_created ON appointments(created_at DESC);
`);

interface AppointmentRow {
  id: string;
  patient_name: string;
  patient_age: number;
  contact: string;
  department_id: string;
  department_name: string;
  doctor_id: string;
  doctor_name: string;
  appointment_date: string;
  time_slot: string;
  reason: string;
  status: AppointmentStatus;
  created_at: string;
  updated_at: string;
}

function mapRow(row: AppointmentRow): AppointmentRecord {
  return {
    id: row.id,
    patientName: row.patient_name,
    patientAge: row.patient_age,
    contact: row.contact,
    departmentId: row.department_id,
    departmentName: row.department_name,
    doctorId: row.doctor_id,
    doctorName: row.doctor_name,
    appointmentDate: row.appointment_date,
    timeSlot: row.time_slot,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function offsetDate(daysFromToday: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

function seedDemoAppointmentsIfEmpty(): void {
  const row = db.prepare('SELECT COUNT(*) as total FROM appointments').get() as { total: number };
  if (row.total > 0) {
    return;
  }

  const now = new Date();
  const sampleRecords: Array<{
    id: string;
    patientName: string;
    patientAge: number;
    contact: string;
    departmentId: string;
    doctorId: string;
    appointmentDate: string;
    timeSlot: string;
    reason: string;
    status: AppointmentStatus;
    hoursAgo: number;
  }> = [
    {
      id: 'MA-2026-1042',
      patientName: 'Aarav Mehta',
      patientAge: 46,
      contact: '+91-98100-01042',
      departmentId: 'cardiology',
      doctorId: 'doc-priya-sharma',
      appointmentDate: offsetDate(1),
      timeSlot: '09:30 AM',
      reason: 'Annual preventive cardiac checkup and ECG review',
      status: 'Confirmed',
      hoursAgo: 28,
    },
    {
      id: 'MA-2026-1043',
      patientName: 'Sunita Verma',
      patientAge: 34,
      contact: 'sunita.verma@demo-mail.org',
      departmentId: 'neurology',
      doctorId: 'doc-rajesh-sharma',
      appointmentDate: offsetDate(2),
      timeSlot: '11:30 AM',
      reason: 'Follow-up consultation for recurring migraines',
      status: 'Pending',
      hoursAgo: 22,
    },
    {
      id: 'MA-2026-1044',
      patientName: 'Rohan Kapoor',
      patientAge: 52,
      contact: '+91-98100-01044',
      departmentId: 'orthopedics',
      doctorId: 'doc-mark-thompson',
      appointmentDate: offsetDate(1),
      timeSlot: '11:00 AM',
      reason: 'Right knee stiffness and physiotherapy guidance',
      status: 'Confirmed',
      hoursAgo: 18,
    },
    {
      id: 'MA-2026-1045',
      patientName: 'Diya Malhotra',
      patientAge: 6,
      contact: '+91-98100-01045',
      departmentId: 'pediatrics',
      doctorId: 'doc-ananya-kulkarni',
      appointmentDate: offsetDate(0),
      timeSlot: '10:15 AM',
      reason: 'Scheduled childhood immunization and growth check',
      status: 'Completed',
      hoursAgo: 16,
    },
    {
      id: 'MA-2026-1046',
      patientName: 'Neha Joshi',
      patientAge: 29,
      contact: 'neha.joshi@demo-mail.org',
      departmentId: 'dermatology',
      doctorId: 'doc-sarah-jenkins',
      appointmentDate: offsetDate(3),
      timeSlot: '02:00 PM',
      reason: 'Seasonal skin allergy consultation',
      status: 'Pending',
      hoursAgo: 12,
    },
    {
      id: 'MA-2026-1047',
      patientName: 'Vikram Deshmukh',
      patientAge: 61,
      contact: '+91-98100-01047',
      departmentId: 'general-medicine',
      doctorId: 'doc-arthur-bennett',
      appointmentDate: offsetDate(0),
      timeSlot: '08:45 AM',
      reason: 'Quarterly routine wellness and blood sugar check',
      status: 'Completed',
      hoursAgo: 10,
    },
    {
      id: 'MA-2026-1048',
      patientName: 'Meenakshi Iyer',
      patientAge: 57,
      contact: '+91-98100-01048',
      departmentId: 'cardiology',
      doctorId: 'doc-priya-sharma',
      appointmentDate: offsetDate(2),
      timeSlot: '11:45 AM',
      reason: 'Blood pressure routine follow-up visit',
      status: 'Pending',
      hoursAgo: 7,
    },
    {
      id: 'MA-2026-1049',
      patientName: 'Kabir Sengupta',
      patientAge: 38,
      contact: 'kabir.sengupta@demo-mail.org',
      departmentId: 'general-medicine',
      doctorId: 'doc-arthur-bennett',
      appointmentDate: offsetDate(1),
      timeSlot: '01:45 PM',
      reason: 'Executive preventive health screening',
      status: 'Confirmed',
      hoursAgo: 5,
    },
    {
      id: 'MA-2026-1050',
      patientName: 'Anjali Kulkarni',
      patientAge: 41,
      contact: '+91-98100-01050',
      departmentId: 'orthopedics',
      doctorId: 'doc-mark-thompson',
      appointmentDate: offsetDate(4),
      timeSlot: '02:15 PM',
      reason: 'Shoulder mobility assessment after sports strain',
      status: 'Cancelled',
      hoursAgo: 3,
    },
  ];

  const insertStmt = db.prepare(`
    INSERT INTO appointments (
      id, patient_name, patient_age, contact, department_id, department_name,
      doctor_id, doctor_name, appointment_date, time_slot, reason, status,
      created_at, updated_at
    ) VALUES (
      @id, @patient_name, @patient_age, @contact, @department_id, @department_name,
      @doctor_id, @doctor_name, @appointment_date, @time_slot, @reason, @status,
      @created_at, @updated_at
    )
  `);

  const insertMany = db.transaction(() => {
    for (const item of sampleRecords) {
      const dept = getDepartmentById(item.departmentId);
      const doc = getDoctorById(item.doctorId);
      const timestamp = new Date(now.getTime() - item.hoursAgo * 3600 * 1000).toISOString();
      insertStmt.run({
        id: item.id,
        patient_name: item.patientName,
        patient_age: item.patientAge,
        contact: item.contact,
        department_id: item.departmentId,
        department_name: dept?.name ?? item.departmentId,
        doctor_id: item.doctorId,
        doctor_name: doc?.name ?? item.doctorId,
        appointment_date: item.appointmentDate,
        time_slot: item.timeSlot,
        reason: item.reason,
        status: item.status,
        created_at: timestamp,
        updated_at: timestamp,
      });
    }
  });

  insertMany();
}

seedDemoAppointmentsIfEmpty();

function generateUniqueAppointmentId(): string {
  const year = new Date().getFullYear();
  const checkStmt = db.prepare('SELECT 1 FROM appointments WHERE id = ?');

  for (let attempt = 0; attempt < 20; attempt++) {
    const num = crypto.randomInt(1000, 9999);
    const candidate = `MA-${year}-${num}`;
    if (!checkStmt.get(candidate)) {
      return candidate;
    }
  }
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `MA-${year}-${suffix}`;
}

export interface CreateAppointmentInput {
  patientName: string;
  patientAge: number;
  contact: string;
  departmentId: string;
  doctorId: string;
  appointmentDate: string;
  timeSlot: string;
  reason?: string;
}

export function createAppointment(input: CreateAppointmentInput): AppointmentRecord {
  const department = getDepartmentById(input.departmentId);
  if (!department) {
    throw new Error('Selected department does not exist.');
  }

  const doctor = getDoctorById(input.doctorId);
  if (!doctor || doctor.departmentId !== department.id) {
    throw new Error('Selected doctor does not belong to the chosen department.');
  }

  const id = generateUniqueAppointmentId();
  const nowIso = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO appointments (
      id, patient_name, patient_age, contact, department_id, department_name,
      doctor_id, doctor_name, appointment_date, time_slot, reason, status,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?)
  `);

  stmt.run(
    id,
    input.patientName.trim(),
    input.patientAge,
    input.contact.trim(),
    department.id,
    department.name,
    doctor.id,
    doctor.name,
    input.appointmentDate,
    input.timeSlot,
    (input.reason ?? '').trim(),
    nowIso,
    nowIso,
  );

  const created = getAppointmentById(id);
  if (!created) {
    throw new Error('Failed to retrieve newly created appointment.');
  }
  return created;
}

export function listAppointments(filters?: {
  status?: string;
  departmentId?: string;
  search?: string;
}): AppointmentRecord[] {
  const conditions: string[] = [];
  const params: Record<string, string> = {};

  if (filters?.status && filters.status !== 'All') {
    conditions.push('status = @status');
    params.status = filters.status;
  }

  if (filters?.departmentId && filters.departmentId !== 'all') {
    conditions.push('department_id = @departmentId');
    params.departmentId = filters.departmentId;
  }

  if (filters?.search && filters.search.trim().length > 0) {
    conditions.push(
      '(LOWER(id) LIKE @search OR LOWER(patient_name) LIKE @search OR LOWER(doctor_name) LIKE @search OR LOWER(department_name) LIKE @search OR LOWER(contact) LIKE @search)',
    );
    params.search = `%${filters.search.trim().toLowerCase()}%`;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db
    .prepare(`SELECT * FROM appointments ${whereClause} ORDER BY created_at DESC`)
    .all(params) as AppointmentRow[];

  return rows.map(mapRow);
}

export function getAppointmentById(id: string): AppointmentRecord | null {
  const normalized = id.trim().toUpperCase();
  const row = db
    .prepare('SELECT * FROM appointments WHERE UPPER(id) = ?')
    .get(normalized) as AppointmentRow | undefined;

  return row ? mapRow(row) : null;
}

export function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus,
): AppointmentRecord | null {
  const normalized = id.trim().toUpperCase();
  const nowIso = new Date().toISOString();

  const result = db
    .prepare('UPDATE appointments SET status = ?, updated_at = ? WHERE UPPER(id) = ?')
    .run(status, nowIso, normalized);

  if (result.changes === 0) {
    return null;
  }

  return getAppointmentById(normalized);
}

export function deleteAppointment(id: string): boolean {
  const normalized = id.trim().toUpperCase();
  const result = db
    .prepare('DELETE FROM appointments WHERE UPPER(id) = ?')
    .run(normalized);
  return result.changes > 0;
}

export function getDashboardStats(): DashboardStats {
  const allRows = db
    .prepare('SELECT * FROM appointments ORDER BY created_at DESC')
    .all() as AppointmentRow[];

  const records = allRows.map(mapRow);

  const statusMap: Record<AppointmentStatus, number> = {
    Pending: 0,
    Confirmed: 0,
    Completed: 0,
    Cancelled: 0,
  };

  const deptCountMap = new Map<string, number>();
  for (const dept of DEPARTMENTS) {
    deptCountMap.set(dept.id, 0);
  }

  for (const record of records) {
    if (record.status in statusMap) {
      statusMap[record.status] += 1;
    }
    deptCountMap.set(record.departmentId, (deptCountMap.get(record.departmentId) ?? 0) + 1);
  }

  return {
    totalAppointments: records.length,
    pendingCount: statusMap.Pending,
    confirmedCount: statusMap.Confirmed,
    completedCount: statusMap.Completed,
    cancelledCount: statusMap.Cancelled,
    departmentBreakdown: DEPARTMENTS.map((dept) => ({
      departmentId: dept.id,
      departmentName: dept.name,
      count: deptCountMap.get(dept.id) ?? 0,
    })),
    statusBreakdown: (['Pending', 'Confirmed', 'Completed', 'Cancelled'] as AppointmentStatus[]).map(
      (status) => ({
        status,
        count: statusMap[status],
      }),
    ),
    recentAppointments: records.slice(0, 6),
  };
}

export function getDatabaseMetadata() {
  return {
    engine: 'SQLite (better-sqlite3)',
    file: path.basename(DB_PATH),
    departmentsCount: DEPARTMENTS.length,
    doctorsCount: DOCTORS.length,
  };
}
