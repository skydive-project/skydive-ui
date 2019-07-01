import React, { Component } from 'react'
import { hierarchy, tree } from 'd3-hierarchy'
import { select, event } from 'd3-selection'
import { line, linkVertical, curveCardinalClosed } from 'd3-shape'
import { } from 'd3-transition'
import { zoom } from 'd3-zoom'


export class TopologyComponent extends Component {
    constructor(props) {
        super(props)

        this.width = 1200
        this.height = 1200

        this.nodeWidth = 80
        this.nodeHeight = 100

        this.tree = tree().size([this.width, this.height]).nodeSize([this.nodeWidth, this.nodeHeight])
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

        var svg = select(this.node);

        var g = svg
            .call(zoom()
                .scaleExtent([0.05, 3])
                .on("zoom", () => g.attr("transform", event.transform.toString())))
            .append("g")

        var gLinks = g.append("g")
            .attr("class", "links")
            .attr("fill", "none")
            .attr("stroke", "#555")
            .attr("stroke-opacity", 0.4)
            .attr("stroke-width", 1)

        var gLayerLinks = g.append("g")
            .attr("class", "layer-links")
            .attr("fill", "none")
            .attr("stroke", "#400")
            .attr("stroke-opacity", 0.8)
            .attr("stroke-width", 1.5)

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

            update();
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

                layerLinks.forEach(link => {
                    if (holders[link.source.id] && holders[link.target.id]) {
                        links.push(link)
                    }
                })

                return links
            }

            var link = gLinks.selectAll('path.link')
                .data(root.links(), d => d.source.data.id + d.target.data.id)
            var linkEnter = link.enter()
                .append('path')
                .attr("class", "link")
                .attr("stroke-dasharray", "5,10")
                .style("opacity", 0)
                .attr("d", linkVertical()
                    .x(d => d.x)
                    .y(d => d.y))
            link.exit().remove()

            linkEnter.transition()
                .duration(500)
                .style("opacity", 1)

            link.transition()
                .duration(500)
                .style("opacity", 1)
                .attr("d", linkVertical()
                    .x(d => d.x)
                    .y(d => d.y))

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

            const hexSize = 20

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

            nodeEnter.append("path")
                .attr("d", d => liner(hexagon(d, hexSize)))
                .attr("stroke", "#455f6b")
                .attr("fill", "#c3dde2")
                .attr("stroke-dasharray", "5,5")

            nodeEnter.append("circle")
                .attr("fill", d => d.children ? "#555" : "#999")
                .attr("r", 2.5)

            nodeEnter.append("text")
                .attr("dy", ".35em")
                .attr("y", d => d.children ? -30 : 30)
                .style("text-anchor", "middle")
                .text(d => d.data._node.data ? d.data._node.data.name : "")

            var exco = nodeEnter.append("g")
            exco.on("click", expand);

            exco.append("circle")
                .attr("class", "collapse")
                .attr("cx", hexSize - 5)
                .attr("cy", hexSize - 5)
                .attr("r", d => d.data._node.children.length ? 7 : 0)
                .attr("fill", "#48e448")

            exco.append("text")
                .attr("class", "text-collapse")
                .attr("x", hexSize - 5)
                .attr("y", hexSize - 1)
                .attr("width", 20)
                .attr("height", 20)
                .style("font-size", "10px")
                .attr("fill", "#fff")
                .attr("text-anchor", "middle")
                .style("font-family", "FontAwesome")
                .text(d => d.data.state.expanded ? "\uf068" : "\uf067")

            node.transition()
                .duration(500)
                .style("opacity", 1)
                .attr("transform", d => `translate(${d.x},${d.y})`)


            var layerLink = gLayerLinks.selectAll('path.link')
                .data(visibleLayerLinks(), d => d.id)
            var layerLinkEnter = layerLink.enter()
                .append('path')
                .attr("class", "link")
                .style("opacity", 0)
                .attr("d", linkVertical()
                    .x(d => holders[d.id].x)
                    .y(d => holders[d.id].y))
            layerLink.exit().remove()

            layerLinkEnter.transition()
                .duration(500)
                .style("opacity", 1)

            layerLink.transition()
                .duration(500)
                .style("opacity", 1)
                .attr("d", linkVertical()
                    .x(d => holders[d.id].x)
                    .y(d => holders[d.id].y))
        }

        var i = 0;
        setInterval(() => {
            if (i > 1) {
                return
            }
            i++

            var host = addChild(treeRoot, "host-" + i, { name: "host " + i }, 1)
            addChild(host, "host-lo-" + i, { name: "lo" }, 1)
            addChild(host, "host-ethO-" + i, { name: "eth0" }, 1)
            var hbr = addChild(host, "host-br-int-" + i, { name: "br-int" }, 1)

            var br = addChild(host, "br-int-" + i, { name: "br-int" }, 2)

            addLayerLink(hbr, br, { RelationType: "layer2" })

            addChild(br, "port1-" + i, { name: "port1" }, 2)
            addChild(br, "port2-" + i, { name: "port2" }, 2)
            addChild(br, "port3-" + i, { name: "port3" }, 2)

            var ns1 = addChild(host, "ns1-" + i, { name: "ns1" }, 3)
            addChild(ns1, "ns1-lo-" + i, { name: "lo" }, 3)
            addChild(ns1, "ns1-eth0-" + i, { name: "eth0" }, 3)

            var ns2 = addChild(host, "ns2-" + i, { name: "ns2" }, 3)
            addChild(ns2, "ns2-lo-" + i, { name: "lo" }, 3)
            addChild(ns2, "ns2-eth0-0" + i, { name: "eth0" }, 3)

            update(null, true)
        }, 200)
    }

    render() {
        return (
            <svg ref={node => this.node = node} width={1200} height={1200}></svg>
        )
    }
}