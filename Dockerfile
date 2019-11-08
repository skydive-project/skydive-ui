FROM node:10
WORKDIR /usr/src/skydive-ui
RUN npm install
COPY . .
CMD [ "/usr/src/skydive-ui/node_modules/webpack-dev-server/bin/webpack-dev-server.js", "--host", "0.0.0.0" ]