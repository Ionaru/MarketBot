# ---- Build stage: compile TypeScript to dist/ ----
FROM node:24-trixie-slim AS build

WORKDIR /app

# Puppeteer would otherwise download a Chrome that this image never uses; the
# runtime stage runs Debian's chromium instead.
ENV PUPPETEER_SKIP_DOWNLOAD=1

# Install all dependencies (including dev) for the build.
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci

# Compile the application.
COPY src ./src
RUN npm run build

# ---- Runtime stage: production image ----
FROM node:24-trixie-slim AS runtime

ENV NODE_ENV=production
ENV PUPPETEER_SKIP_DOWNLOAD=1
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# The /history command renders its graph by screenshotting an SVG, so the image
# needs a browser. This is Debian's own chromium rather than a build from
# Google's apt repository: that repository was added with "apt-key add", which
# Debian removed, and this way the browser gets security updates from Debian.
# fonts-freefont-ttf keeps the graph's axis labels from rendering as boxes.
RUN apt-get update \
    && apt-get install --no-install-recommends -y chromium fonts-freefont-ttf \
    && rm -rf /var/lib/apt/lists/*

# Install production dependencies only. sqlite3 ships an N-API prebuilt binary, so
# there is no native compilation and no build toolchain is required - but that
# binary is linked against GLIBC 2.38. Debian bookworm has 2.36, where it installs
# without complaint and then fails at runtime with "SQLite package has not been
# found installed". Trixie has 2.41. Do not move this image back to bookworm.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy the compiled application from the build stage.
COPY --from=build /app/dist ./dist

# Ships the config template only. The real marketbot.ini comes from the mounted
# config volume; without one the bot writes a template and exits telling you so.
COPY config ./config

# The SQLite database (data/marketbot.db), the ESI response cache, the universe
# caches and the generated graphs all live in /app/data. Both directories are
# mounted as volumes in production.
RUN mkdir -p /app/config /app/data && chown -R node:node /app
VOLUME /app/config /app/data

# Turns a missing marketbot.ini into an actionable message rather than an ENOENT
# from inside the config library.
COPY deploy/entrypoint.sh /usr/local/bin/entrypoint.sh

USER node

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "dist/src/index.js"]
