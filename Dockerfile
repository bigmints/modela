FROM node:22-alpine

WORKDIR /app
COPY package.json ./
COPY src ./src
COPY config ./config

ENTRYPOINT ["node", "src/cli.mjs"]
CMD ["help"]
