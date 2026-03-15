# ─────────────────────────────────────────
# Stage 1: deps — install production deps
# ─────────────────────────────────────────
FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ─────────────────────────────────────────
# Stage 2: builder — generate Prisma client + build Next.js
# ─────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

# Explicitly exclude .next from COPY to avoid lightningcss errors
RUN find . -name ".next" -exec rm -rf {} \;

COPY . .

# Clean .next build cache after COPY to prevent lightningcss errors
RUN rm -rf .next

# Prisma schema lives at src/prisma/schema.prisma (non-default path)
ENV PRISMA_SCHEMA_PATH=src/prisma/schema.prisma

RUN npx prisma generate --schema=src/prisma/schema.prisma

# Clean build cache to prevent lightningcss errors
RUN rm -rf .next

RUN npm run build

# ─────────────────────────────────────────
# Stage 3: runner — minimal production image
# ─────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Non-root user
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Standalone output + static assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma schema needed at runtime for query engine path resolution
COPY --from=builder --chown=nextjs:nodejs /app/src/prisma/schema.prisma ./src/prisma/schema.prisma

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health 2>/dev/null || exit 1

CMD ["node", "server.js"]
