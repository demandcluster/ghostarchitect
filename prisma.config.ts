import path from 'node:path';
import { defineConfig } from 'prisma/config';
import { loadEnvConfig } from '@next/env';

// Load .env.local so Prisma CLI picks up DATABASE_URL without needing a separate .env file
loadEnvConfig(path.join(__dirname));

export default defineConfig({
  schema: path.join(__dirname, 'src', 'prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/ghostarchitect',
  },
});
