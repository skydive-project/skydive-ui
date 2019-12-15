import { Node, Link } from './Topology'
import Tools from './Tools'

var DefaultConfig = {
    subTitle: "",
    nodeAttrs: function (node: Node) {
        var name = node.data.Name
        if (name.length > 24) {
            name = node.data.Name.substring(0, 24) + "."
        }

        var attrs = { classes: [node.data.Type], name: name, icon: "\uf192", href: '', iconClass: '', weight: 0 }

        if (node.data.OfPort) {
            attrs.weight = 15
        }

        if (node.data.Manager === "k8s") {
            attrs.href = "assets/icons/k8s.png"
            attrs.weight = 1
        }

        switch (node.data.Type) {
            case "host":
                attrs.icon = "\uf109"
                attrs.weight = 13
                break
            case "switch":
                attrs.icon = "\uf6ff"
                break
            case "bridge":
            case "ovsbridge":
                attrs.icon = "\uf6ff"
                attrs.weight = 14
                break
            case "erspan":
                attrs.icon = "\uf1e0"
                break
            case "geneve":
            case "vxlan":
            case "gre":
            case "gretap":
                attrs.icon = "\uf55b"
                break
            case "device":
            case "internal":
            case "interface":
            case "tun":
            case "tap":
                attrs.icon = "\uf796"
                attrs.weight = 17
                break
            case "veth":
                attrs.icon = "\uf4d7"
                attrs.weight = 17
                break
            case "switchport":
                attrs.icon = "\uf0e8"
                break
            case "patch":
            case "port":
            case "ovsport":
                attrs.icon = "\uf0e8"
                attrs.weight = 15
                break
            case "netns":
                attrs.icon = "\uf24d"
                attrs.weight = 18
                break
            case "libvirt":
                attrs.icon = "\uf109"
                attrs.weight = 19
                break
            case "cluster":
                attrs.href = "assets/icons/cluster.png"
                break
            case "configmap":
                attrs.href = "assets/icons/configmap.png"
                break
            case "container":
                attrs.href = "assets/icons/container.png"
                break
            case "cronjob":
                attrs.href = "assets/icons/cronjob.png"
                break
            case "daemonset":
                attrs.href = "assets/icons/daemonset.png"
                break
            case "deployment":
                attrs.href = "assets/icons/deployment.png"
                break
            case "endpoints":
                attrs.href = "assets/icons/endpoints.png"
                break
            case "ingress":
                attrs.href = "assets/icons/ingress.png"
                break
            case "job":
                attrs.href = "assets/icons/job.png"
                break
            case "node":
                attrs.icon = "\uf109"
                break
            case "persistentvolume":
                attrs.href = "assets/icons/persistentvolume.png"
                break
            case "persistentvolumeclaim":
                attrs.href = "assets/icons/persistentvolumeclaim.png"
                break
            case "pod":
                attrs.href = "assets/icons/pod.png"
                break
            case "networkpolicy":
                attrs.href = "assets/icons/networkpolicy.png"
                break
            case "namespace":
                attrs.icon = "\uf24d"
                break
            case "replicaset":
                attrs.href = "assets/icons/replicaset.png"
                break
            case "replicationcontroller":
                attrs.href = "assets/icons/replicationcontroller.png"
                break
            case "secret":
                attrs.href = "assets/icons/secret.png"
                break
            case "service":
                attrs.href = "assets/icons/service.png"
                break
            case "statefulset":
                attrs.href = "assets/icons/statefulset.png"
                break
            case "storageclass":
                attrs.href = "assets/icons/storageclass.png"
                break
            default:
                attrs.icon = "\uf192"
                break
        }

        if (node.data.Manager === "docker") {
            attrs.icon = "\uf395"
            attrs.iconClass = "font-brands"
        }

        if (node.data.IPV4 && node.data.IPV4.length) {
            attrs.weight = 13
        }

        if (node.data.Driver && ["tap", "veth", "tun", "openvswitch"].indexOf(node.data.Driver) < 0) {
            attrs.weight = 13
        }

        if (node.data.Probe === "fabric") {
            attrs.weight = 10
        }

        return attrs
    },
    nodeSortFnc: function (a: Node, b: Node) {
        return a.data.Name.localeCompare(b.data.Name)
    },
    nodeMenu: function (node: Node) {
        return [
            {
                class: "", text: "Capture", disabled: false, callback: () => {
                    var api = new window.API.CapturesApi(window.App.apiConf)
                    api.createCapture({ GremlinQuery: `G.V('${node.id}')` }).then(result => {
                        console.log(result)
                    })
                }
            },
            { class: "", text: "Capture all", disabled: true, callback: () => { console.log("Capture all") } },
            { class: "", text: "Injection", disabled: false, callback: () => { console.log("Injection") } },
            { class: "", text: "Flows", disabled: false, callback: () => { console.log("Flows") } }
        ]
    },
    nodeTags: function (data) {
        if (data.Manager && data.Manager === "k8s") {
            return ["kubernetes"]
        } else {
            return ["infrastructure"]
        }
    },
    defaultNodeTag: "infrastructure",
    nodeTabTitle: function (node: Node) {
        return node.data.Name.substring(0, 8)
    },
    groupSize: 5,
    groupType: function (child: Node) {
        var nodeType = child.data.Type
        if (!nodeType) {
            return nodeType
        }

        switch (nodeType) {
            case "configmap":
            case "cronjob":
            case "daemonset":
            case "deployment":
            case "endpoints":
            case "ingress":
            case "job":
            case "persistentvolume":
            case "persistentvolumeclaim":
            case "pod":
            case "networkpolicy":
            case "replicaset":
            case "replicationcontroller":
            case "secret":
            case "service":
            case "statefulset":
                return "app"
            default:
                return nodeType
        }
    },
    groupGID: function (node: Node, child: Node) {
        var gid = node.id

        // group only nodes of same type
        var nodeType = DefaultConfig.groupType(node)
        gid += "_" + nodeType

        // group only nodes being at the same level, meaning weight
        var weight = child.getWeight()
        gid += "_" + weight

        // group only nodes with the same gorup name
        var name = DefaultConfig.groupName(child)
        gid += "_" + name

        return gid
    },
    groupName: function (child: Node) {
        var nodeType = DefaultConfig.groupType(child)
        if (!nodeType) {
            return !nodeType
        }

        if (child.data.K8s) {
            var labels = child.data.K8s.Labels
            if (!labels) {
                return name
            }

            var app = labels["k8s-app"] || labels["app"]
            if (!app) {
                return "default"
            }
            return app
        }

        return nodeType + "(s)"
    },
    weightTitles: {
        0: "Not classified",
        1: "Kubernetes",
        10: "Fabric",
        13: "Physical",
        14: "Bridges",
        15: "Ports",
        17: "Virtual",
        18: "Namespaces",
        19: "VMs"
    },
    suggestions: [
        "data.IPV4",
        "data.MAC",
        "data.Name"
    ],
    nodeDataFields: [
        {
            field: "",
            title: "General",
            expanded: true,
            icon: "\uf05a",
            sortKeys: function (data) {
                return ['Name', 'Type', 'MAC', 'Driver', 'State']
            },
            filterKeys: function (data) {
                switch (data.Type) {
                    case "host":
                        return ['Name']
                    default:
                        return ['Name', 'Type', 'MAC', 'Driver', 'State']
                }
            }
        },
        {
            field: "Sockets",
            expanded: false,
            icon: "\uf1e6"
        },
        {
            field: "Captures",
            expanded: false,
            icon: "\uf51f",
            normalizer: function (data) {
                for (let capture of data) {
                    capture.ID = capture.ID.split('-')[0]
                }
                return data
            }
        },
        {
            field: "Injections",
            expanded: false,
            icon: "\uf48e"
        },
        {
            field: "Docker",
            expanded: false,
            icon: "\uf395",
            iconClass: "font-brands"
        },
        {
            field: "IPV4",
            expanded: true,
            icon: "\uf1fa"
        },
        {
            field: "IPV6",
            expanded: true,
            icon: "\uf1fa"
        },
        {
            field: "LastUpdateMetric",
            title: "Last metrics",
            expanded: false,
            icon: "\uf201",
            normalizer: function (data) {
                return {
                    RxPackets: data.RxPackets ? data.RxPackets.toLocaleString() : 0,
                    RxBytes: data.RxBytes ? Tools.prettyBytes(data.RxBytes) : 0,
                    TxPackets: data.TxPackets ? data.TxPackets.toLocaleString() : 0,
                    TxBytes: data.TxPackets ? Tools.prettyBytes(data.TxBytes) : 0,
                    Start: data.Start ? new Date(data.Start).toLocaleString() : 0,
                    Last: data.Last ? new Date(data.Last).toLocaleString() : 0
                }
            },
            graph: function (data) {
                return {
                    type: "LineChart",
                    data: [
                        [
                            { type: "datetime", label: "time" },
                            "RxBytes",
                            "TxBytes"
                        ],
                        [new Date(data.Last || 0), data.RxBytes || 0, data.TxBytes || 0]
                    ]
                }
            }
        },
        {
            field: "Metric",
            title: "Total metrics",
            expanded: false,
            icon: "\uf201",
            normalizer: function (data) {
                return {
                    RxPackets: data.RxPackets ? data.RxPackets.toLocaleString() : 0,
                    RxBytes: data.RxBytes ? Tools.prettyBytes(data.RxBytes) : 0,
                    TxPackets: data.TxPackets ? data.TxPackets.toLocaleString() : 0,
                    TxBytes: data.TxPackets ? Tools.prettyBytes(data.TxBytes) : 0,
                    Last: data.Last ? new Date(data.Last).toLocaleString() : 0
                }
            }
        },
        {
            field: "Features",
            expanded: false,
            icon: "\uf022"
        },
        {
            field: "FDB",
            expanded: false,
            icon: "\uf0ce"
        },
        {
            field: "Neighbors",
            expanded: false,
            icon: "\uf0ce"
        },
        {
            field: "RoutingTables",
            title: "Routing tables",
            expanded: false,
            icon: "\uf0ce",
            normalizer: function (data) {
                var rows = new Array<any>()
                for (let table of data) {
                    if (!table.Routes) {
                        continue
                    }
                    for (let route of table.Routes) {
                        if (!route.NextHops) {
                            continue
                        }
                        for (let nh of route.NextHops) {
                            rows.push({
                                ID: table.ID,
                                Src: table.Src,
                                Protocol: route["Protocol"],
                                Prefix: route["Prefix"],
                                Priority: nh["Priority"],
                                IP: nh["IP"],
                                IfIndex: nh["IfIndex"]
                            })
                        }
                    }
                }

                return rows
            }
        }
    ],
    linkAttrs: function (link: Link) {
        var attrs = { classes: [link.data.RelationType], icon: "\uf362", directed: false }

        if (link.data.Directed) {
            attrs.directed = true
        }

        return attrs
    },
    linkTabTitle: function (link: Link) {
        var src = link.source.data.Name
        var dst = link.target.data.Name
        if (src && dst) {
            return src.substring(0, 8) + " / " + dst.substring(0, 8)
        }
        return link.id.split("-")[0]
    },
    linkDataFields: [
        {
            field: "",
            title: "General",
            expanded: true,
            icon: "\uf05a",
        },
        {
            field: "NSM",
            title: "Network Service Mesh",
            expanded: true,
            icon: "\uf542",
        },
        {
            field: "NSM.Source",
            title: "Source",
            expanded: false,
            icon: "\uf018",
        },
        {
            field: "NSM.Via",
            title: "Via",
            expanded: false,
            icon: "\uf018",
        },
        {
            field: "NSM.Destination",
            title: "Destination",
            expanded: false,
            icon: "\uf018",
        },
    ]
}

export default DefaultConfig
