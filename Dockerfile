FROM node:8-stretch

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

# Copy files to docker container
WORKDIR /app
ADD . /app

# Install app dependencies
RUN npm install -g typescript
RUN npm install

# Build the app
RUN npm run build

VOLUME /app/logs

EXPOSE  80
EXPOSE  443
CMD ["node", "./dist/index.js"]
