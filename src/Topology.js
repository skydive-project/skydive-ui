/*
 * Copyright (C) 2019 Sylvain Afchain
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

import React, { Component } from 'react'
import { hierarchy, tree } from 'd3-hierarchy'
import { select, selectAll, event } from 'd3-selection'
import { line, linkVertical, curveCardinalClosed } from 'd3-shape'
import { } from 'd3-transition'
import { zoom, zoomIdentity } from 'd3-zoom'
import { } from 'd3-selection-multi'
import ResizeObserver from 'react-resize-observer'

import './Topology.css'

/**
 * Topology component. Based on a tree enhanced by multiple levels supports.
 */
export class Topology extends Component {

    constructor(props) {
        super(props)

        this.nodeWidth = 110
        this.nodeHeight = 260

        this.tree = tree().nodeSize([this.nodeWidth, this.nodeHeight])

        this.initTree()

        this.ctrlPressed = false
    }

    componentDidMount() {
        select("body")
            .on("keydown", () => {
                if (event.keyCode === 17) {
                    this.ctrlPressed = true
                }
            })
            .on("keyup", () => {
                if (event.keyCode === 17) {
                    this.ctrlPressed = false
                }
            })

        this.createSVG()
    }

    componentDidUpdate() {
    }

    onResize(rect) {
        if (!this.svg) {
            return
        }
        this.svg
            .attr("width", rect.width)
            .attr("height", rect.height)
    }

    createSVG() {
        var width = this.svgDiv.clientWidth
        var height = this.svgDiv.clientHeight

        this.svg = select(this.svgDiv).append("svg")
            .attr("width", width)
            .attr("height", height)
            .on("click", () => {
                this.hideNodeContextMenu()
                this.unselectAllNodes()
            })

        var defs = this.svg.append("defs")

        defs
            .append("marker")
            .attr("id", "link-marker")
            .attr("viewBox", "-5 -5 10 10")
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("class", "link-marker")
            .attr("d", "M 0,0 m -5,-5 L 5,-5 L 5,5 L -5,5 Z")

        defs
            .append("marker")
            .attr("id", "link-overlay-marker")
            .attr("viewBox", "-5 -5 10 10")
            .attr("markerWidth", 1)
            .attr("markerHeight", 1)
            .attr("orient", "auto")
            .append("path")
            .attr("class", "link-overlay-marker")
            .attr("d", "M 0,0 m -5,-5 L 5,-5 L 5,5 L -5,5 Z")

        var filter = defs.append("filter")
            .attr("id", "drop-shadow")
            .attr("height", "150%")

        filter.append("feGaussianBlur")
            .attr("in", "SourceGraphic")
            .attr("stdDeviation", 5)
            .attr("result", "blur")

        filter.append("feOffset")
            .attr("in", "blur")
            .attr("dx", 0)
            .attr("dy", 0)
            .attr("result", "offsetBlur")

        var feMerge = filter.append("feMerge")

        feMerge.append("feMergeNode")
            .attr("in", "offsetBlur")
        feMerge.append("feMergeNode")
            .attr("in", "SourceGraphic")

        this.zoom = zoom()
            .scaleExtent([0.3, 1.5])
            .on("zoom", () => {
                this.hideNodeContextMenu()
                this.g.attr("transform", event.transform.toString())
            })

        this.svg.call(this.zoom)
            .on("dblclick.zoom", null)

        this.g = this.svg
            .append("g")

        // levels group
        this.gLevels = this.g.append("g")
            .attr("class", "levels")

        // hiera links group 
        this.gHieraLinks = this.g.append("g")
            .attr("class", "hiera-links")

        // link overlay group, like highlight
        this.gLinkOverlays = this.g.append("g")
            .attr("class", "link-overlays")

        // non-hiera links group
        this.gLinks = this.g.append("g")
            .attr("class", "links")

        // link wrapper group, used to catch mouse event
        this.gLinkWraps = this.g.append("g")
            .attr("class", "link-wraps")

        // nodes group
        this.gNodes = this.g.append("g")
            .attr("class", "nodes")

        // context menu group
        this.gContextMenu = this.svg.append("g")
            .attr("class", "context-menu")

        this.liner = line()
            .x(d => d.x)
            .y(d => d.y)
            .curve(curveCardinalClosed.tension(0.7))
    }

    defaultState() {
        return { expanded: false }
    }

    resetTree() {
        this.initTree()
    }

