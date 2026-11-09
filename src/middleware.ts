import { defineMiddleware } from 'astro:middleware';
import { getSessionInfo } from './lib/odoo';

export const SESSION_COOKIE = 'odoo_session';
const PUBLIC_PATHS = ['/login', '/api/auth/google'];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  if (PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/_')) return next();

  const sessionId = context.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionId) return context.redirect('/login');

  try {
    const info = await getSessionInfo(sessionId);
    context.locals.sessionId = sessionId;
    context.locals.user = {
      uid: info.uid,
      name: info.name,
      username: info.username,
    };
  } catch {
    context.cookies.delete(SESSION_COOKIE, { path: '/' });
    return context.redirect('/login?expired=1');
  }

  return next();
});
