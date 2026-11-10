// Cliente para el módulo Odoo `wispi_servicios_generales_api`
// (`login`, `me`, `ticket/create`). No es JSON-RPC: cada ruta responde
// JSON simple `{ success, ... }`. El login no necesita `ODOO_DB`: el
// controlador resuelve la base de datos él mismo (`request.env.cr.dbname`),
// igual que hace `wispi_portal_api` para el portal de vendedores.
import { ODOO_URL } from 'astro:env/server';

const BASE = ODOO_URL.replace(/\/+$/, '');

export class OdooError extends Error {
  constructor(
    message: string,
    public code?: number,
    public sessionExpired = false,
  ) {
    super(message);
  }
}

export interface SessionInfo {
  uid: number;
  name: string;
  username: string;
}

interface ApiResponse {
  success: boolean;
  message?: string;
  [key: string]: unknown;
}

/**
 * Llama a una ruta del módulo `wispi_servicios_generales_api`, enviando la
 * cookie de sesión si se indica. `redirect: 'manual'` evita que `fetch`
 * siga automáticamente el 303 que Odoo manda cuando la sesión expiró en
 * una ruta `auth='user'` (si no, terminaríamos "viendo" la página HTML de
 * /web/login en vez del estado 303).
 */
async function apiCall<T extends ApiResponse>(
  path: string,
  body: Record<string, unknown>,
  sessionId?: string,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/json',
      ...(sessionId ? { Cookie: `session_id=${sessionId}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const sessionExpired = res.status === 401 || res.status === 403 || (res.status >= 300 && res.status < 400);
  if (sessionExpired && sessionId) {
    // Solo es "sesión expirada" si ya mandábamos una; en login (sin
    // sessionId) un 3xx/401 no tiene ese significado.
    throw new OdooError('Tu sesión expiró. Inicia sesión de nuevo.', res.status, true);
  }

  let data: T;
  try {
    data = await res.json();
  } catch {
    if (sessionExpired) throw new OdooError('Tu sesión expiró. Inicia sesión de nuevo.', res.status, true);
    throw new OdooError(`Odoo respondió HTTP ${res.status} (respuesta no válida)`, res.status);
  }

  if (!res.ok || !data.success) {
    throw new OdooError(data.message || `Odoo respondió HTTP ${res.status}`, res.status);
  }
  return data;
}

/** Inicia sesión vía `wispi_servicios_generales_api` y devuelve el session_id. */
export async function login(username: string, password: string) {
  try {
    const data = await apiCall<ApiResponse & { session_id: string }>(
      '/api/servicios_generales/login',
      { login: username, password },
    );
    if (!data.session_id) throw new OdooError('Odoo no devolvió una sesión');
    return data.session_id;
  } catch (e) {
    if (e instanceof OdooError && e.code === 401) {
      throw new OdooError('Usuario o contraseña incorrectos');
    }
    throw e;
  }
}

export async function getSessionInfo(sessionId: string): Promise<SessionInfo> {
  const data = await apiCall<ApiResponse & { user: { id: number; name: string; email: string } }>(
    '/api/servicios_generales/me',
    {},
    sessionId,
  );
  return { uid: data.user.id, name: data.user.name, username: data.user.email };
}

export async function logout(sessionId: string) {
  // `/web/session/destroy` (nativo) no necesita `db`, solo la sesión activa.
  await fetch(`${BASE}/web/session/destroy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `session_id=${sessionId}`,
    },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: {}, id: Date.now() }),
  }).catch(() => {});
}

export interface TicketAttachment {
  name: string;
  mimetype: string;
  /** Contenido en base64, sin el prefijo `data:image/...;base64,`. */
  data: string;
}

export interface CreateTicketPayload {
  name: string;
  description: string;
  priority: string;
  team_id?: number;
  attachments?: TicketAttachment[];
}

export interface CreateTicketResult extends ApiResponse {
  id?: number;
  name?: string;
  team?: { id: number; name: string };
}

/**
 * Crea un ticket de Helpdesk vía `wispi_servicios_generales_api`. El
 * usuario (partner_id/nombre/correo) y el equipo de Helpdesk los resuelve
 * Odoo automáticamente a partir de la sesión autenticada; aquí solo se
 * manda lo que el solicitante escribió en el formulario.
 */
export async function createServiceTicket(sessionId: string, payload: CreateTicketPayload) {
  return apiCall<CreateTicketResult>(
    '/api/servicios_generales/ticket/create',
    { ...payload },
    sessionId,
  );
}