    initTree() {
        this.root = {
            id: "root",
            layer: "root",
            data: {
                name: "root"
            },
            weight: 0,
            children: [],
            state: { expanded: true }
        }
        this.maxWeight = 0

        this.nodes = {}
        this.layerNodeStates = {}

        this.links = []
        this.layerLinkStates = {}
    }

    /**
     * Active or disable links of given layer
     * @param {*} layer
     * @param {*} active
     */
    showLinkLayer(layer, active) {
        this.layerLinkStates[layer] = active
        this.renderTree()
    }

    /**
     * Active or disable nodes of given layer
     * @param {*} layer
     * @param {*} active
     */
    showNodeLayer(layer, active) {
        this.layerNodeStates[layer] = active
        this.renderTree()
    }

    /**
     * Add a new node to the tree root
     * @param {string} id
     * @param {object} data
     */
    addNode(id, layer, data) {
        var node = {
            id: id,
            layer: layer,
            data: data,
            children: [],
            state: this.defaultState()
        }
        this.nodes[id] = node

        if (layer && !(layer in this.layerNodeStates)) {
            this.layerNodeStates[layer] = false
        }

        return node
    }

    /**
     * Remove a node from the tree
     * @param {node} node
     */
    delNode(node) {
        node.parent.children = node.parent.children.filter(c => c.id !== node.id)

        for (let link of this.links) {
            if (link.source === node || link.target === node) {
                this.links = this.links.filter(c => c === link)
            }
        }
    }

    /**
     * Set a node as a child of the given parent with the given weight
     * @param {noe} child
     * @param {node} parent
     * @param {number} weight
     */
    setParent(child, parent, weight) {
        // remove from previous parent if needed
        if (child.parent) {
            child.parent.children = child.parent.children.filter(c => c.id !== child.id)
        }

        parent.children.push(child)
        child.parent = parent

        weight = typeof weight === "function" ? weight(child) : weight
        if (weight > this.maxWeight) {
            this.maxWeight = weight
        }

        child.weight = weight
    }

    /**
     * Add a extra link between two node with the given metadata
     * @param {node} node1
     * @param {node} node2
     * @param {string} layer
     * @param {object} data
     */
    addLink(node1, node2, layer, data) {
        this.links.push({
            id: node1.id + "-" + node2.id,
            layer: layer,
            data: data,
            source: node1,
            target: node2
        })

        if (layer && !(layer in this.layerLinkStates)) {
            this.layerLinkStates[layer] = false
        }
    }

    cloneTree(node, parent) {
        // always return root node as it is the base of the tree and thus all the
        // layers
        if (node.layer !== "root" && !this.layerNodeStates[node.layer]) {
            return
        }

        let cloned = { id: node.id, _node: node, weight: node.weight, children: [], parent: parent }

        if (node.state.expanded) {
            node.children.forEach(child => {
                let subCloned = this.cloneTree(child, cloned)
                if (subCloned) {
                    cloned.children.push(subCloned)
                }
            })
            if (this.props.sortNodesFnc) {
                cloned.children.sort((a, b) => this.props.sortNodesFnc(a._node, b._node))
            }
        }

        return cloned
    }

    normalizeTree(node) {
        // return depth of the given layer
        let layerHeight = (node, weight, currDepth) => {
            if (node.weight > weight) {
                return 0
            }

            var maxDepth = currDepth
            node.children.forEach(child => {
                let depth = layerHeight(child, weight, currDepth + 1)
                if (depth > maxDepth) {
                    maxDepth = depth
                }
            })

            return maxDepth
        }

        // re-order tree to add placeholder node in order to separate levels
        let normalizeTreeHeight = (root, node, weight, currDepth, cache) => {
            if (node.weight > weight) {
                return
            }

            if (node.weight === weight && node.parent && node.parent.weight !== weight) {
                let parentDepth = layerHeight(root, node.weight - 1, 0)
                if (currDepth > parentDepth) {
                    return
                }

                let _parent = node._node.parent

                let pass = node.parent.id + "/" + node.weight

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
                normalizeTreeHeight(root, child, weight, currDepth + 1, cache)
            })
        }

