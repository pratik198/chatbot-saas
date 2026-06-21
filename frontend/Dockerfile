# =============================================================
# DOCKERFILE FOR REACT + VITE FRONTEND
# =============================================================
# Multi-stage build:
#   Stage 1 (deps):  Install npm dependencies
#   Stage 2 (build): Build the static files (dist/)
#   Stage 3 (serve): Serve with nginx (tiny, production-ready)
# =============================================================

# ── STAGE 1: Install dependencies ───────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install

# ── STAGE 2: Build Vite app ─────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source code
COPY . .

# Build creates /app/dist/ — static HTML + JS + CSS
# Pass the API URL as a build arg so it's baked into the bundle
ARG VITE_API_URL=http://localhost:8080
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ── STAGE 3: Serve with nginx ────────────────────────────────
# nginx is a tiny web server perfect for serving static files
FROM nginx:alpine AS run

# Copy built files to nginx's web root
COPY --from=build /app/dist /usr/share/nginx/html

# nginx config that handles React Router (SPA routing)
# Without this, refreshing /dashboard gives a 404
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
