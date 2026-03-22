import path from 'node:path';
import { defineConfig } from 'prisma/config';
import { loadEnvConfig } from '@next/env';
import { readFileSync } from 'node:fs';

// Load .env.local so Prisma CLI picks up DATABASE_URL without needing a separate .env file
loadEnvConfig(path.join(__dirname));

// Read schema path from package.json
const packageJsonPath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const schemaPath = packageJson.prisma?.schema || 'src/prisma/schema.prisma';

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, schemaPath),
});