        var tree = this.cloneTree(node)
        for (let i = 0; i <= this.maxWeight; i++) {
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
        if (d.data._node.state.expanded) {
            this.collapse(d.data._node)
        } else {
            d.data._node.state.expanded = true
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



    visibleLinks(holders) {
        let links = []

        let findVisible = (node) => {
            while (node) {
                if (holders[node.id]) {
                    return node
                }
                node = node.parent
            }
        }

        this.links.forEach(link => {
            if (!this.layerLinkStates[link.layer]) {
                return
            }

            let source = findVisible(link.source)
            let target = findVisible(link.target)

            if (source && target && source !== target) {
                links.push({
                    id: link.id,
                    layer: link.layer,
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
            x: gBB[0] - this.svgDiv.clientWidth * 5,
            y: nBB[0] - margin,
            width: (gBB[1] - gBB[0]) + this.svgDiv.clientWidth * 10,
            height: nBB[1] - nBB[0] + margin * 2
        }
    }

    _levelNodes(node, nodes) {
        if (!nodes) {
            nodes = {}
        }

        if (node.data.weight) {
            let arr = nodes[node.data.weight]
            if (!arr) {
                nodes[node.data.weight] = arr = { id: node.data.weight, nodes: [node] }
            } else {
                arr.nodes.push(node)
            }
        }

        if (node.children) {
            node.children.forEach(child => {
                this._levelNodes(child, nodes)
            })
        }

        return nodes
    }

    levelNodes(node) {
        return Object.values(this._levelNodes(node, {}))
    }

    /**
     * Unselect all the nodes
     */
    unselectAllNodes() {
        var self = this

        this.gNodes.selectAll(".node-selected").each(function () {
            select(this).classed("node-selected", false)

            if (self.props.onNodeSelected) {
                var id = this.id.replace(/^node-/, '')

                self.props.onNodeSelected(self.nodes[id], false)
            }
        })
    }

    /**
     * Select or Unselect the node of the given id according to active boolean
     * @param {string} id
     * @param {boolean} active
     */
    selectNode(id, active) {
        if (!this.ctrlPressed) {
            this.unselectAllNodes()
        }
        select("#node-" + id).classed("node-selected", active)

        if (this.props.onNodeSelected) {
            this.props.onNodeSelected(this.nodes[id], active)
        }
    }

    /**
     * Select or unSelect node depending of its state
     * @param {string} id
     */
    toggleNode(id) {
        if (select("#node-" + id).classed("node-selected")) {
            this.selectNode(id, false)
        } else {
            this.selectNode(id, true)
        }
    }

    /**
     * Zoom until all the nodes are displayed
     */
    zoomFit() {
        var bounds = this.gNodes.node().getBBox()
        var parent = this.g.node().parentElement
        var fullWidth = parent.clientWidth, fullHeight = parent.clientHeight
        var width = bounds.width, height = bounds.height
        if (width === 0 || height === 0) {
            return
        }
        var midX = bounds.x + width / 2, midY = bounds.y + height / 2

        var scale = 0.65 / Math.max(width / fullWidth, height / fullHeight)
        if (scale > 1) {
            scale = 1
        }
        var translate = [fullWidth / 2 - midX * scale, fullHeight / 2 - midY * scale]

        var t = zoomIdentity
            .translate(translate[0] + 30, translate[1])
            .scale(scale)
        this.svg
            .transition()
            .duration(500)
            .call(this.zoom.transform, t)
    }

    showNodeContextMenu(d) {
        // hide previous
        this.hideNodeContextMenu()

        if (this.props.onShowNodeContextMenu) {
            var data = this.props.onShowNodeContextMenu(d)

            var bb = this.svgDiv.getBoundingClientRect()

            var x = event.x - bb.left, y = event.y - bb.top

            var g = this.gContextMenu.append("g")
                .style("opacity", 0)
            g.transition()
                .duration(300)
                .style("opacity", 1)
            var rect = g.append("rect")
                .attr("filter", "url(#drop-shadow)")

            var marginX = 20, marginY = 10, paddingY = 30

            var dy = 0, rects = []
            for (let item of data) {
                let gItem = g.append("g")
                    .attr("class", "context-menu-item " + item.class)
                let rect = gItem.append("rect")

                let text = gItem.append("text")
                    .classed("disabled", item.disabled)
                    .attr("x", x)
                    .attr("y", y + paddingY)
                    .attr("dy", dy)
                    .text(d => item.text)

                let bb = text.node().getBBox()
                rect
                    .attr("x", bb.x - marginX + 1)
                    .attr("y", bb.y - paddingY / 4)
                    .attr("height", bb.height + paddingY / 2)
                    .style("opacity", 0)
                rects.push(rect)

                if (!item.disabled) {
                    gItem.on("click", () => { item.callback(d) })
                    gItem.on("mouseover", () => { rect.style("opacity", 1) })
                    gItem.on("mouseout", () => rect.style("opacity", 0))
                }

                dy += paddingY
            }

            bb = g.node().getBBox()
            rect
                .attr("x", bb.x - marginX)
                .attr("y", bb.y - marginY)
                .attr("width", bb.width + marginX * 2)
                .attr("height", bb.height + marginY * 2)

            for (let rect of rects) {
                rect.attr("width", bb.width + marginX * 2 - 2)
            }
        }
    }

    hideNodeContextMenu() {
        this.gContextMenu.select("g").remove()
    }

    nodeClick(d) {
        event.stopPropagation()

        if (this._nodeClickID) {
            return
        }

        this._nodeClickID = setTimeout(() => {
            this._nodeClickID = null

            this.hideNodeContextMenu(d)
            this.toggleNode(d.data.id, true)
        }, 200)
    }

    nodeDoubleClick(d) {
        // it's a dbl click then stop click handler
        if (this._nodeClickID) {
            clearTimeout(this._nodeClickID)
            this._nodeClickID = null
        }

        this.expand(d)
    }

    neighborLinks(d, links) {
        var ids = []

        for (let link of links) {
            if (link.source.id === d.data.id || link.target.id === d.data.id) {
                ids.push(link.id)
            }
        }

        return ids
    }

    /**
     * Invalidate the view and render the tree
     */
    renderTree() {
        var normRoot = this.normalizeTree(this.root)

        var root = hierarchy(normRoot)
        this.tree(root)

        var holders = {}
        root.each(node => {
            holders[node.data.id] = node
        })

        var linker = linkVertical()
            .x(d => d.x)
            .y(d => d.y)

        var level = this.gLevels.selectAll('rect.level')
            .data(this.levelNodes(root))
        var levelEnter = level.enter()
            .append('rect')
            .attr("id", d => d.id)
            .attr("class", "level")
            .style("opacity", 0)
            .attrs(d => this.nodesRect(root, d.nodes))
        level.exit().remove()

        levelEnter.transition()
            .duration(500)
            .style("opacity", 1)

        level.transition()
            .duration(500)
            .attrs(d => this.nodesRect(root, d.nodes))

        var hieraLink = this.gHieraLinks.selectAll('path.hiera-link')
            .data(root.links(), d => d.source.data.id + d.target.data.id)
        var hieraLinkEnter = hieraLink.enter()
            .filter(d => d.source.data._node !== this.root && d.source.data._parent !== this.root)
            .append('path')
            .attr("class", "hiera-link")
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
            .on("dblclick", d => this.nodeDoubleClick(d))
            .on("click", d => this.nodeClick(d))
            .on("contextmenu", d => {
                event.preventDefault()
                this.showNodeContextMenu(d)
            })
            .on("mouseover", d => {
                select("#node-overlay-" + d.data.id)
                    .style("opacity", 1)

                var ids = this.neighborLinks(d, this.visibleLinks(holders))
                for (let id of ids) {
                    select("#link-overlay-" + id)
                        .style("opacity", 1)
                }
            })
            .on("mouseout", d => {
                selectAll("circle.node-overlay")
                    .style("opacity", 0)
                selectAll("path.link-overlay")
                    .style("opacity", 0)
            })

        nodeEnter.transition()
            .duration(500)
            .style("opacity", 1)

        const hexSize = 30

        nodeEnter.append("circle")
            .attr("id", d => "node-overlay-" + d.data.id)
            .attr("class", "node-overlay")
            .attr("r", hexSize + 24)
            .style("opacity", 0)

        nodeEnter.append("circle")
            .attr("class", "node-circle")
            .attr("r", hexSize + 16)

        nodeEnter.append("circle")
            .attr("class", "node-disc")
            .attr("r", hexSize + 8)
            .attr("fill", this.groupColors)

        nodeEnter.append("path")
            .attr("class", "node-hexagon")
            .attr("d", d => this.liner(this.hexagon(d, hexSize)))

        nodeEnter.append("text")
            .attr("class", "node-icon")
            .text(d => this.props.nodeAttrs(d.data._node).icon)

        let wrapText = (text, lineHeight, width) => {
            text.each(function (d) {
                var text = select(this)
                var y = text.attr("y")
                var dy = parseFloat(text.attr("dy"))
                var words = text.text().split(/(?=[\s\-._])/).reverse()
                var line = []

                var tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em")

                var lineNumber = 0
                var word = words.pop()
                while (word) {
                    line.push(word)
                    tspan.text(line.join(""))
                    if (tspan.node().getComputedTextLength() > width) {
                        line.pop()
                        tspan.text(line.join(""))
                        line = [word]
                        tspan = text.append("tspan")
                            .attr("x", 0)
                            .attr("y", y)
                            .attr("dy", ++lineNumber * lineHeight + dy + "em")
                            .text(word)
                    }
                    word = words.pop()
                }

                var bb = this.getBBox()

                select(this.parentNode).insert("rect", "text")
                    .attr("class", "node-name-wrap")
                    .attr("x", bb.x - 5)
                    .attr("y", bb.y - 5)
                    .attr("width", bb.width + 10)
                    .attr("height", bb.height + 10)
                    .attr("rx", 10)
                    .attr("ry", 10)
            })
        }

        nodeEnter.append("g")
            .append("text")
            .attr("class", "node-name")
            .attr("dy", ".35em")
            .attr("y", 85)
            .text(d => this.props.nodeAttrs(d.data._node).name)
            .call(wrapText, 1.1, this.nodeWidth - 10)

        var exco = nodeEnter
            .filter(d => d.data._node.children.length > 0)
            .append("g")

        exco.append("circle")
            .attr("class", "node-exco-circle")
            .attr("cx", hexSize + 10)
            .attr("cy", hexSize)
            .attr("r", d => d.data._node.children.length ? 18 : 0)

        exco.append("text")
            .attr("id", d => "exco-" + d.data.id)
            .attr("class", "node-exco-children")
            .attr("x", hexSize + 10)
            .attr("y", hexSize + 6)
            .text(d => d.data._node.children.length > 99 ? "+99" : d.data._node.children.length)

        node.transition()
            .duration(500)
            .style("opacity", 1)
            .attr("transform", d => `translate(${d.x},${d.y})`)

        var linker = linkVertical()
            .x(d => holders[d.node.id].x + d.dx)
            .y(d => holders[d.node.id].y + d.dy)

        let holderLink = (d, margin) => {
            if (holders[d.source.id].y === holders[d.target.id].y) {
                if (holders[d.source.id].x < holders[d.target.id].x) {
                    return { source: { node: d.source, dx: margin, dy: 0 }, target: { node: d.target, dx: -margin, dy: 0 } }
                }
                return { source: { node: d.target, dx: margin, dy: 0 }, target: { node: d.source, dx: -margin, dy: 0 } }
            }

            if (holders[d.source.id].y < holders[d.target.id].y) {
                return { source: { node: d.source, dx: 0, dy: margin }, target: { node: d.target, dx: 0, dy: -margin } }
            }

            return { source: { node: d.target, dx: 0, dy: margin }, target: { node: d.source, dx: 0, dy: -margin } }
        }

        var visibleLinks = this.visibleLinks(holders)

        var linkOverlay = this.gLinkOverlays.selectAll('path.link-overlay')
            .data(visibleLinks, d => d.id)
        linkOverlay.enter()
            .append('path')
            .attr("id", d => "link-overlay-" + d.id)
            .attr("class", "link-overlay")
            .style("opacity", 0)
            .attr("d", d => linker(holderLink(d, 55)))
            .on("mouseover", function (d, i) {
                select(this).transition()
                    .duration(300)
                    .style("opacity", 1)
            })
        linkOverlay.exit().remove()

        linkOverlay.transition()
            .duration(500)
            .attr("d", d => linker(holderLink(d, 55)))

        var link = this.gLinks.selectAll('path.link')
            .data(visibleLinks, d => d.id)
        var linkEnter = link.enter()
            .append('path')
            .attr("class", d => "link " + this.props.linkAttrs(d).class)
            .style("opacity", 0)
            .attr("d", d => linker(holderLink(d, 55)))
        link.exit().remove()

        linkEnter.transition()
            .duration(500)
            .style("opacity", 1)

        link.transition()
            .duration(500)
            .attr("d", d => linker(holderLink(d, 55)))

        var linkWrap = this.gLinkWraps.selectAll('path.link-wrap')
            .data(visibleLinks, d => d.id)
        linkWrap.enter()
            .append('path')
            .attr("class", "link-wrap")
            .attr("d", d => linker(holderLink(d, 55)))
            .on("mouseover", d => {
                select("#link-overlay-" + d.id)
                    .style("opacity", 1)
            })
            .on("mouseout", d => {
                selectAll("path.link-overlay")
                    .style("opacity", 0)
            })
        linkWrap.exit().remove()

        linkWrap.transition()
            .duration(500)
            .attr("d", d => linker(holderLink(d, 55)))
    }

    render() {
        return (
            <div className={this.props.className} ref={node => this.svgDiv = node} style={{ position: 'relative' }}>
                <ResizeObserver
                    onResize={(rect) => { this.onResize(rect) }} />
            </div>
        )
    }
}