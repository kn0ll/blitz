FROM node:14-stretch-slim as base
WORKDIR /opt/app
RUN apt-get update && apt-get install openssl -y && rm -rf /var/lib/apt/lists/* 
COPY package.json .
COPY yarn.lock .
RUN yarn install --frozen-lockfile

FROM base as dev
COPY . .
RUN npx prisma generate
CMD npm run dev -- --port ${PORT}

FROM dev as pre-prod
ARG DATABASE_URL
ENV DATABASE_URL ${DATABASE_URL}
RUN npx next telemetry disable && npx prisma migrate deploy --preview-feature && npm run build

FROM node:14-stretch-slim as prod
ARG PORT
ENV PORT ${PORT}
WORKDIR /opt/app
RUN apt-get update && apt-get install openssl -y && rm -rf /var/lib/apt/lists/* 
COPY --from=pre-prod /opt/app/public ./public
COPY --from=pre-prod /opt/app/.blitz ./.blitz
COPY --from=pre-prod /opt/app/.next ./.next
COPY --from=pre-prod /opt/app/node_modules ./node_modules
COPY --from=pre-prod /opt/app/package.json ./package.json
COPY --from=pre-prod /opt/app/blitz.config.js ./blitz.config.js
CMD npm run start -- --port ${PORT}
