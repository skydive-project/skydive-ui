FROM skydive/skydive

WORKDIR /usr/src/skydive-ui

RUN apt-get -y update \
    && apt-get -y install nodejs npm

COPY package.json /usr/src/skydive-ui
COPY package-lock.json /usr/src/skydive-ui
COPY tsconfig.json /usr/src/skydive-ui
COPY webpack.config.js /usr/src/skydive-ui
COPY assets /usr/src/skydive-ui/assets
COPY src /usr/src/skydive-ui/src
COPY entry.sh /usr/src/skydive-ui

RUN npm install
RUN npm run build

ENTRYPOINT /usr/src/skydive-ui/entry.sh