FROM node:12-stretch


## INSTALL

# Dependencies for Puppeteer
RUN apt-get update && apt-get install -y wget git --no-install-recommends \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-unstable \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get purge --auto-remove -y curl \
    && rm -rf /src/*.deb

RUN mkdir -p /app/config /app/data /app/logs
WORKDIR /app

# Copy needed build files
COPY ./package.json ./package-lock.json ./tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source files
COPY ./src ./src

# Build the project for production use
ENV NODE_ENV production
RUN npm run build
RUN npm ci
RUN npm cache clean --force

COPY ./config ./config

# Add volumes
VOLUME /app/config /app/data


## RUN

CMD ["node", "dist/src/index.js"]
