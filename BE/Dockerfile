# ---------- build stage ----------
FROM node:20-alpine AS build
WORKDIR /app
# Prisma cần openssl trên alpine
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

# ---------- runtime stage ----------
FROM node:20-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
COPY package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
EXPOSE 3000
# Chạy migrate rồi mới start (idempotent nhờ prisma migrate deploy)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
