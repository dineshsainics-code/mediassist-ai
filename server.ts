import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { createServer as createViteServer, type ViteDevServer } from 'vite';
import { z } from 'zod';
import { DEPARTMENTS, DOCTORS, HOSPITAL_PROFILE } from './src/data/hospitalData';
import type { AppointmentStatus } from './src/types/hospital';
import {
  createAppointment,
  deleteAppointment,
  getAppointmentById,
  getDashboardStats,
  getDatabaseMetadata,
  listAppointments,
  updateAppointmentStatus,
} from './server/db';
import {
  generatePatientAssistantReply,
  getAssistantDiagnostics,
  getAssistantMode,
} from './server/geminiService';

const IS_PROD = process.env.NODE_ENV === 'production';

function resolveServerPort(): number {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--port' && args[i + 1]) {
      const parsed = Number(args[i + 1]);
      if (Number.isInteger(parsed) && parsed > 0) return parsed;
    }
    if (args[i].startsWith('--port=')) {
      const parsed = Number(args[i].slice('--port='.length));
      if (Number.isInteger(parsed) && parsed > 0) return parsed;
    }
  }

  const envPort = Number(process.env.PORT);
  const nginxPort = Number(process.env.NGINX_PORT);
  const defaultAppPort = Number(process.env.DEFAULT_APP_PORT) || 3000;

  if (!IS_PROD) {
    if (Number.isInteger(envPort) && envPort > 0 && envPort !== nginxPort) {
      return envPort;
    }
    return defaultAppPort;
  }

  return Number.isInteger(envPort) && envPort > 0 ? envPort : 3000;
}

const PORT = resolveServerPort();

const createAppointmentSchema = z.object({
  patientName: z
    .string()
    .trim()
    .min(2, 'Patient full name must be at least 2 characters.')
    .max(100, 'Patient name is too long.'),
  patientAge: z.coerce
    .number()
    .int('Age must be a whole number.')
    .min(1, 'Age must be between 1 and 120.')
    .max(120, 'Age must be between 1 and 120.'),
  contact: z
    .string()
    .trim()
    .min(7, 'Please provide a valid phone number or email address.')
    .max(100, 'Contact information is too long.')
    .refine(
      (val) => /^[\d+\-\s()]{7,20}$/.test(val) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      'Enter a valid phone number (e.g., +91-98100-00000) or email address.',
    ),
  departmentId: z.string().trim().min(1, 'Please select a department.'),
  doctorId: z.string().trim().min(1, 'Please select a doctor.'),
  appointmentDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Please choose a valid appointment date (YYYY-MM-DD).')
    .refine((dateStr) => {
      const today = new Date().toISOString().slice(0, 10);
      return dateStr >= today;
    }, 'Appointment date cannot be in the past.'),
  timeSlot: z.string().trim().min(3, 'Please select a preferred time slot.'),
  reason: z.string().trim().max(400, 'Visit note must be under 400 characters.').optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['Pending', 'Confirmed', 'Completed', 'Cancelled']),
});

const chatRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Please enter a message.')
    .max(1000, 'Message is too long (maximum 1000 characters).'),
  language: z.enum(['auto', 'en', 'hi', 'hinglish']).default('auto'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(2000),
      }),
    )
    .max(30)
    .optional()
    .default([]),
});

