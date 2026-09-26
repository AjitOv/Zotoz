# Stage 1: Build Frontend & Backend
FROM node:20-alpine AS builder
WORKDIR /app

# Copy root and workspace manifests
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install dependencies
RUN npm install
RUN cd client && npm install
RUN cd server && npm install

# Copy source files
COPY . .

# Build client and server
RUN cd client && npm run build
RUN cd server && npm run build

# Stage 2: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY package*.json ./
COPY server/package*.json ./server/

# Install only production dependencies
RUN cd server && npm install --omit=dev

# Copy compiled files from builder
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

# Expose port (Cloud Run defaults to 8080)
EXPOSE 8080

CMD ["node", "server/dist/index.js"]
