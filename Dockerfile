FROM node:buster-slim

LABEL maintainer="Ryan"

WORKDIR /server

ENV PATH /server/node_modules/.bin:$PATH

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5000

CMD ["npm", "start"]