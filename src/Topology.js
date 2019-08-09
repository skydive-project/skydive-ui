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

const data = require('./dump.json');

export class TopologyComponent extends Component {
    // TEMP(safchain) icon and colors
    // this has to be moved to another external component
    types = {
        host: { color: "#114B5F", icon: "\uf109", text: "#eee" },
        bridge: { color: "#1A936F", icon: "\uf1e0", text: "#eee" },
        ovsbridge: { color: "#1A936F", icon: "\uf1e0", text: "#eee" },
        interface: { color: "#88D498", icon: "\uf120", text: "#444" },
        device: { color: "#88D498", icon: "\uf120", text: "#444" },
        veth: { color: "#88D498", icon: "\uf120", text: "#444" },
        tun: { color: "#88D498", icon: "\uf120", text: "#444" },
        tap: { color: "#88D498", icon: "\uf120", text: "#444" },
        netns: { color: "#C6DABF", icon: "\uf24d", text: "#444" },
        port: { color: "#1A936F", icon: "\uf0e8", text: "#eee" },
        ovsport: { color: "#1A936F", icon: "\uf0e8", text: "#eee" },
        unknown: { color: "#C9ADA7", icon: "\uf192", text: "#444" }
    }

    constructor(props) {
        super(props)

        this.width = 1200
        this.height = 1200

        this.nodeWidth = 100
        this.nodeHeight = 240

        this.tree = tree().nodeSize([this.nodeWidth, this.nodeHeight])

        this.root = {
            id: "root",
            data: {
                name: "root"
            },
            layer: 0,
            children: []
        }
        this.maxLayer = 0

        this.nodes = {}

        // node state
        this.nodeStates = {}
        this.nodeStates[this.root.id] = { expanded: true }

        this.layerLinks = []
    }

    componentDidMount() {
        this.createSVG()
        this.parseTopology(data)
    }

    componentDidUpdate() {
        this.createSVG()
    }

    createSVG() {
        var svg = select(this.node)

        var g = svg
            .call(zoom()
                .scaleExtent([0.05, 3])
                .on("zoom", () => g.attr("transform", event.transform.toString())))
            .append("g")

        this.gLayers = g.append("g")
            .attr("class", "layers")
            .attr("fill", "none")
            .attr("fill-opacity", 0.2)

        this.gHieraLinks = g.append("g")
            .attr("class", "links")
            .attr("fill", "none")
            .attr("stroke", "#555")
            .attr("stroke-opacity", 0.9)
            .attr("stroke-width", 1)

        this.gLayerLinks = g.append("g")
            .attr("class", "layer-links")
            .attr("fill", "none")
            .attr("stroke", "#c8293c")
            .attr("stroke-width", 3)

        this.gNodes = g.append("g")
            .attr("class", "nodes")
    }

    // TEMP(safchain) this has to be moved to another external component consuming a message bus
    parseTopology(data) {
        // first add all the nodes
        for (let node of data.Nodes) {
            let n = this.addNode(node.ID, node.Metadata)
            this.setParent(n, this.root, this.layerIndex)
        }

        // then add ownership links
        for (let edge of data.Edges) {
            if (edge.Metadata.RelationType === "ownership") {
                let parent = this.nodes[edge.Parent]
                let child = this.nodes[edge.Child]

                this.setParent(child, parent, this.layerIndex)
            }
        }

        // finally add remaining links
        // then add ownership links
        for (let edge of data.Edges) {
            if (edge.Metadata.RelationType !== "ownership") {
                let parent = this.nodes[edge.Parent]
                let child = this.nodes[edge.Child]

                this.addLayerLink(child, parent, this.layerIndex, edge.Metadata)
            }
        }

        this.renderTree()
    }

    // TEMP(safchain) this has to be moved to another external component dedicated to topology placement rules
    layerIndex(node) {
        switch (node.data.Type) {
            case "host":
                return 3
            case "bridge":
            case "ovsbridge":
                return 4
            case "netns":
                return 6
        }

        if (node.data.OfPort) {
            return 5
        }

        return node.parent ? node.parent.layer : 1
    }

    defaultState() {
        return { expanded: false }
    }

    addNode(id, data) {
        var node = {
            id: id,
            data: data,
            children: []
        }
        this.nodes[id] = node

        this.nodeStates[id] = this.defaultState()

        return node
    }

    delNode(child) {
        child.parent.children = child.parent.children.filter(c => c.id !== child.id)
    }

