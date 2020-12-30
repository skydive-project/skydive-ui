#!/bin/bash

if [ -f /dump.json ]; then
    /usr/bin/skydive --conf /etc/skydive.yml analyzer &
    sleep 15

    /usr/bin/skydive client topology import --file /dump.json
fi

python3 -m http.server 8080 --directory dist/