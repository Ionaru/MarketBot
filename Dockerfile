FROM node:16-bullseye


## INSTALL

# Dependencies for Puppeteer
RUN apt update && apt install -y wget git --no-install-recommends \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt update \
    && apt install -y google-chrome-unstable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 libxtst6 libxcb-dri3-0 libx11-6 libx11-xcb1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && apt purge --auto-remove -y curl \
    && rm -rf /src/*.deb

RUN mkdir -p /app/config /app/data /app/logs
WORKDIR /app

# Copy needed build files
COPY ./package.json ./package-lock.json ./tsconfig.json ./

# Install dependencies
RUN npm ci

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
