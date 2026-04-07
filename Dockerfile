FROM node:24-slim AS base

WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm install -g npm@latest

FROM base AS build

COPY . .

RUN npm ci --silent

CMD ["npm", "run", "subscriber"]
