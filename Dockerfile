FROM oven/bun:1

RUN mkdir -p /app/config /app/data /app/logs
WORKDIR /app

COPY ./package.json ./bun.lockb ./tsconfig.json ./
RUN bun install --frozen-lockfile --production

COPY ./src ./src

ENV NODE_ENV production

ENTRYPOINT [ "bun", "run", "src/index.ts" ]
