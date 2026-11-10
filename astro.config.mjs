import { defineConfig, envField } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  env: {
    schema: {
      ODOO_URL: envField.string({ context: 'server', access: 'secret' }),
    },
  },
});
