FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache ffmpeg

COPY package*.json ./

RUN npm ci --only=production

COPY src ./src

RUN mkdir -p uploads output

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "src/index.js"]
