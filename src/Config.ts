/*
 * Copyright (C) 2020 Sylvain Afchain
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import { Node, Link, NodeAttrs, LinkAttrs } from './Topology'
import Tools from './Tools'

const WEIGHT_NONE = 0
const WEIGHT_FABRIC = 10
const WEIGHT_PHYSICAL = 13
const WEIGHT_BRIDGES = 14
const WEIGHT_PORTS = 15
const WEIGHT_VIRTUAL = 17
const WEIGHT_NAMESPACE = 18
const WEIGHT_VMS = 19
const WEIGHT_CONTAINERS = 20
const WEIGHT_K8S_FEDERATION = 100
const WEIGHT_K8S_CLUSTER = 101
const WEIGHT_K8S_NODE = 102
const WEIGHT_K8S_NAMESPACE = 103
const WEIGHT_K8S_POD = 104
const WEIGHT_K8S_CONTAINER = 105
const WEIGHT_K8S_SERVICE = 106
const WEIGHT_K8S_OTHER = 120

export interface Filter {
    id: string
    label: string
    category: string
    tag: string
    callback: () => void
}

export interface MenuItem {
    class: string
    text: string
    disabled: boolean
    callback: () => void
}

export interface GraphField {
    type: string,
    data: any
}

export interface NodeDataField {
    field: string
    title?: string
    expanded: boolean
    icon: string
    iconClass?: string
    sortKeys?: (data: any) => Array<string>
    filterKeys?: (data: any) => Array<string>
    normalizer?: (data: any) => any
    graph?: (data: any) => GraphField
}

export interface LinkDataField {
    field: string
    title: string
    expanded: boolean
    icon: string
}

export interface Config {
    subTitle?(subTitle: string): string
    filters?(filters: Array<Filter>): Array<Filter>
    defaultFilter?(): Filter

    nodeAttrs?(attrs: NodeAttrs | null, node: Node): NodeAttrs
    nodeSortFnc?(a: Node, b: Node): number
    nodeClicked?(node: Node): void
    nodeDblClicked?(node: Node): void

    nodeMenu?(items: Array<MenuItem>, node: Node): Array<MenuItem>
    nodeTags?(tags: Array<string>, node: Node): Array<string>

    defaultNodeTag?(): string
    nodeTabTitle?(node: Node): string

    groupSize?(): number
    groupType?(node: Node): string | undefined
    groupName?(node: Node): string | undefined
    weightTitles?(): Map<number, string>

    suggestions?(): Array<string>

    nodeDataFields?(dataFields: Array<NodeDataField>): Array<NodeDataField>

    linkAttrs?(attrs: LinkAttrs | null, link: Link): LinkAttrs
    linkTabTitle?(link: Link): string

    linkDataFields?(dataFields: Array<LinkDataField>): Array<LinkDataField>

    defaultLinkTagMode?(): number
}

class ConfigWithID {
    id: string
    config: Config

    constructor(id: string, config: Config) {
        this.id = id
        this.config = config
    }
}

export default class ConfigReducer {
    default: DefaultConfig
    configs: Array<ConfigWithID>

    constructor() {
        this.default = new DefaultConfig()
        this.configs = new Array<ConfigWithID>()
    }

    append(id: string, config: Config) {
        this.configs.push(new ConfigWithID(id, config))
    }

    appendURL(id: string, url: string): Promise<Config | undefined> {
        var promise = new Promise<Config>((resolve, reject) => {
            if (!url) {
                resolve()
                return
            }

            fetch(url).then(resp => {
                resp.text().then(data => {
                    try {
                        var config = eval(data)
                        this.append(id, config)

                        resolve(config)
                    } catch (e) {
                        reject(e)
                    }
                })
            }).catch((reason) => {
                throw Error(reason)
            })
        })

        return promise
    }

    subTitle(): string {
        var subTitle = this.default.subTitle()
        for (let c of this.configs) {
            if (c.config.subTitle) {
                subTitle = c.config.subTitle(subTitle)
            }
        }
        return subTitle
    }

    filters(node: Node): Array<Filter> {
        var filters = this.default.filters(node)
        for (let c of this.configs) {
            if (c.config.filters) {
                filters = c.config.filters(filters)
            }
        }
        return filters
    }

    defaultFilter(): Filter {
        var defaultFilter = this.default.defaultFilter()
        for (let c of this.configs) {
            if (c.config.defaultFilter) {
                defaultFilter = c.config.defaultFilter()
            }
        }
        return defaultFilter
    }

    nodeAttrs(node: Node): NodeAttrs {
        var attrs = this.default.nodeAttrs(node)
        for (let c of this.configs) {
            if (c.config.nodeAttrs) {
                attrs = c.config.nodeAttrs(attrs, node)
            }
        }
        return attrs
    }

    nodeSortFnc(a: Node, b: Node): number {
        var fnc = this.default.nodeSortFnc
        for (let c of this.configs) {
            if (c.config.nodeSortFnc) {
                fnc = c.config.nodeSortFnc
            }
        }
        return fnc(a, b)
    }

    nodeClicked(node: Node): void {
        var fnc = this.default.nodeClicked
        for (let c of this.configs) {
            if (c.config.nodeClicked) {
                fnc = c.config.nodeClicked
            }
        }
        return fnc(node)
    }

    nodeDblClicked(node: Node): void {
        var fnc = this.default.nodeDblClicked
        for (let c of this.configs) {
            if (c.config.nodeDblClicked) {
                fnc = c.config.nodeDblClicked
            }
        }
        return fnc(node)
    }

    nodeMenu(node: Node): Array<MenuItem> {
        var items = this.default.nodeMenu(node)
        for (let c of this.configs) {
            if (c.config.nodeMenu) {
                items = c.config.nodeMenu(items, node)
            }
        }
        return items
    }

    nodeTags(node: Node): Array<string> {
        var tags = this.default.nodeTags(node)
        for (let c of this.configs) {
            if (c.config.nodeTags) {
                tags = c.config.nodeTags([], node)
            }
        }
        return tags
    }

    defaultNodeTag(): string {
        var defaultNodeTag = this.default.defaultNodeTag()
        for (let c of this.configs) {
            if (c.config.defaultNodeTag) {
                defaultNodeTag = c.config.defaultNodeTag()
            }
        }
        return defaultNodeTag
    }

    nodeTabTitle(node: Node): string {
        var nodeTabTitle = this.default.nodeTabTitle(node)
        for (let c of this.configs) {
            if (c.config.nodeTabTitle) {
                nodeTabTitle = c.config.nodeTabTitle(node)
            }
        }
        return nodeTabTitle
    }

    groupSize(): number {
        var size = this.default.groupSize()
        for (let c of this.configs) {
            if (c.config.groupSize) {
                size = c.config.groupSize()
            }
        }
        return size
    }

    groupType(node: Node): string | undefined {
        var groupType = this.default.groupType(node)
        for (let c of this.configs) {
            if (c.config.groupType) {
                groupType = c.config.groupType(node)
            }
        }
        return groupType
    }

    groupName(node: Node): string | undefined {
        var groupName = this.default.groupName(node)
        for (let c of this.configs) {
            if (c.config.groupName) {
                groupName = c.config.groupName(node)
            }
        }
        return groupName
    }

    weightTitles(): Map<number, string> {
        var titles = this.default.weightTitles()
        for (let c of this.configs) {
            if (c.config.weightTitles) {
                titles = c.config.weightTitles()
            }
        }
        return titles
    }

    suggestions(): Array<string> {
        var result = this.default.suggestions()
        for (let c of this.configs) {
            if (c.config.suggestions) {
                result = c.config.suggestions()
            }
        }
        return result
    }

    nodeDataFields(): Array<NodeDataField> {
        var fields = this.default.nodeDataFields()
        for (let c of this.configs) {
            if (c.config.nodeDataFields) {
                fields = c.config.nodeDataFields(fields)
            }
        }
        return fields
    }

    linkAttrs(link: Link): LinkAttrs {
        var attrs = this.default.linkAttrs(link)
        for (let c of this.configs) {
            if (c.config.linkAttrs) {
                attrs = c.config.linkAttrs(attrs, link)
            }
        }
        return attrs
    }

    linkTabTitle(link: Link): string {
        var title = this.default.linkTabTitle(link)
        for (let c of this.configs) {
            if (c.config.linkTabTitle) {
                title = c.config.linkTabTitle(link)
            }
        }
        return title
    }

    linkDataFields(): Array<LinkDataField> {
        var fields = this.default.linkDataFields()
        for (let c of this.configs) {
            if (c.config.linkDataFields) {
                fields = c.config.linkDataFields(fields)
            }
        }
        return fields
    }

    defaultLinkTagMode(): number {
        var size = this.default.defaultLinkTagMode()
        for (let c of this.configs) {
            if (c.config.defaultLinkTagMode) {
                size = c.config.defaultLinkTagMode()
            }
        }
        return size
    }
}

class DefaultConfig {
    subTitle(): string {
        return ""
    }

    filters(node: Node): Array<Filter> {
        switch (node.data.Type) {
            case "host":
                return [
                    {
                        id: node.data.Name,
                        label: node.data.Name,
                        category: "host",
                        tag: "infrastructure",
                        callback: () => {
                            var gremlin = "G.V().Has(" +
                                "'Name','" + node.data.Name + "'," +
                                "'Type','host'" +
                                ").descendants().SubGraph()"

                            window.App.setGremlinFilter(gremlin)
                        }
                    }
                ]
            case "namespace":
                return [
                    {
                        id: node.data.Name,
                        label: node.data.Name,
                        category: "namespaces",
                        tag: "kubernetes",
                        callback: () => {
                            var gremlin = "G.V().Has(" +
                                "'Name','" + node.data.Name + "'," +
                                "'Type','namespace'" +
                                ").descendants().SubGraph()"

                            window.App.setGremlinFilter(gremlin)
                        }
                    }
                ]
            default:
                return []
        }
    }

    defaultFilter(): Filter {
        return {
            id: "default",
            label: "Default",
            category: "default",
            tag: "infrastructure",
            callback: () => {
                var gremlin = ""            
                window.App.setGremlinFilter(gremlin)
            }
        }
    }

    private newAttrs(node: Node): NodeAttrs {
        var name = node.data.Name
        if (name.length > 24) {
            name = node.data.Name.substring(0, 24) + "."
        }

        var attrs = {
            classes: [node.data.Type],
            name: name,
            icon: "\uf192",
            href: '',
            iconClass: '',
            weight: 0,
            badges: []
        }

        return attrs
    }

    private nodeAttrsK8s(node: Node): NodeAttrs {
        var attrs = this.newAttrs(node)

        switch (node.data.Type) {
            case "cluster":
                attrs.href = "assets/icons/cluster.png"
                attrs.weight = WEIGHT_K8S_CLUSTER
                break
            /*
            case "configmap":
                attrs.href = "assets/icons/configmap.png"
                attrs.weight = WEIGHT_K8S_POD
                break
            case "cronjob":
                attrs.href = "assets/icons/cronjob.png"
                attrs.weight = WEIGHT_K8S_POD
                break
            case "daemonset":
                attrs.href = "assets/icons/daemonset.png"
                attrs.weight = WEIGHT_K8S_POD
                break
            case "deployment":
                attrs.href = "assets/icons/deployment.png"
                attrs.weight = WEIGHT_K8S_POD
                break
            case "endpoints":
                attrs.href = "assets/icons/endpoints.png"
                attrs.weight = WEIGHT_K8S_POD
                break
            case "ingress":
                attrs.href = "assets/icons/ingress.png"
                attrs.weight = WEIGHT_K8S_POD
                break
            case "job":
                attrs.href = "assets/icons/job.png"
                attrs.weight = WEIGHT_K8S_POD
                break
            case "persistentvolume":
                attrs.href = "assets/icons/persistentvolume.png"
                attrs.weight = WEIGHT_K8S_POD
                break
            case "persistentvolumeclaim":
                attrs.href = "assets/icons/persistentvolumeclaim.png"
                attrs.weight = WEIGHT_K8S_POD
                break
            case "networkpolicy":
                attrs.href = "assets/icons/networkpolicy.png"
                attrs.weight = WEIGHT_K8S_POD
                break
            case "replicaset":
                attrs.href = "assets/icons/replicaset.png"
                attrs.weight = WEIGHT_K8S_POD
                break
            case "replicationcontroller":
                attrs.href = "assets/icons/replicationcontroller.png"
                attrs.weight = WEIGHT_K8S_POD
                break
            case "secret":
                attrs.href = "assets/icons/secret.png"
                attrs.weight = WEIGHT_K8S_POD
                break
            case "statefulset":
                attrs.href = "assets/icons/statefulset.png"
                attrs.weight = WEIGHT_K8S_POD
                break
            case "storageclass":
                attrs.href = "assets/icons/storageclass.png"
                attrs.weight = WEIGHT_K8S_NODE
                break
            */
            case "node":
                attrs.icon = "\uf109"
                attrs.weight = WEIGHT_K8S_NODE
                break
            case "namespace":
                attrs.icon = "\uf24d"
                attrs.weight = WEIGHT_K8S_NAMESPACE
                break
            case "pod":
                attrs.href = "assets/icons/pod.png"
                attrs.weight = WEIGHT_K8S_POD
                break
            case "container":
                attrs.href = "assets/icons/container.png"
                attrs.weight = WEIGHT_K8S_CONTAINER
                break
            case "service":
                attrs.href = "assets/icons/service.png"
                attrs.weight = WEIGHT_K8S_SERVICE
                break
            default:
                attrs.href = "assets/icons/k8s.png"
                attrs.weight = WEIGHT_K8S_OTHER
        }

        return attrs
    }

    private nodeAttrsInfra(node: Node): NodeAttrs {
        var attrs = this.newAttrs(node)

        if (node.data.OfPort) {
            attrs.weight = WEIGHT_PORTS
        }

        switch (node.data.Type) {
            case "host":
                attrs.icon = "\uf109"
                attrs.weight = WEIGHT_PHYSICAL
                break
            case "switch":
                attrs.icon = "\uf6ff"
                break
            case "bridge":
            case "ovsbridge":
                attrs.icon = "\uf6ff"
                attrs.weight = WEIGHT_BRIDGES
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
                attrs.weight = WEIGHT_VIRTUAL
                break
            case "veth":
                attrs.icon = "\uf4d7"
                attrs.weight = WEIGHT_VIRTUAL
                break
            case "switchport":
                attrs.icon = "\uf0e8"
                break
            case "patch":
            case "port":
            case "ovsport":
                attrs.icon = "\uf0e8"
                attrs.weight = WEIGHT_PORTS
                break
            case "netns":
                attrs.icon = "\uf24d"
                attrs.weight = WEIGHT_NAMESPACE
                break
            case "container":
                attrs.icon = "\uf49e"
                attrs.weight = WEIGHT_CONTAINERS
                break
            case "libvirt":
                attrs.icon = "\uf109"
                attrs.weight = WEIGHT_VMS
                break
        }

        if (node.data.Manager === "docker") {
            attrs.badges = [{ text: "\uf395", iconClass: 'font-brands' }]
        } else if (node.data.Manager === "runc") {
            attrs.badges = [{ text: "\uf7bc", iconClass: 'font-brands' }]
        }

        if (node.data.IPV4 && node.data.IPV4.length) {
            attrs.weight = WEIGHT_PHYSICAL
        }

        var virt = ["tap", "veth", "tun", "openvswitch"]
        if (node.data.Driver && virt.indexOf(node.data.Driver) < 0) {
            attrs.weight = WEIGHT_PHYSICAL
        }

        if (node.data.Probe === "fabric") {
            attrs.weight = WEIGHT_FABRIC
        }

        if (node.data.Captures) {
            attrs.badges = [{ text: "\uf03d" }]
        }

        return attrs
    }

    nodeAttrs(node: Node): NodeAttrs {
        switch (node.data.Manager) {
            case "k8s":
                return this.nodeAttrsK8s(node)
            default:
                return this.nodeAttrsInfra(node)
        }
    }

    nodeSortFnc(a: Node, b: Node): number {
        return a.data.Name.localeCompare(b.data.Name)
    }

    nodeClicked(node: Node): void {
        window.App.tc.selectNode(node.id)
    }

    nodeDblClicked(node: Node): void {
        window.App.tc.expand(node)
    }

    nodeMenu(node: Node): Array<MenuItem> {
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
            //{ class: "", text: "Flows", disabled: false, callback: () => { console.log("Flows") } },
            //{ class: "", text: "Filter NS(demo)", disabled: false, callback: () => { window.App.loadExtraConfig("/assets/nsconfig.js") } }
        ]
    }

    nodeTags(data: any): Array<string> {
        if (data.Manager && data.Manager === "k8s") {
            switch (data.Type) {
                case "container":
                case "pod":
                    return ["kubernetes", "compute"]
                default:
                    return ["kubernetes"]
            }
        } else {
            switch (data.Type) {
                case "host":
                case "container":
                    return ["infrastructure", "compute"]
                default:
                    return ["infrastructure"]
            }
        }
    }

    defaultNodeTag() {
        return "infrastructure"
    }

    nodeTabTitle(node: Node): string {
        return node.data.Name.substring(0, 8)
    }

    groupSize(): number {
        return 3
    }

    groupType(node: Node): string | undefined {
        var nodeType = node.data.Type
        if (!nodeType) {
            return
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
    }

    groupName(node: Node): string | undefined {
        if (node.data.K8s) {
            var labels = node.data.K8s.Labels
            if (!labels) {
                return name + "(s)"
            }

            var app = labels["k8s-app"] || labels["app"]
            if (!app) {
                return "default"
            }
            return app
        }

        var nodeType = this.groupType(node)
        if (!nodeType) {
            return
        }

        return nodeType + "(s)"
    }

    weightTitles(): Map<number, string> {
        var wt = new Map<number, string>()
        wt.set(WEIGHT_NONE, "Not classified")
        wt.set(WEIGHT_FABRIC, "Fabric")
        wt.set(WEIGHT_PHYSICAL, "Physical")
        wt.set(WEIGHT_BRIDGES, "Bridges")
        wt.set(WEIGHT_PORTS, "Ports")
        wt.set(WEIGHT_VIRTUAL, "Virtual")
        wt.set(WEIGHT_NAMESPACE, "Namespaces")
        wt.set(WEIGHT_VMS, "VMs")
        wt.set(WEIGHT_CONTAINERS, "Containers")
        wt.set(WEIGHT_K8S_FEDERATION, "k8s-Federations")
        wt.set(WEIGHT_K8S_CLUSTER, "k8s-clusters")
        wt.set(WEIGHT_K8S_NODE, "k8s-nodes")
        wt.set(WEIGHT_K8S_NAMESPACE, "k8s-namespaces")
        wt.set(WEIGHT_K8S_POD, "k8s-pods")
        wt.set(WEIGHT_K8S_CONTAINER, "k8s-containers")
        wt.set(WEIGHT_K8S_SERVICE, "k8s-services")
        wt.set(WEIGHT_K8S_OTHER, "k8s-more")

        return wt
    }

    suggestions(): Array<string> {
        return [
            "data.IPV4",
            "data.MAC",
            "data.Name"
        ]
    }

    nodeDataFields(): Array<NodeDataField> {
        return [
            {
                field: "",
                title: "General",
                expanded: true,
                icon: "\uf05a",
                sortKeys: (data: any): Array<string> => {
                    return ['Name', 'Type', 'MAC', 'Driver', 'State']
                },
                filterKeys: (data: any): Array<string> => {
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
                normalizer: (data: any): any => {
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
                field: "Runc",
                expanded: false,
                icon: "\uf7bc",
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
                normalizer: (data: any): any => {
                    return {
                        RxPackets: data.RxPackets ? data.RxPackets.toLocaleString() : 0,
                        RxBytes: data.RxBytes ? Tools.prettyBytes(data.RxBytes) : 0,
                        TxPackets: data.TxPackets ? data.TxPackets.toLocaleString() : 0,
                        TxBytes: data.TxPackets ? Tools.prettyBytes(data.TxBytes) : 0,
                        Start: data.Start ? new Date(data.Start).toLocaleString() : 0,
                        Last: data.Last ? new Date(data.Last).toLocaleString() : 0
                    }
                },
                graph: (data: any): any => {
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
                normalizer: (data: any): any => {
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
                normalizer: (data: any): any => {
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
        ]
    }

    linkAttrs(link: Link): LinkAttrs {
        var metric = link.source.data.LastUpdateMetric
        var bandwidth = 0
        if (metric) {
            bandwidth = (metric.RxBytes + metric.TxBytes) * 8
            bandwidth /= (metric.Last - metric.Start) / 1000
        }

        var attrs = {
            classes: [link.data.RelationType],
            icon: "\uf362",
            directed: false,
            href: '',
            iconClass: '',
            label: bandwidth ? Tools.prettyBandwidth(bandwidth) : ""
        }

        if (bandwidth > 0) {
            attrs.classes.push('traffic')
        }

        if (link.data.RelationType === "layer2") {
            attrs.classes.push("traffic")
        }

        if (link.data.Directed) {
            attrs.directed = true
        }

        return attrs
    }

    linkTabTitle(link: Link): string {
        var src = link.source.data.Name
        var dst = link.target.data.Name
        if (src && dst) {
            return src.substring(0, 8) + " / " + dst.substring(0, 8)
        }
        return link.id.split("-")[0]
    }

    linkDataFields(): Array<LinkDataField> {
        return [
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
            }
        ]
    }

    defaultLinkTagMode(): number {
        return 2
    }
}
