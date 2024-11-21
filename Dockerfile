FROM node:21-alpine

WORKDIR /home/node/app

COPY package.json yarn.lock ./

RUN yarn install --only=production

COPY prisma ./prisma

RUN yarn prisma generate

COPY . .

CMD [ "yarn", "start" ]