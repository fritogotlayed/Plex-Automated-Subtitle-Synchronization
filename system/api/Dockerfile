FROM node:10-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --only=prod

COPY . .
EXPOSE 8888

CMD [ "node", "./src/server.js" ]
