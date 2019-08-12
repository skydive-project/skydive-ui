import React, { Component } from 'react'
import { hierarchy, tree } from 'd3-hierarchy'
import { select, event } from 'd3-selection'
import { line, linkVertical, curveCardinalClosed } from 'd3-shape'
import { } from 'd3-transition'
import { zoom, zoomIdentity } from 'd3-zoom'
import { schemeOranges, schemeBlues } from 'd3-scale-chromatic'
import { scaleOrdinal } from 'd3-scale'
import { } from 'd3-selection-multi'

import './Topology.css';

var colorOranges = scaleOrdinal(schemeOranges[9])
var colorBlues = scaleOrdinal(schemeBlues[9])

const data = require('./dump.json');

export class TopologyComponent extends Component {

    constructor(props) {
        super(props)

        this.nodeWidth = 110
        this.nodeHeight = 240

        this.tree = tree().nodeSize([this.nodeWidth, this.nodeHeight])

        this.root = {
            id: "root",
            data: {
                name: "root"
            },
            layerWeight: 0,
            children: []
        }
        this.maxLayerWeight = 0

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
        var width = this.node.clientWidth;
        var height = this.node.clientHeight;

        this.svg = select(this.node).append("svg")
            .attr("width", width)
            .attr("height", height)

        this.svg.append("defs")
            .append("marker")
            .attr("id", "square")
            .attr("viewBox", "-5 -5 10 10")
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M 0,0 m -5,-5 L 5,-5 L 5,5 L -5,5 Z")
            .attr("fill", "#c8293c")

        this.zoom = zoom()
            .scaleExtent([0.3, 3])
            .on("zoom", () => this.g.attr("transform", event.transform.toString()))

        this.svg.call(this.zoom)
            .on("dblclick.zoom", null)

        this.g = this.svg
            .append("g")

        // layers group
        this.gLayers = this.g.append("g")
            .attr("class", "layers")

        // hiera links group 
        this.gHieraLinks = this.g.append("g")
            .attr("class", "links")

        // link overlay group, like highlight
        this.gLayerLinkOverlayLs = this.g.append("g")
            .attr("class", "layer-link-overlays")

        // non-hiera links group
        this.gLayerLinks = this.g.append("g")
            .attr("class", "layer-links")

        // link wrapper group, used to catch mouse event
        this.gLayerLinkWraps = this.g.append("g")
            .attr("class", "layer-link-wraps")

        // nodes group
        this.gNodes = this.g.append("g")
            .attr("class", "nodes")
    }