function sanitizeUpstreamError(raw: string): string {
  return raw
    .replace(/AIza[0-9A-Za-z_-]{10,}/g, '[REDACTED_KEY]')
    .replace(/(key=)[^&\s"']+/gi, '$1[REDACTED]')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractRetryHint(raw: string): string | null {
  const match = raw.match(/retry(?:Delay["':\s]+| in )((?:\d+h)?(?:\d+m)?\d+(?:\.\d+)?s?)/i);
  if (!match?.[1]) return null;
  return match[1].endsWith('s') ? match[1] : `${match[1]}s`;
}

function extractUpstreamSummary(detail: string): string {
  try {
    const parsed = JSON.parse(detail) as {
      error?: {
        message?: string;
        details?: Array<{ quotaMetric?: string; retryDelay?: string; violations?: Array<{ quotaMetric?: string; quotaId?: string }> }>;
      };
    };
    const msg = parsed?.error?.message?.replace(/\s+/g, ' ').trim();
    const quotaId = parsed?.error?.details
      ?.flatMap((d) => d.violations ?? [])
      .map((v) => v.quotaId)
      .find(Boolean);
    if (msg) {
      return quotaId ? `${msg} [${quotaId}]` : msg;
    }
  } catch {
    // Non-JSON error string
  }
  return detail.slice(0, 280);
}

function formatGeminiErrorForClient(err: unknown): { status: number; message: string; detail: string } {
  const rawMessage = err instanceof Error ? err.message : String(err ?? 'Unknown AI service error');
  const detail = sanitizeUpstreamError(rawMessage);
  const summary = extractUpstreamSummary(detail);
  const upper = detail.toUpperCase();

  if (upper.includes('API_KEY_INVALID') || upper.includes('API KEY NOT VALID')) {
    return {
      status: 400,
      detail,
      message:
        'Gemini API rejected the configured GEMINI_API_KEY (API_KEY_INVALID). Please verify your API key in Settings > Secrets or .env.',
    };
  }

  if (upper.includes('PERMISSION_DENIED') || upper.includes('403')) {
    return {
      status: 403,
      detail,
      message:
        'Gemini API permission denied (403). Please verify your GEMINI_API_KEY and project access in Settings > Secrets.',
    };
  }

  if (upper.includes('RESOURCE_EXHAUSTED') || upper.includes('429')) {
    const retryHint = extractRetryHint(detail);
    const retryText = retryHint ? ` Retry suggested in ${retryHint}.` : '';
    return {
      status: 429,
      detail,
      message: `Gemini API rate limit or quota exceeded (429 RESOURCE_EXHAUSTED).${retryText} Check your API key quota/billing in Settings > Secrets. Details: ${summary}`,
    };
  }

  if (upper.includes('NOT_FOUND') || upper.includes('404')) {
    return {
      status: 404,
      detail,
      message: `Requested Gemini model was not found (404). Verify the configured server model name. Details: ${summary}`,
    };
  }

  return {
    status: 502,
    detail,
    message: `Gemini AI service error: ${summary}`,
  };
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  app.use(express.json({ limit: '1mb' }));

  // System, AI configuration diagnostics & database health
  app.get('/api/health', (_req, res) => {
    const diagnostics = getAssistantDiagnostics();
    res.json({
      status: 'ok',
      aiMode: diagnostics.mode,
      aiDiagnostics: diagnostics,
      database: getDatabaseMetadata(),
      timestamp: new Date().toISOString(),
    });
  });

  // Hospital overview & reference catalog
  app.get('/api/hospital/overview', (_req, res) => {
    const stats = getDashboardStats();
    const diagnostics = getAssistantDiagnostics();
    res.json({
      hospital: HOSPITAL_PROFILE,
      departments: DEPARTMENTS,
      doctors: DOCTORS,
      aiMode: diagnostics.mode,
      aiDiagnostics: diagnostics,
      stats: {
        totalAppointments: stats.totalAppointments,
        pendingCount: stats.pendingCount,
        confirmedCount: stats.confirmedCount,
        completedCount: stats.completedCount,
        cancelledCount: stats.cancelledCount,
      },
    });
  });

  // List appointments with optional search/status/department filters
  app.get('/api/appointments', (req, res) => {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const departmentId =
        typeof req.query.departmentId === 'string' ? req.query.departmentId : undefined;
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;

      const records = listAppointments({ status, departmentId, search });
      res.json({ appointments: records });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to fetch appointments.';
      res.status(500).json({ error: message });
    }
  });

  // Track single appointment by ID
  app.get('/api/appointments/:id', (req, res) => {
    try {
      const record = getAppointmentById(req.params.id);
      if (!record) {
        res.status(404).json({
          error: `No appointment found with ID "${req.params.id}". Please check the ID and try again.`,
        });
        return;
      }
      res.json({ appointment: record });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to look up appointment.';
      res.status(500).json({ error: message });
    }
  });

  // Create and persist new appointment request
  app.post('/api/appointments', (req, res) => {
    const parsed = createAppointmentSchema.safeParse(req.body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      res.status(400).json({
        error: firstIssue?.message ?? 'Invalid appointment details.',
        fieldErrors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    try {
      const appointment = createAppointment(parsed.data);
      res.status(201).json({ appointment });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save appointment.';
      res.status(400).json({ error: message });
    }
  });

  // Update appointment status from Admin Dashboard
  app.patch('/api/appointments/:id/status', (req, res) => {
    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Status must be one of Pending, Confirmed, Completed, or Cancelled.',
      });
      return;
    }

    try {
      const updated = updateAppointmentStatus(
        req.params.id,
        parsed.data.status as AppointmentStatus,
      );
      if (!updated) {
        res.status(404).json({ error: `Appointment "${req.params.id}" not found.` });
        return;
      }
      res.json({ appointment: updated });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to update status.';
      res.status(500).json({ error: message });
    }
  });

  // Delete an appointment record
  app.delete('/api/appointments/:id', (req, res) => {
    try {
      const deleted = deleteAppointment(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: `Appointment "${req.params.id}" not found.` });
        return;
      }
      res.json({ deleted: true, id: req.params.id });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to delete appointment.';
      res.status(500).json({ error: message });
    }
  });

  // Live Admin Dashboard statistics & charts
  app.get('/api/admin/stats', (_req, res) => {
    try {
      const stats = getDashboardStats();
      const diagnostics = getAssistantDiagnostics();
      res.json({
        stats,
        aiMode: diagnostics.mode,
        aiDiagnostics: diagnostics,
        database: getDatabaseMetadata(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to compute dashboard stats.';
      res.status(500).json({ error: message });
    }
  });

  // Gemini-powered AI Patient Assistant endpoint
  // Never silently falls back to demo responses when Gemini API fails
  app.post('/api/assistant/chat', async (req, res) => {
    const parsed = chatRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.issues[0]?.message ?? 'Invalid chat payload.',
      });
      return;
    }

    try {
      const result = await generatePatientAssistantReply(parsed.data);
      res.json(result);
    } catch (err) {
      const mapped = formatGeminiErrorForClient(err);
      console.error('[MediAssist AI] Gemini request failed:', mapped.status, mapped.message);
      res.status(mapped.status).json({
        error: mapped.message,
        mode: getAssistantMode(),
      });
    }
  });

  // Unknown API routes return clean JSON 404
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  let viteServer: ViteDevServer | null = null;

  if (IS_PROD) {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const disableHmr = process.env.DISABLE_HMR === 'true';
    viteServer = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: disableHmr ? false : { server: httpServer },
        ...(disableHmr ? { ws: false } : {}),
      },
      appType: 'spa',
    });

    app.use(viteServer.middlewares);

    app.use('*', async (req, res, next) => {
      try {
        const htmlPath = path.resolve(process.cwd(), 'index.html');
        let template = fs.readFileSync(htmlPath, 'utf-8');
        template = await viteServer!.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (error) {
        next(error);
      }
    });
  }

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`Received ${signal}, shutting down MediAssist AI server...`);
    Promise.resolve()
      .then(() => viteServer?.close())
      .catch(() => {})
      .finally(() => {
        httpServer.close(() => {
          process.exit(0);
        });
        setTimeout(() => process.exit(0), 1500).unref();
      });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(PORT, '0.0.0.0', () => {
      httpServer.off('error', reject);
      console.log(
        `MediAssist AI server listening on http://0.0.0.0:${PORT} (AI mode: ${getAssistantMode()})`,
      );
      resolve();
    });
  });
}

startServer().catch((err) => {
  console.error('Failed to start MediAssist AI server:', err);
  process.exit(1);
});
