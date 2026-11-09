import type { APIRoute } from 'astro';
import { loginWithGoogle, OdooError } from '../../../lib/odoo';
import { SESSION_COOKIE } from '../../../middleware';

// Google Identity Services, con `data-ux_mode="redirect"`, hace un POST
// normal (x-www-form-urlencoded) del navegador a esta URL — no es un
// fetch/XHR, así que no hay preflight CORS que configurar.
//
// CSRF: GIS pone una cookie `g_csrf_token` en el navegador y manda el
// mismo valor como campo del body. Si no coinciden, es una señal de que
// el POST no vino realmente del botón de Google en esta página.
// https://developers.google.com/identity/gsi/web/guides/verify-google-id-token#cross-site_request_forgery_csrf_protection
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const credential = String(form.get('credential') ?? '');
  const csrfBody = String(form.get('g_csrf_token') ?? '');
  const csrfCookie = cookies.get('g_csrf_token')?.value ?? '';

  if (!credential || !csrfBody || csrfBody !== csrfCookie) {
    return redirect('/login?error=google_csrf');
  }

  try {
    const sessionId = await loginWithGoogle(credential);
    cookies.set(SESSION_COOKIE, sessionId, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: new URL(request.url).protocol === 'https:',
      maxAge: 60 * 60 * 8,
    });
    return redirect('/');
  } catch (e) {
    console.error('Login con Google:', e);
    const msg = e instanceof OdooError ? e.message : 'No se pudo iniciar sesión con Google.';
    return redirect(`/login?error=${encodeURIComponent(msg)}`);
  }
};
