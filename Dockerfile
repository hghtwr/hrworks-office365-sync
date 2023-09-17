FROM node:alpine AS BUILD_IMAGE
COPY . .
RUN npm install && npm run tsc

FROM node:alpine
COPY --from=BUILD_IMAGE /build/src ./src
CMD ["node", "./src/index.js"]


