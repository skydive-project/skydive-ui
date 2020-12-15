[![GitHub license](https://img.shields.io/badge/license-Apache%20license%202.0-blue.svg)](https://github.com/skydive-project/skydive-ui/blob/master/LICENSE)
[![Slack Invite](https://img.shields.io/badge/Slack:-%23skydive&hyphen;project%20invite-blue.svg?style=plastic&logo=slack)](https://slack.skydive.network)
[![Slack Channel](https://img.shields.io/badge/Slack:-%23skydive&hyphen;project-blue.svg?style=plastic&logo=slack)](https://skydive-project.slack.com)

# Next generation Skydive WebUI

Please note this version of the Skydive WebUI is still actively developed. 
Not all the features of the legacy version are implemented yet. 

![](https://raw.githubusercontent.com/skydive-project/skydive-ui/master/screenshot.png)

## Live demo

* [1 TOR, 2 hosts, 2 namespace per host topology](https://skydive-project.github.io/skydive-ui/?data=/skydive-ui/assets/simple.json)
* [Minikube topology](https://skydive-project.github.io/skydive-ui/?data=/skydive-ui/assets/kubernetes.json)

## Quick start

A docker image is available with the latest version. Please note that this image
is currently provided for testing purpose.

```
docker run -p 8080:8080 skydive/skydive-ui
```

By default the WebUI is trying to connect to a working skydive analyser. Make sure that the analyser is available to the WebUI on localhost:8082

Note: To use different skydive analyzer end-point you need to logout (top-right icon) and select a different end-point on the login screen  

To experience with static kubernetes example open your browser with the following address

```
http://127.0.0.1:8080/?data=/samples/kubernetes.json
```

In order to load an example of local topology dump

```
docker run -p 8080:8080 -v dump.json:/usr/src/skydive-ui/assets/dump.json skydive/skydive-ui
```

then open your browser with the following address

```
http://127.0.0.1:8080/?data=/assets/dump.json
```

## Dev mode

```
npm install
npm start
```

In order to load a local topology dump

```
PAGE="?data=/assets/dump.json" npm start 
```

## Get involved

* Slack
    * Invite : https://slack.skydive.network
    * Workspace : https://skydive-project.slack.com

## Contributing

Your contributions are more than welcome. Please check
https://github.com/skydive-project/skydive/blob/master/CONTRIBUTING.md
to know about the process.

## License

This software is licensed under the Apache License, Version 2.0 (the
"License"); you may not use this software except in compliance with the
License.
You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
