import type { APIRoute } from 'astro';
import { logout } from '../lib/odoo';
import { SESSION_COOKIE } from '../middleware';

export const POST: APIRoute = async ({ cookies, locals, redirect }) => {
  await logout(locals.sessionId);
  cookies.delete(SESSION_COOKIE, { path: '/' });
  return redirect('/login');
};
