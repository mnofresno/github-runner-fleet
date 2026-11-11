FROM node:22.23.4-alpine AS build

# Install the published security release while Docker Hub tags catch up.
# SHA-256 values are from nodejs.org/dist/v22.23.5/SHASUMS256.txt.
RUN node --input-type=module -e '\
    import { createHash } from "node:crypto"; \
    import { writeFileSync, unlinkSync } from "node:fs"; \
    import { execFileSync } from "node:child_process"; \
    const arch = process.arch + "-musl"; \
    const hashes = {"x64-musl":"83b8ba916eb22e89ba8274426a40f7aa0011c6e4c5ff77a5b03793f781a90786"}; \
    if (!hashes[arch]) throw new Error("Unsupported Node artifact: " + arch); \
    const url = "https://nodejs.org/dist/v22.23.5/node-v22.23.5-linux-" + arch + ".tar.gz"; \
    const response = await fetch(url); \
    if (!response.ok) throw new Error("Node download failed: " + response.status); \
    const data = Buffer.from(await response.arrayBuffer()); \
    if (createHash("sha256").update(data).digest("hex") !== hashes[arch]) throw new Error("Node checksum mismatch"); \
    writeFileSync("/tmp/node-security.tar.gz", data); \
    execFileSync("tar", ["-xzf", "/tmp/node-security.tar.gz", "-C", "/usr/local", "--strip-components=1"]); \
    unlinkSync("/tmp/node-security.tar.gz");' \
    && test "$(node --version)" = "v22.23.5"
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22.23.4-alpine AS runtime

# Install the published security release while Docker Hub tags catch up.
# SHA-256 values are from nodejs.org/dist/v22.23.5/SHASUMS256.txt.
RUN node --input-type=module -e '\
    import { createHash } from "node:crypto"; \
    import { writeFileSync, unlinkSync } from "node:fs"; \
    import { execFileSync } from "node:child_process"; \
    const arch = process.arch + "-musl"; \
    const hashes = {"x64-musl":"83b8ba916eb22e89ba8274426a40f7aa0011c6e4c5ff77a5b03793f781a90786"}; \
    if (!hashes[arch]) throw new Error("Unsupported Node artifact: " + arch); \
    const url = "https://nodejs.org/dist/v22.23.5/node-v22.23.5-linux-" + arch + ".tar.gz"; \
    const response = await fetch(url); \
    if (!response.ok) throw new Error("Node download failed: " + response.status); \
    const data = Buffer.from(await response.arrayBuffer()); \
    if (createHash("sha256").update(data).digest("hex") !== hashes[arch]) throw new Error("Node checksum mismatch"); \
    writeFileSync("/tmp/node-security.tar.gz", data); \
    execFileSync("tar", ["-xzf", "/tmp/node-security.tar.gz", "-C", "/usr/local", "--strip-components=1"]); \
    unlinkSync("/tmp/node-security.tar.gz");' \
    && test "$(node --version)" = "v22.23.5"
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/frontend/dist ./frontend/dist
COPY --from=build /app/dist-server ./dist-server

CMD ["node", "dist-server/status-app/server.js"]
