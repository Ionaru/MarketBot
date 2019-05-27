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

RUN mkdir /app/
RUN mkdir /app/logs
RUN mkdir /app/data
RUN mkdir /app/config
WORKDIR /app

# Copy needed build files
COPY ./package.json .
COPY ./package-lock.json .
COPY ./tsconfig.json .

# Copy source files
COPY ./src ./src

# Install dependencies
RUN npm install

# Build the project
RUN npm run build

# Add volumes
VOLUME /app/logs
VOLUME /app/data
VOLUME /app/config

# Install production packages
ENV NODE_ENV production
RUN npm ci
RUN npm cache clean --force


## RUN

EXPOSE  80
EXPOSE  443
ENV LEVEL debug
CMD ["node", "./dist/src/index.js"]
