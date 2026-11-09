import { defineConfig, envField } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  env: {
    schema: {
      ODOO_URL: envField.string({ context: 'server', access: 'secret' }),
      // Público a propósito: lo necesita el navegador para renderizar el
      // botón "Sign in with Google" (Google Identity Services). No es un
      // secreto: el Client ID siempre viaja visible en el HTML/JS de
      // cualquier app que use login con Google.
      GOOGLE_CLIENT_ID: envField.string({ context: 'client', access: 'public', optional: true }),
    },
  },
});
