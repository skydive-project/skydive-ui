#!/bin/bash

dir="$(realpath "$(dirname "${BASH_SOURCE[0]}")")"
data_dir="example_datacenter"    
usage="$(basename "$0") [-h] [-d] -- convert csvs from example folder to json and start skydive ui from container

where:
    -h  show this help text
    -d  example direcory

Avaliable example direcories (for -d):

$(dir -1 data)     

Example:

./$(basename "$0") -d $data_dir
"

if [ "$1" == "-d" ]; then
  data_dir=$2
else
  echo "$usage" >&2
  exit 0
fi

echo Using data dir : "$dir"/data/$data_dir/

unset mountconf_to_docker
destjson_dir="out"
rm -r $destjson_dir
mkdir $destjson_dir
for rules_filename in data/$data_dir/*.conf; do
  echo Using rules file: $rules_filename
  destjsonfile=$(basename "$rules_filename" .conf).json
  python csvstoskyui.py $rules_filename > $destjson_dir/$destjsonfile
  mountconf_to_docker=$mountconf_to_docker" -v "$dir"/"$destjson_dir"/"$destjsonfile":/usr/src/skydive-ui/assets/"$destjsonfile
done

echo Starting skydive ui conainer
docker run -p 8080:8080 $mountconf_to_docker -v "$dir"/data/$data_dir/config.js:/usr/src/skydive-ui/assets/config.js skydive/skydive-ui
