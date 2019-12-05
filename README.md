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

In order to load a local topology dump

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