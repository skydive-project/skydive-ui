import React, { Component } from 'react'
import { hierarchy, tree } from 'd3-hierarchy'
import { select, event } from 'd3-selection'
import { line, linkVertical, curveCardinalClosed } from 'd3-shape'
import { } from 'd3-transition'
import { zoom } from 'd3-zoom'
import { schemeOranges, schemeBlues } from 'd3-scale-chromatic'
import { scaleOrdinal } from 'd3-scale'
import { } from 'd3-selection-multi'

var colorOranges = scaleOrdinal(schemeOranges[9])
var colorBlues = scaleOrdinal(schemeBlues[9])

export class TopologyComponent extends Component {
    constructor(props) {
        super(props)

        this.width = 1200
        this.height = 1200

        this.nodeWidth = 100
        this.nodeHeight = 200

        this.tree = tree().nodeSize([this.nodeWidth, this.nodeHeight])
    }

    componentDidMount() {
        this.createTree()
    }

    componentDidUpdate() {
        this.createTree()
    }

    createTree() {
        // node state
        var states = {}
        var defaultState = () => { return { expanded: true } }

        var treeRoot = {
            id: "root",
            data: {
                name: "root"
            },
            layer: 0,
            children: []
        }
        states[treeRoot.id] = defaultState()

        var layerLinks = []

        // return depth of the given layer
        var layerHeight = (node, layer, currDepth) => {
            if (node.layer > layer) {
                return 0
            }

            var maxDepth = currDepth
            node.children.forEach(child => {
                let depth = layerHeight(child, layer, currDepth + 1)
                if (depth > maxDepth) {
                    maxDepth = depth
                }
            })

            return maxDepth
        }

        var clone = (node, parent) => {
            let state = states[node.id]
            let cloned = { id: node.id, _node: node, layer: node.layer, children: [], parent: parent, state: state }

            if (states[node.id].expanded) {
                node.children.forEach(child => {
                    cloned.children.push(clone(child, cloned))
                })
            }

            return cloned
        }

        // re-order tree to add placeholder node in order to separate layers
        var normalizeTreeHeight = (root, node, layer, currDepth) => {
            if (node.layer > layer) {
                return
            }

            if (node.layer === layer && node.parent && node.parent.layer !== layer) {
                let parentDepth = layerHeight(root, node.layer - 1, 0)

                let children = node.parent.children
                let index = children.indexOf(node)

                while (currDepth++ <= parentDepth) {
                    node = { id: node.id + "-" + currDepth, children: [node] }
                }
                children[index] = node

                return
            }

            node.children.forEach(child => {
                normalizeTreeHeight(root, child, layer, currDepth + 1)
            })
        }

        var maxLayer = 0

        var addChild = (parent, id, data, layer) => {
            if (layer > maxLayer) {
                maxLayer = layer
            }

            var child = {
                id: id,
                parent: parent,
                layer: layer,
                data: data,
                children: []
            }
            parent.children.push(child)

            states[id] = defaultState()

            return child
        }

        var addLayerLink = (node1, node2, data) => {
            layerLinks.push({
                id: node1.id + "-" + node2.id,
                data: data,
                source: node1,
                target: node2
            })
        }

        var svg = select(this.node)

        var g = svg
            .call(zoom()
                .scaleExtent([0.05, 3])
                .on("zoom", () => g.attr("transform", event.transform.toString())))
            .append("g")

        var gLayers = g.append("g")
            .attr("class", "layers")
            .attr("fill", "none")
            .attr("fill-opacity", 0.2)

        var gHieraLinks = g.append("g")
            .attr("class", "links")
            .attr("fill", "none")
            .attr("stroke", "#555")
            .attr("stroke-opacity", 0.9)
            .attr("stroke-width", 1)

        var gLayerLinks = g.append("g")
            .attr("class", "layer-links")
            .attr("fill", "none")
            .attr("stroke", "#c8293c")
            .attr("stroke-width", 3)

        var gNodes = g.append("g")
            .attr("class", "nodes")

        var collapse = node => {
            if (node.state) {
                node.state.expanded = false
            }
            node.children.forEach(child => collapse(child))
        }

        var expand = function (d) {
            select(this).select("text").text(() => {
                if (d.data.state.expanded) {
                    return "\uf067"
                }
                return "\uf068"
            })

            if (d.data.state.expanded) {
                collapse(d.data)
            } else {
                d.data.state.expanded = true
            }

            update()
        }

        var update = () => {
            let normTreeRoot = clone(treeRoot)
            for (let i = 0; i <= maxLayer; i++) {
                normalizeTreeHeight(normTreeRoot, normTreeRoot, i, 0)
            }

            let root = hierarchy(normTreeRoot)
            this.tree(root)

            let holders = {}
            root.each(node => {
                holders[node.data.id] = node
            })

            var visibleLayerLinks = () => {
                let links = []

                let findVisible = (node) => {
                    while(node) {
                        if (holders[node.id]) {
                            return node
                        }
                        node = node.parent
                    }
                }

                layerLinks.forEach(link => {
                    let source = findVisible(link.source)
                    let target = findVisible(link.target)

                    if (source && target && source !== target) {
                        links.push({
                            id: link.id,
                            source: source,
                            target: target,
                        })
                    }
                })

                return links
            }

            var _layerNodes = (node, nodes) => {
                if (!nodes) {
                    nodes = {}
                }

                if (node.data.layer) {
                    let arr = nodes[node.data.layer]
                    if (!arr) {
                        nodes[node.data.layer] = arr = { id: node.data.layer, nodes: [node] }
                    } else {
                        arr.nodes.push(node)
                    }
                }

                if (node.children) {
                    node.children.forEach(child => {
                        _layerNodes(child, nodes)
                    })
                }

                return nodes
            }

            var layerNodes = (node) => {
                return Object.values(_layerNodes(node, {}))
            }

            var boundingBox = (node, bb) => {
                if (!bb) {
                    bb = [node.x, node.x]
                } else {
                    if (bb[0] > node.x) {
                        bb[0] = node.x
                    }
                    if (bb[1] < node.x) {
                        bb[1] = node.x
                    }
                }

                if (node.children) {
                    node.children.forEach(child => {
                        boundingBox(child, bb)
                    })
                }

                return bb
            }

            var nodesRect = (nodes) => {
                let node0 = nodes[0]
                let nBB = [node0.y, node0.y]

                for (let node of nodes) {
                    if (nBB[0] > node.y) {
                        nBB[0] = node.y
                    }
                    if (nBB[1] < node.y) {
                        nBB[1] = node.y
                    }
                }

                let gBB = boundingBox(root)
                const margin = 100

                return {
                    x: gBB[0] - margin,
                    y: nBB[0] - margin,
                    width: gBB[1] - gBB[0] + margin * 2,
                    height: nBB[1] - nBB[0] + margin * 2
                }
            }

            var linker = linkVertical()
                .x(d => d.x)
                .y(d => d.y)

            var layers = gLayers.selectAll('rect.layer')
                .data(layerNodes(root))
            var layersEnter = layers.enter()
                .append('rect')
                .attr("class", "layer")
                .attr("id", d => "toto" + d.id)
                .style("opacity", 0)
                .attr("stroke", "#000")
                .attr("stroke-dasharray", "5,10")
                .attr("fill", d => colorBlues(d.id))
                .attrs(d => nodesRect(d.nodes))
            layers.exit().remove()

            layersEnter.transition()
                .duration(500)
                .style("opacity", 1)

            layers.transition()
                .duration(500)
                .attrs(d => nodesRect(d.nodes))

            var hieraLink = gHieraLinks.selectAll('path.link')
                .data(root.links(), d => d.source.data.id + d.target.data.id)
            var hieraLinkEnter = hieraLink.enter()
                .append('path')
                .attr("class", "link")
                .attr("stroke-dasharray", "5,10")
                .style("opacity", 0)
                .attr("d", linker)
            hieraLink.exit().remove()

            hieraLinkEnter.transition()
                .duration(500)
                .style("opacity", 1)

            hieraLink.transition()
                .duration(500)
                .attr("d", linker)

            var node = gNodes.selectAll('g.node')
                .data(root.descendants(), d => d.data.id)

            node.exit()
                .transition()
                .duration(500).style("opacity", 0)
                .remove()

            var nodeEnter = node.enter()
                .filter(d => d.data._node)
                .append("g")
                .attr("class", "node")
                .style("opacity", 0)
                .attr("transform", d => `translate(${d.x},${d.y})`)

            nodeEnter.transition()
                .duration(500)
                .style("opacity", 1)

            const hexSize = 30

            var groupColors = (d) => {
                return colorOranges(d.data._node.layer)
            }

            nodeEnter.append("circle")
                .attr("r", hexSize + 14)
                .attr("fill", "#fff")
                .attr("stroke", groupColors)
                .attr("stroke-width", 3)

            nodeEnter.append("circle")
                .attr("r", hexSize + 8)
                .attr("fill", groupColors)

            var hexagon = (d, size) => {
                var s32 = (Math.sqrt(3) / 2)

                if (!size) {
                    size = 20
                }

                return [
                    { "x": size, "y": 0 },
                    { "x": size / 2, "y": size * s32 },
                    { "x": -size / 2, "y": size * s32 },
                    { "x": -size, "y": 0 },
                    { "x": -size / 2, "y": -size * s32 },
                    { "x": size / 2, "y": -size * s32 }
                ]
            }

            var liner = line()
                .x(d => d.x)
                .y(d => d.y)
                .curve(curveCardinalClosed.tension(0.7))

            var types = {
                host: { color: "#114B5F", icon: "\uf109", text: "#eee" },
                bridge: { color: "#1A936F", icon: "\uf1e0", text: "#eee" },
                interface: { color: "#88D498", icon: "\uf120", text: "#444" },
                netns: { color: "#C6DABF", icon: "\uf24d", text: "#444" },
                port: { color: "#1A936F", icon: "\uf0e8", text: "#eee" },
                unknown: { color: "#C9ADA7", icon: "\uf192", text: "#444" }
            }

            var type = (d) => {
                return types[d.data._node.data.type] ? types[d.data._node.data.type] : types["unknown"]
            }

            nodeEnter.append("path")
                .attr("d", d => liner(hexagon(d, hexSize)))
                .attr("stroke", "#455f6b")
                .attr("fill", d => type(d).color)
                .attr("stroke-dasharray", "5,5")

            nodeEnter.append("text")
                .attr("class", "icon")
                .style("font-size", "24px")
                .attr("alignment-baseline", "middle")
                .attr("fill", d => type(d).text)
                .attr("text-anchor", "middle")
                .style("font-family", "FontAwesome")
                .text(d => type(d).icon)

            nodeEnter.append("text")
                .style("font-size", "24px")
                .attr("dy", ".35em")
                .attr("y", d => d.children ? -60 : 60)
                .style("text-anchor", "middle")
                .text(d => d.data._node.data ? d.data._node.data.name : "")

            var exco = nodeEnter
                .filter(d => d.data._node.children.length > 0)
                .append("g")
            exco.on("click", expand)

            exco.append("circle")
                .attr("class", "collapse")
                .attr("cx", hexSize - 5)
                .attr("cy", hexSize - 5)
                .attr("r", d => d.data._node.children.length ? 10 : 0)
                .attr("fill", "#48e448")
                .attr("stroke", "#666")

            exco.append("text")
                .attr("class", "text-collapse")
                .attr("x", hexSize - 5)
                .attr("y", hexSize - 1)
                .style("font-size", "10px")
                .attr("fill", "#fff")
                .attr("text-anchor", "middle")
                .style("font-family", "FontAwesome")
                .text(d => d.data.state.expanded ? "\uf068" : "\uf067")

            node.transition()
                .duration(500)
                .style("opacity", 1)
                .attr("transform", d => `translate(${d.x},${d.y})`)

            var layerLinker = linkVertical()
                .x(d => holders[d.node.id].x)
                .y(d => holders[d.node.id].y + d.dy)

            var layerLink = gLayerLinks.selectAll('path.layer-link')
                .data(visibleLayerLinks(), d => d.id)
            var layerLinkEnter = layerLink.enter()
                .append('path')
                .attr("class", "layer-link")
                .style("opacity", 0)
                .attr('marker-start', "url(#square)")
                .attr('marker-end', "url(#square)")
                .attr("d", d => layerLinker(
                    { source: { node: d.source, dy: 55 }, target: { node: d.target, dy: -55 } }
                ))
            layerLink.exit().remove()

            layerLinkEnter.transition()
                .duration(500)
                .style("opacity", 1)

            layerLink.transition()
                .duration(500)
                .style("opacity", 1)
                .attr("d", d => layerLinker(
                    { source: { node: d.source, dy: 55 }, target: { node: d.target, dy: -55 } }
                ))
        }

        var i = 0
        setInterval(() => {
            if (i > 1) {
                return
            }
            i++

            var host = addChild(treeRoot, "host-" + i, { name: "host " + i, type: "host" }, 1)
            addChild(host, "host-lo-" + i, { name: "lo", type: "interface" }, 1)
            addChild(host, "host-ethO-" + i, { name: "eth0", type: "interface" }, 1)
            var hbr = addChild(host, "host-br-int-" + i, { name: "br-int", type: "interface" }, 1)

            var br = addChild(host, "br-int-" + i, { name: "br-int", type: "bridge" }, 2)

            addLayerLink(hbr, br, { RelationType: "layer2" })

            var port1 = addChild(br, "port1-" + i, { name: "port1", type: "port" }, 2)
            var port2 = addChild(br, "port2-" + i, { name: "port2", type: "port" }, 2)
            var port3 = addChild(br, "port3-" + i, { name: "port3", type: "port" }, 2)

            addLayerLink(br, port1, { RelationType: "layer2" })
            addLayerLink(br, port2, { RelationType: "layer2" })
            addLayerLink(br, port3, { RelationType: "layer2" })

            var ns1 = addChild(host, "ns1-" + i, { name: "ns1", type: "netns" }, 3)
            addChild(ns1, "ns1-lo-" + i, { name: "lo", type: "interface" }, 3)
            var eth0 = addChild(ns1, "ns1-eth0-" + i, { name: "eth0", type: "interface" }, 3)

            addLayerLink(port1, eth0, { RelationType: "layer2" })

            var ns2 = addChild(host, "ns2-" + i, { name: "ns2", type: "netns" }, 3)
            addChild(ns2, "ns2-lo-" + i, { name: "lo", type: "interface" }, 3)
            var eth0 = addChild(ns2, "ns2-eth0-0" + i, { name: "eth0", type: "interface" }, 3)

            addLayerLink(port2, eth0, { RelationType: "layer2" })

            update(null, true)
        }, 700)
    }

    render() {
        return (
            <svg ref={node => this.node = node} width={1200} height={1200}>
                <defs>
                    <marker id="square" viewBox="-5 -5 10 10" markerWidth="6" markerHeight="6" orient="auto">
                        <path d="M 0,0 m -5,-5 L 5,-5 L 5,5 L -5,5 Z" fill="#c8293c"></path>
                    </marker>
                </defs>
            </svg>
        )
    }
}