    setParent(child, parent, layer) {
        // remove from previous parent if needed
        if (child.parent) {
            child.parent.children = child.parent.children.filter(c => c.id !== child.id)
        }

        parent.children.push(child)
        child.parent = parent

        var index = typeof layer === "function" ? layer(child) : layer
        if (index > this.maxLayer) {
            this.maxLayer = index
        }

        child.layer = index
    }

    // add a extra link of top of the "classic" tree link
    addLayerLink(node1, node2, data) {
        this.layerLinks.push({
            id: node1.id + "-" + node2.id,
            data: data,
            source: node1,
            target: node2
        })
    }

    cloneTree(node, parent) {
        let state = this.nodeStates[node.id]
        let cloned = { id: node.id, _node: node, layer: node.layer, children: [], parent: parent, state: state }

        if (this.nodeStates[node.id].expanded) {
            node.children.forEach(child => {
                cloned.children.push(this.cloneTree(child, cloned))
            })
        }

        return cloned
    }

    normalizeTree(node) {
        // return depth of the given layer
        let layerHeight = (node, layer, currDepth) => {
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

        // re-order tree to add placeholder node in order to separate layers
        let normalizeTreeHeight = (root, node, layer, currDepth) => {
            if (node.layer > layer) {
                return
            }

            if (node.layer === layer && node.parent && node.parent.layer !== layer) {
                let parentDepth = layerHeight(root, node.layer - 1, 0)

                let _parent = node._node.parent
                let children = node.parent.children
                let index = children.indexOf(node)

                while (currDepth++ <= parentDepth) {
                    node = { id: node.id + "-" + currDepth, children: [node], _parent: _parent }
                }
                children[index] = node

                return
            }

            node.children.forEach(child => {
                normalizeTreeHeight(root, child, layer, currDepth + 1)
            })
        }

        var tree = this.cloneTree(node)
        for (let i = 0; i <= this.maxLayer; i++) {
            normalizeTreeHeight(tree, tree, i, 0)
        }
        return tree
    }

    collapse(node) {
        if (node.state) {
            node.state.expanded = false
        }
        node.children.forEach(child => this.collapse(child))
    }

    expand(d) {
        select("node-" + d.data.id).select("text").text(() => {
            if (d.data.state.expanded) {
                return "\uf067"
            }
            return "\uf068"
        })

        if (d.data.state.expanded) {
            this.collapse(d.data)
        } else {
            d.data.state.expanded = true
        }

        this.renderTree()
    }

    type(d) {
        return this.types[d.data._node.data.Type] ? this.types[d.data._node.data.Type] : this.types["unknown"]
    }

    hexagon(d, size) {
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

    liner = line()
        .x(d => d.x)
        .y(d => d.y)
        .curve(curveCardinalClosed.tension(0.7))

    groupColors(d) {
        return colorOranges(d.data._node.layer)
    }

    visibleLayerLinks(holders) {
        let links = []

        let findVisible = (node) => {
            while (node) {
                if (holders[node.id]) {
                    return node
                }
                node = node.parent
            }
        }

        this.layerLinks.forEach(link => {
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

    boundingBox(node, bb) {
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
                this.boundingBox(child, bb)
            })
        }

        return bb
    }

    nodesRect(root, nodes) {
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

        let gBB = this.boundingBox(root)
        const margin = this.nodeHeight / 2

        return {
            x: gBB[0] - margin,
            y: nBB[0] - margin,
            width: gBB[1] - gBB[0] + margin * 2,
            height: nBB[1] - nBB[0] + margin * 2
        }
    }

    _layerNodes(node, nodes) {
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
                this._layerNodes(child, nodes)
            })
        }