    // TEMP(safchain) this has to be moved to another external component consuming a message bus
    parseTopology(data) {
        // first add all the nodes
        for (let node of data.Nodes) {
            let n = this.addNode(node.ID, node.Metadata)
            this.setParent(n, this.root, this.props.nodeLayerWeight)
        }

        // then add ownership links
        for (let edge of data.Edges) {
            if (edge.Metadata.RelationType === "ownership") {
                let parent = this.nodes[edge.Parent]
                let child = this.nodes[edge.Child]

                this.setParent(child, parent, this.props.nodeLayerWeight)
            }
        }

        // finally add remaining links
        // then add ownership links
        for (let edge of data.Edges) {
            if (edge.Metadata.RelationType !== "ownership") {
                let parent = this.nodes[edge.Parent]
                let child = this.nodes[edge.Child]

                this.addLayerLink(child, parent, edge.Metadata)
            }
        }

        this.renderTree()

        //this.zoomFit()

        /*for (let node of data.Nodes) {
            this.highlightNode(node.ID, true)
        }*/
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

    setParent(child, parent, layerWeight) {
        // remove from previous parent if needed
        if (child.parent) {
            child.parent.children = child.parent.children.filter(c => c.id !== child.id)
        }

        parent.children.push(child)
        child.parent = parent

        var weight = typeof layerWeight === "function" ? layerWeight(child) : layerWeight
        if (weight > this.maxLayerWeight) {
            this.maxLayerWeight = weight
        }

        child.layerWeight = weight
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
        let cloned = { id: node.id, _node: node, layerWeight: node.layerWeight, children: [], parent: parent, state: state }

        if (this.nodeStates[node.id].expanded) {
            node.children.forEach(child => {
                cloned.children.push(this.cloneTree(child, cloned))
            })
        }

        return cloned
    }

    normalizeTree(node) {
        // return depth of the given layer
        let layerHeight = (node, layerWeight, currDepth) => {
            if (node.layerWeight > layerWeight) {
                return 0
            }

            var maxDepth = currDepth
            node.children.forEach(child => {
                let depth = layerHeight(child, layerWeight, currDepth + 1)
                if (depth > maxDepth) {
                    maxDepth = depth
                }
            })

            return maxDepth
        }

        // re-order tree to add placeholder node in order to separate layers
        let normalizeTreeHeight = (root, node, layerWeight, currDepth, cache) => {
            if (node.layerWeight > layerWeight) {
                return
            }

            if (node.layerWeight === layerWeight && node.parent && node.parent.layerWeight !== layerWeight) {
                let parentDepth = layerHeight(root, node.layerWeight - 1, 0)
                if (currDepth > parentDepth) {
                    return
                }

                let _parent = node._node.parent

                let pass = node.parent.id + "/" + node.layerWeight

                let first, last
                if (cache.chains[pass]) {
                    let chain = cache.chains[pass]
                    first = chain.first

                    node.parent.children = node.parent.children.filter(d => d !== node)

                    last = chain.last
                } else {
                    first = { id: node.id + "-" + currDepth, children: [], _parent: _parent }

                    let children = node.parent.children
                    let index = children.indexOf(node)
                    children[index] = first

                    last = first

                    while (currDepth++ < parentDepth) {
                        let next = { id: node.id + "-" + currDepth, children: [], _parent: _parent }
                        last.children = [next]
                        last = next
                    }

                    cache.chains[pass] = { first: first, last: last }
                }
                last.children.push(node)

                return
            }

            node.children.forEach(child => {
                normalizeTreeHeight(root, child, layerWeight, currDepth + 1, cache)
            })
        }

        var tree = this.cloneTree(node)
        for (let i = 0; i <= this.maxLayerWeight; i++) {
            normalizeTreeHeight(tree, tree, i, 0, { chains: {} })
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
        select("#exco-" + d.data.id).text(() => {
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
        return colorOranges(d.data._node.layerWeight)
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
                    data: link.data
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
            x: gBB[0] - this.node.clientWidth * 5,
            y: nBB[0] - margin,
            width: (gBB[1] - gBB[0]) + this.node.clientWidth * 10,
            height: nBB[1] - nBB[0] + margin * 2
        }
    }

    _layerNodes(node, nodes) {
        if (!nodes) {
            nodes = {}
        }

        if (node.data.layerWeight) {
            let arr = nodes[node.data.layerWeight]
            if (!arr) {
                nodes[node.data.layerWeight] = arr = { id: node.data.layerWeight, nodes: [node] }
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

    highlightNode(id, active) {
        select("#node-" + id).classed("node-highlighted", active)
    }

    zoomFit() {
        var bounds = this.g.node().getBBox();
        var parent = this.g.node().parentElement;
        var fullWidth = parent.clientWidth, fullHeight = parent.clientHeight;
        var width = bounds.width, height = bounds.height;
        var midX = bounds.x + width / 2, midY = bounds.y + height / 2;
        if (width === 0 || height === 0) return;
        var scale = 0.65 / Math.max(width / fullWidth, height / fullHeight);
        var translate = [fullWidth / 2 - midX * scale, fullHeight / 2 - midY * scale];

        var t = zoomIdentity
            .translate(translate[0] + 30, translate[1])
            .scale(scale);
        this.svg.transition().duration(500).call(this.zoom.transform, t);
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
            .attr("id", d => d.id)
            .attr("class", "layer")
            .style("opacity", 0)
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
            .attr("id", d => "node-" + d.data.id)
            .attr("class", d => "node " + this.props.nodeAttrs(d.data._node).class)
            .style("opacity", 0)
            .attr("transform", d => `translate(${d.x},${d.y})`)
            .on("dblclick", d => this.expand(d))

        nodeEnter.transition()
            .duration(500)
            .style("opacity", 1)

        const hexSize = 30

        nodeEnter.append("circle")
            .attr("class", "node-circle")
            .attr("r", hexSize + 16)
            .attr("stroke", this.groupColors)

        nodeEnter.append("circle")
            .attr("r", hexSize + 8)
            .attr("fill", this.groupColors)

        nodeEnter.append("path")
            .attr("class", "node-hexagon")
            .attr("d", d => this.liner(this.hexagon(d, hexSize)))

        nodeEnter.append("text")
            .attr("class", "node-icon")
            .text(d => this.props.nodeAttrs(d.data._node).icon)

        let wrapText = (text, lineHeight, width) => {
            text.each(function () {
                var text = select(this)
                var y = text.attr("y")
                var dy = parseFloat(text.attr("dy"))
                var words = text.text().split(/(?=[\s\-._])/).reverse()
                var line = []

                var tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");

                var lineNumber = 0
                var word = words.pop()
                while (word) {
                    line.push(word);
                    tspan.text(line.join(""));
                    if (tspan.node().getComputedTextLength() > width) {
                        line.pop();
                        tspan.text(line.join(""));
                        line = [word];
                        tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
                    }
                    word = words.pop()
                }
            })
        }

        nodeEnter.append("text")
            .attr("class", "node-name")
            .attr("dy", ".35em")
            .attr("y", d => d.children ? -60 : 60)
            .text(d => this.props.nodeAttrs(d.data._node).name)
            .call(wrapText, 1.1, this.nodeWidth - 10)

        var exco = nodeEnter
            .filter(d => d.data._node.children.length > 0)
            .append("g")

        exco.append("circle")
            .attr("class", "node-exco-circle")
            .attr("cx", hexSize)
            .attr("cy", hexSize)
            .attr("r", d => d.data._node.children.length ? 15 : 0)

        exco.append("text")
            .attr("id", d => "exco-" + d.data.id)
            .attr("class", "node-exco-icon")
            .attr("x", hexSize)
            .attr("y", hexSize + 6)
            .text(d => d.data.state.expanded ? "\uf068" : "\uf067")

        node.transition()
            .duration(500)
            .style("opacity", 1)
            .attr("transform", d => `translate(${d.x},${d.y})`)

        var layerLinker = linkVertical()
            .x(d => holders[d.node.id].x)
            .y(d => holders[d.node.id].y + d.dy)

        let holderLink = (d, margin) => holders[d.source.id].y < holders[d.target.id].y ?
            { source: { node: d.source, dy: margin }, target: { node: d.target, dy: -margin } } : {
                source: { node: d.target, dy: margin }, target: { node: d.source, dy: -margin }
            }

        var layerLinkOverlayL = this.gLayerLinkOverlayLs.selectAll('path.layer-link-overlay')
            .data(this.visibleLayerLinks(holders), d => d.id)
        layerLinkOverlayL.enter()
            .append('path')
            .attr("id", d => "layer-link-overlay-" + d.id)
            .attr("class", "layer-link-overlay")
            .style("opacity", 0)
            .attr("d", d => layerLinker(holderLink(d, 55)))
            .on("mouseover", function (d, i) {
                select(this).transition()
                    .duration(300)
                    .style("opacity", 1)
            })
            .on("mouseout", function (d, i) {
                select(this).transition()
                    .duration(300)
                    .style("opacity", 0)
            });
        layerLinkOverlayL.exit().remove()

        layerLinkOverlayL.transition()
            .duration(500)
            .attr("d", d => layerLinker(holderLink(d, 55)))

        var layerLink = this.gLayerLinks.selectAll('path.layer-link')
            .data(this.visibleLayerLinks(holders), d => d.id)
        var layerLinkEnter = layerLink.enter()
            .append('path')
            .attr("class", d => "layer-link " + this.props.linkAttrs(d).class)
            .style("opacity", 0)
            .attr("d", d => layerLinker(holderLink(d, 55)))
        layerLink.exit().remove()

        layerLinkEnter.transition()
            .duration(500)
            .style("opacity", 1)

        layerLink.transition()
            .duration(500)
            .attr("d", d => layerLinker(holderLink(d, 55)))

        var layerLinkWrap = this.gLayerLinkWraps.selectAll('path.layer-link-wrap')
            .data(this.visibleLayerLinks(holders), d => d.id)
        layerLinkWrap.enter()
            .append('path')
            .attr("class", "layer-link-wrap")
            .attr("d", d => layerLinker(holderLink(d, 55)))
            .on("mouseover", d => {
                select("#layer-link-overlay-" + d.id).transition()
                    .duration(300)
                    .style("opacity", 1)
            })
            .on("mouseout", d => {
                select("#layer-link-overlay-" + d.id).transition()
                    .duration(300)
                    .style("opacity", 0)
            });
        layerLinkWrap.exit().remove()
    }

    render() {
        return (
            <div ref={node => this.node = node} style={{ height: "100%" }} />
        )
    }
}