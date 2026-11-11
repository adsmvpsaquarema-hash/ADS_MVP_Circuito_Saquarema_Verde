FROM node:20.19.0-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY public ./public
COPY src ./src

RUN mkdir -p /app/data

ENV DB_PATH=/app/data/saquarema.db
ENV JWT_SECRET=saquarema-verde-mvp-secret-2026
ENV JWT_EXPIRES_IN=8h
ENV ADMIN_SENHA=Admin@123

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || process.env.PORTA || 3000) + '/api/saude').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["npm", "start"]
