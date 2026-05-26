FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache curl

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

CMD ["node", "src/bot.js"]