        return nodes
    }

    layerNodes(node) {
        return Object.values(this._layerNodes(node, {}))
    }

    renderTree() {
        let normRoot = this.normalizeTree(this.root)

        let root = hierarchy(normRoot)
        this.tree(root)

        let holders = {}
        root.each(node => {
            holders[node.data.id] = node
        })

        var linker = linkVertical()
            .x(d => d.x)
            .y(d => d.y)

        var layers = this.gLayers.selectAll('rect.layer')
            .data(this.layerNodes(root))
        var layersEnter = layers.enter()
            .append('rect')
            .attr("class", "layer")
            .attr("id", d => d.id)
            .style("opacity", 0)
            .attr("stroke", "#000")
            .attr("stroke-dasharray", "5,10")
            .attr("fill", d => colorBlues(d.id))
            .attrs(d => this.nodesRect(root, d.nodes))
        layers.exit().remove()

        layersEnter.transition()
            .duration(500)
            .style("opacity", 1)

        layers.transition()
            .duration(500)
            .attrs(d => this.nodesRect(root, d.nodes))

        var hieraLink = this.gHieraLinks.selectAll('path.link')
            .data(root.links(), d => d.source.data.id + d.target.data.id)
        var hieraLinkEnter = hieraLink.enter()
            .filter(d => d.source.data._node !== this.root && d.source.data._parent !== this.root)
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

        var node = this.gNodes.selectAll('g.node')
            .data(root.descendants(), d => d.data.id)

        node.exit()
            .transition()
            .duration(500).style("opacity", 0)
            .remove()

        var nodeEnter = node.enter()
            .filter(d => d.data._node && d.data._node !== this.root)
            .append("g")
            .attr("class", "node")
            .attr("id", d => "node-" + d.data.id)
            .style("opacity", 0)
            .attr("transform", d => `translate(${d.x},${d.y})`)

        nodeEnter.transition()
            .duration(500)
            .style("opacity", 1)

        const hexSize = 30

        nodeEnter.append("circle")
            .attr("r", hexSize + 14)
            .attr("fill", "#fff")
            .attr("stroke", this.groupColors)
            .attr("stroke-width", 3)

        nodeEnter.append("circle")
            .attr("r", hexSize + 8)
            .attr("fill", this.groupColors)

        nodeEnter.append("path")
            .attr("d", d => this.liner(this.hexagon(d, hexSize)))
            .attr("stroke", "#455f6b")
            .attr("fill", d => this.type(d).color)
            .attr("stroke-dasharray", "5,5")

        nodeEnter.append("text")
            .attr("class", "icon")
            .style("font-size", "24px")
            .attr("alignment-baseline", "middle")
            .attr("fill", d => this.type(d).text)
            .attr("text-anchor", "middle")
            .style("font-family", "FontAwesome")
            .text(d => this.type(d).icon)

        let wrapText = (text, lineHeight, width) => {
            text.each(function () {
                var text = select(this)
                var y = text.attr("y")
                var dy = parseFloat(text.attr("dy"))
                var words = text.text().split(/(?=[\s\-\.\_])/).reverse()
                var line = []
                var word

                var tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");

                var lineNumber = 0
                while (word = words.pop()) {
                    line.push(word);
                    tspan.text(line.join(""));
                    if (tspan.node().getComputedTextLength() > width) {
                        line.pop();
                        tspan.text(line.join(""));
                        line = [word];
                        tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
                    }
                }
            })
        }

        nodeEnter.append("text")
            .style("font-size", "24px")
            .attr("dy", ".35em")
            .attr("y", d => d.children ? -60 : 60)
            .style("text-anchor", "middle")
            .text(d => d.data._node.data ? d.data._node.data.Name : "")
            .call(wrapText, 1.1, this.nodeWidth - 10)

        var exco = nodeEnter
            .filter(d => d.data._node.children.length > 0)
            .append("g")
        exco.on("click", d => this.expand(d))

        exco.append("circle")
            .attr("class", "collapse")
            .attr("cx", hexSize)
            .attr("cy", hexSize)
            .attr("r", d => d.data._node.children.length ? 15 : 0)
            .attr("fill", "#48e448")
            .attr("stroke", "#666")

        exco.append("text")
            .attr("class", "text-collapse")
            .attr("x", hexSize)
            .attr("y", hexSize + 6)
            .style("font-size", "14px")
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

        var layerLink = this.gLayerLinks.selectAll('path.layer-link')
            .data(this.visibleLayerLinks(holders), d => d.id)
        var layerLinkEnter = layerLink.enter()
            .append('path')
            .attr("class", "layer-link")
            .style("opacity", 0)
            .attr('marker-start', "url(#square)")
            .attr('marker-end', "url(#square)")
            .attr("d", d => layerLinker(
                holders[d.source.id].y < holders[d.target.id].y ? { source: { node: d.source, dy: 55 }, target: { node: d.target, dy: -55 } } : {
                    source: { node: d.target, dy: 55 }, target: { node: d.source, dy: -55 }
                }))
        layerLink.exit().remove()

        layerLinkEnter.transition()
            .duration(500)
            .style("opacity", 1)

        layerLink.transition()
            .duration(500)
            .style("opacity", 1)
            .attr("d", d => layerLinker(
                holders[d.source.id].y < holders[d.target.id].y ? { source: { node: d.source, dy: 55 }, target: { node: d.target, dy: -55 } } : {
                    source: { node: d.target, dy: 55 }, target: { node: d.source, dy: -55 }
                }))
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