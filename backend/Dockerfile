# ── Hillside Coffee · Backend with SQLite ──
FROM node:20-alpine

# Install build tools needed to compile better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install --omit=dev

# Copy server code
COPY server.js ./

# Create data directory for SQLite file
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "server.js"]
