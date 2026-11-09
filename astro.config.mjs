import { defineConfig, envField } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  env: {
    schema: {
      ODOO_URL: envField.string({ context: 'server', access: 'secret' }),
    },
  },
});
