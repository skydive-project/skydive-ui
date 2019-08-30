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

import * as React from "react";
import { hierarchy, tree } from 'd3-hierarchy'
import { Selection, select, selectAll, event } from 'd3-selection'
import { line, linkVertical, curveCardinalClosed } from 'd3-shape'
import { } from 'd3-transition'
import { zoom, zoomIdentity } from 'd3-zoom'
import ResizeObserver from 'react-resize-observer'

import './Topology.css'

class State {
    expanded: boolean
}

class Node {
    id: string
    layer: string
    data: any
    weight: number
    children: Array<Node>
    state: State
    parent: Node | null

    constructor(id: string, layer: string, data: any, state: State) {
        this.id = id
        this.layer = layer
        this.data = data
        this.weight = 0
        this.children = new Array<Node>()
        this.state = state
    }
}

class Link {
    id: string
    layer: string
    source: Node
    target: Node
    data: any

    constructor(id: string, layer: string, source: Node, target: Node, data: any) {
        this.id = id
        this.layer = layer
        this.source = source
        this.target = target
    }
}

class NodeWrapper {
    id: string
    wrapped: Node
    children: Array<NodeWrapper>
    parent: NodeWrapper | null
    isPlaceholder: boolean

    constructor(id: string, node: Node, parent: NodeWrapper | null) {
        this.id = id
        this.wrapped = node
        this.parent = parent
        this.children = new Array<NodeWrapper>()
        this.isPlaceholder = false
    }
}

class D3Node {
    data: NodeWrapper
    x: number
    y: number
    children: Array<D3Node>
}

type Props = {
    sortNodesFnc: (node1: Node, node2: Node) => number
    onShowNodeContextMenu: (node: Node) => any
    onNodeSelected: (node: Node, isSelected: boolean) => any
    className: string
    nodeAttrs: (node: Node) => any
    linkAttrs: (link: Link) => any
}

/**
 * Topology component. Based on a tree enhanced by multiple levels supports.
 */
export class Topology extends React.Component<Props, {}> {

    nodeWidth: number
    nodeHeight: number
    tree: tree
    isCtrlPressed: boolean
    svgDiv: HTMLElement | null
    svg: Selection<SVGSVGElement, any, null, undefined>
    g: Selection<SVGGraphicsElement, {}, null, undefined>
    gLevels: Selection<SVGGraphicsElement, {}, null, undefined>
    gHieraLinks: Selection<SVGGraphicsElement, {}, null, undefined>
    gLinkOverlays: Selection<SVGGraphicsElement, {}, null, undefined>
    gLinks: Selection<SVGGraphicsElement, {}, null, undefined>
    gLinkWraps: Selection<SVGGraphicsElement, {}, null, undefined>
    gNodes: Selection<SVGGraphicsElement, {}, null, undefined>
    gContextMenu: Selection<SVGGraphicsElement, {}, null, undefined>
    zoom: zoom
    liner: line
    root: Node
    maxWeight: number
    nodes: Map<string, Node>
    layerNodeStates: Map<string, boolean>
    links: Array<any>
    layerLinkStates: Map<string, boolean>
    nodeClickID: number
    wrappers: Map<string, NodeWrapper>

    constructor(props) {
        super(props)

        this.nodeWidth = 110
        this.nodeHeight = 260

        this.tree = tree().nodeSize([this.nodeWidth, this.nodeHeight])

        this.initTree()

        this.isCtrlPressed = false
    }

    componentDidMount() {
        select("body")
            .on("keydown", () => {
                if (event.keyCode === 17) {
                    this.isCtrlPressed = true
                }
            })
            .on("keyup", () => {
                if (event.keyCode === 17) {
                    this.isCtrlPressed = false
                }
            })

        this.createSVG()
    }

    componentDidUpdate() {
    }

    onResize(rect: any) {
        if (!this.svg) {
            return
        }
        this.svg
            .attr("width", rect.width)
            .attr("height", rect.height)
    }

    createSVG() {
        if (!this.svgDiv) {
            return
        }

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

    defaultState(): State {
        return { expanded: false }
    }

    resetTree() {
        this.initTree()
    }

    initTree() {
        this.root = new Node("root", "root", { name: "root" }, { expanded: true })

        this.maxWeight = 0

        this.nodes = new Map<string, Node>()
        this.layerNodeStates = new Map<string, boolean>()

        this.links = new Array<Link>()
        this.layerLinkStates = new Map<string, boolean>()
    }

    /**
     * Active or disable links of given layer
     * @param {*} layer
     * @param {*} active
     */
    showLinkLayer(layer: string, active: boolean) {
        this.layerLinkStates.set(layer, active)
        this.renderTree()
    }

    /**
     * Active or disable nodes of given layer
     * @param {*} layer
     * @param {*} active
     */
    showNodeLayer(layer: string, active: boolean) {
        this.layerNodeStates.set(layer, active)
        this.renderTree()
    }

    /**
     * Add a new node to the tree root
     * @param {string} id
     * @param {string} layer
     * @param {object} data
     */
    addNode(id: string, layer: string, data: any): Node {
        var node = new Node(id, layer, data, this.defaultState())
        this.nodes[id] = node

        if (layer && !(layer in this.layerNodeStates)) {
            this.layerNodeStates.set(layer, false)
        }

        return node
    }

    /**
     * Remove a node from the tree
     * @param {node} node
     */
    delNode(node: Node) {
        if (node.parent) {
            node.parent.children = node.parent.children.filter(c => c.id !== node.id)
        }

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
    setParent(child: Node, parent: Node, weight: number | ((Node) => number)) {
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
    addLink(node1: Node, node2: Node, layer: string, data: any) {
        this.links.push(new Link(node1.id + "_" + node2.id, layer, node1, node2, data))
        if (layer && !this.layerLinkStates.has(layer)) {
            this.layerLinkStates.set(layer, true)
        }
    }


    // clone using wrapped node
    cloneTree(node: Node, parent: NodeWrapper | null): NodeWrapper | null {
        // always return root node as it is the base of the tree and thus all the
        // layers
        if (node.layer !== "root" && !this.layerNodeStates.get(node.layer)) {
            return null
        }

        let cloned = new NodeWrapper(node.id, node, parent)

        if (node.state.expanded) {
            node.children.forEach(child => {
                let subCloned = this.cloneTree(child, cloned)
                if (subCloned) {
                    cloned.children.push(subCloned)
                }
            })
            if (this.props.sortNodesFnc) {
                cloned.children.sort((a, b) => this.props.sortNodesFnc(a.wrapped, b.wrapped))
            }
        }

        return cloned
    }

    normalizeTree(node: Node): NodeWrapper | null {
        // return depth of the given layer
        let layerHeight = (node: NodeWrapper, weight: number, currDepth: number): number => {
            if (node.wrapped.weight > weight) {
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
        let normalizeTreeHeight = (root: NodeWrapper, node: NodeWrapper, weight: number, currDepth: number, cache: { chains: Map<string, { first: NodeWrapper, last: NodeWrapper }> }) => {
            if (node.wrapped.weight > weight) {
                return
            }

            if (node.wrapped.weight === weight && node.parent && node.parent.wrapped.weight !== weight) {
                let parentDepth = layerHeight(root, node.wrapped.weight - 1, 0)
                if (currDepth > parentDepth) {
                    return
                }

                let path = node.parent.wrapped.id + "/" + node.wrapped.weight

                let first: NodeWrapper, last: NodeWrapper
                let chain = cache.chains.get(path)
                if (chain) {
                    first = chain.first

                    node.parent.children = node.parent.children.filter(d => d !== node)

                    last = chain.last
                } else {
                    first = new NodeWrapper(node.id + "_" + currDepth, node.wrapped, node.parent)
                    first.isPlaceholder = true

                    let children = node.parent.children
                    let index = children.indexOf(node)
                    children[index] = first

                    last = first

                    while (currDepth++ < parentDepth) {
                        let next = new NodeWrapper(node.id + "_" + currDepth, node.wrapped, node.parent)
                        next.isPlaceholder = true

                        last.children = [next]
                        last = next
                    }

                    cache.chains.set(path, { first: first, last: last })
                }
                last.children.push(node)

                return
            }

            node.children.forEach(child => {
                normalizeTreeHeight(root, child, weight, currDepth + 1, cache)
            })
        }

        var tree = this.cloneTree(node, null)
        if (!tree) {
            return null
        }

        for (let i = 0; i <= this.maxWeight; i++) {
            let cache = { chains: new Map<string, { first: NodeWrapper, last: NodeWrapper }>() }
            normalizeTreeHeight(tree, tree, i, 0, cache)
        }

        return tree
    }

    collapse(node: Node) {
        if (node.state) {
            node.state.expanded = false
        }
        node.children.forEach((child: Node) => this.collapse(child))
    }

    expand(d: D3Node) {
        if (d.data.wrapped.state.expanded) {
            this.collapse(d.data.wrapped)
        } else {
            d.data.wrapped.state.expanded = true
        }

        this.renderTree()
    }

    hexagon(d: D3Node, size: number) {
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

    visibleLinks() {
        var links = Array<Link>()

        var findVisible = (node: Node | null) => {
            while (node) {
                if (this.wrappers[node.id]) {
                    return node
                }
                node = node.parent
            }
        }

        this.links.forEach((link: Link) => {
            if (!this.layerLinkStates.get(link.layer)) {
                return
            }

            let source = findVisible(link.source)
            let target = findVisible(link.target)

            if (source && target && source !== target) {
                links.push(new Link(source.id + "_" + target.id, link.layer, source, target, link.data))
            }
        })

        console.log(links)

        return links
    }

    limitX(node: D3Node, bb?: Array<number>) {
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
                this.limitX(child, bb)
            })
        }

        return bb
    }

    nodesRect(root: D3Node, nodes: Array<D3Node>): { x: number, y: number, width: number, height: number } | null {
        if (!this.svgDiv) {
            return null
        }

        var node0 = nodes[0]
        var nBB = [node0.y, node0.y]

        for (let node of nodes) {
            if (nBB[0] > node.y) {
                nBB[0] = node.y
            }
            if (nBB[1] < node.y) {
                nBB[1] = node.y
            }
        }

        var gBB = this.limitX(root)
        const margin = this.nodeHeight / 2

        return {
            x: gBB[0] - this.svgDiv.clientWidth * 5,
            y: nBB[0] - margin,
            width: (gBB[1] - gBB[0]) + this.svgDiv.clientWidth * 10,
            height: nBB[1] - nBB[0] + margin * 2
        }
    }

    _levelNodes(node: D3Node, nodes?: Map<number, { id: number, nodes: Array<D3Node> }>): Map<number, { id: number, nodes: Array<D3Node> }> {
        if (!nodes) {
            nodes = new Map<number, { id: number, nodes: Array<D3Node> }>()
        }

        if (node.data.wrapped !== this.root && !node.data.isPlaceholder) {
            var arr = nodes.get(node.data.wrapped.weight)
            if (!arr) {
                arr = { id: node.data.wrapped.weight, nodes: [node] }
                nodes.set(node.data.wrapped.weight, arr)
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

    levelNodes(node: D3Node): Array<{ id: number, nodes: Array<D3Node> }> {
        var levels = new Array<{ id: number, nodes: Array<D3Node> }>()

        this._levelNodes(node).forEach(value => {
            levels.push(value)
        });

        return levels
    }

    /**
     * Unselect all the nodes
     */
    unselectAllNodes() {
        var self = this

        this.gNodes.selectAll(".node-selected").each(function () {
            var node = select(this)
            if (!node) {
                return
            }
            node.classed("node-selected", false)

            if (self.props.onNodeSelected) {
                var id = node.attr("id")
                if (id) {
                    id = id.replace(/^node-/, '')
                }

                self.props.onNodeSelected(self.nodes[id], false)
            }
        })
    }

    /**
     * Select or Unselect the node of the given id according to active boolean
     * @param {string} id
     * @param {boolean} active
     */
    selectNode(id: string, active: boolean) {
        if (!this.isCtrlPressed) {
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
    toggleNode(id: string) {
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
        if (!this.gNodes) {
            return
        }

        var element = this.gNodes.node()
        if (!element) {
            return
        }
        var bounds = element.getBBox()

        element = this.g.node()
        if (!element) {
            return
        }
        var parent = element.parentElement
        if (!parent) {
            return
        }

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

    showNodeContextMenu(d: D3Node) {
        if (!this.svgDiv) {
            return
        }

        // hide previous
        this.hideNodeContextMenu()

        if (this.props.onShowNodeContextMenu) {
            var data = this.props.onShowNodeContextMenu(d.data.wrapped)

            var divBB = this.svgDiv.getBoundingClientRect()

            var x = event.x - divBB.left, y = event.y - divBB.top

            var g = this.gContextMenu.append("g")
                .style("opacity", 0)
            g.transition()
                .duration(300)
                .style("opacity", 1)
            var rect = g.append("rect")
                .attr("filter", "url(#drop-shadow)")

            var marginX = 20, marginY = 10, paddingY = 30

            var dy = 0, rects = new Array<Selection<SVGGElement, {}, null, undefined>>()
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

                let element = text.node()
                if (!element) {
                    continue
                }

                let bb = element.getBBox()
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

            var element = g.node()
            if (!element) {
                return
            }

            var bb = element.getBBox()
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

    nodeClick(d: D3Node) {
        event.stopPropagation()

        if (this.nodeClickID) {
            return
        }

        this.nodeClickID = window.setTimeout(() => {
            this.nodeClickID = 0

            this.hideNodeContextMenu()
            this.toggleNode(d.data.id)
        }, 200)
    }

    nodeDoubleClick(d: D3Node) {
        // it's a dbl click then stop click handler
        if (this.nodeClickID) {
            clearTimeout(this.nodeClickID)
            this.nodeClickID = 0
        }

        this.expand(d)
    }

    neighborLinks(d: D3Node, links: Array<Link>): Array<string> {
        var ids = new Array<string>()

        for (let link of links) {
            if (link.source.id === d.data.wrapped.id || link.target.id === d.data.wrapped.id) {
                ids.push(link.id)
            }
        }

        return ids
    }

    /**
     * Invalidate the view and render the tree
     */
    renderTree() {
        var self = this

        var normRoot = this.normalizeTree(this.root)

        var root = hierarchy(normRoot)
        this.tree(root)

        this.wrappers = new Map<string, NodeWrapper>()
        root.each(node => {
            this.wrappers[node.data.id] = node
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
            .each(function (d) {
                var bb = self.nodesRect(root, d.nodes)
                if (bb) {
                    select(this)
                        .attr("x", bb.x)
                        .attr("y", bb.y)
                        .attr("width", bb.width)
                        .attr("height", bb.height)
                }
            })
        level.exit().remove()

        levelEnter.transition()
            .duration(500)
            .style("opacity", 1)

        level.transition()
            .duration(500)
            .each(function (d) {
                var bb = self.nodesRect(root, d.nodes)
                if (bb) {
                    select(this)
                        .attr("x", bb.x)
                        .attr("y", bb.y)
                        .attr("width", bb.width)
                        .attr("height", bb.height)
                }
            })

        var hieraLink = this.gHieraLinks.selectAll('path.hiera-link')
            .data(root.links(), (d: any) => d.source.data.id + d.target.data.id)
        var hieraLinkEnter = hieraLink.enter()
            .filter((d: any) => d.source.data.wrapped !== this.root)
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
            .data(root.descendants(), (d: D3Node) => d.data.id)

        node.exit()
            .transition()
            .duration(500).style("opacity", 0)
            .remove()

        var nodeEnter = node.enter()
            .filter((d: D3Node) => !d.data.isPlaceholder && d.data.wrapped !== this.root)
            .append("g")
            .attr("id", (d: D3Node) => "node-" + d.data.id)
            .attr("class", (d: D3Node) => "node " + this.props.nodeAttrs(d.data.wrapped).class)
            .style("opacity", 0)
            .attr("transform", (d: D3Node) => `translate(${d.x},${d.y})`)
            .on("dblclick", (d: D3Node) => this.nodeDoubleClick(d))
            .on("click", (d: D3Node) => this.nodeClick(d))
            .on("contextmenu", (d: D3Node) => {
                event.preventDefault()
                this.showNodeContextMenu(d)
            })
            .on("mouseover", (d: D3Node) => {
                select("#node-overlay-" + d.data.id)
                    .style("opacity", 1)

                var ids = this.neighborLinks(d, this.visibleLinks())
                for (let id of ids) {
                    select("#link-overlay-" + id)
                        .style("opacity", 1)
                }
            })
            .on("mouseout", () => {
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
            .attr("id", (d: D3Node) => "node-overlay-" + d.data.id)
            .attr("class", "node-overlay")
            .attr("r", hexSize + 16)
            .style("opacity", 0)

        nodeEnter.append("circle")
            .attr("class", "node-circle")
            .attr("r", hexSize + 16)

        nodeEnter.append("circle")
            .attr("class", "node-disc")
            .attr("r", hexSize + 8)

        nodeEnter.append("path")
            .attr("class", "node-hexagon")
            .attr("d", (d: D3Node) => this.liner(this.hexagon(d, hexSize)))

        nodeEnter.append("text")
            .attr("class", "node-icon")
            .text((d: D3Node) => this.props.nodeAttrs(d.data.wrapped).icon)

        let wrapText = (text, lineHeight, width) => {
            text.each(function () {
                var text = select(this)
                var y = text.attr("y")
                var dy = parseFloat(text.attr("dy"))
                var words = text.text().split(/(?=[\s\-._])/).reverse()
                var line = new Array<string>()

                var tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em")

                var lineNumber = 0
                var word = words.pop()
                while (word) {
                    line.push(word)
                    tspan.text(line.join(""))

                    let element = tspan.node()
                    if (!element) {
                        continue
                    }
                    if (element.getComputedTextLength() > width) {
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
            .text((d: D3Node) => this.props.nodeAttrs(d.data.wrapped).name)
            .call(wrapText, 1.1, this.nodeWidth - 10)

        var exco = nodeEnter
            .filter((d: D3Node) => d.data.wrapped.children.length > 0)
            .append("g")

        exco.append("circle")
            .attr("class", "node-exco-circle")
            .attr("cx", hexSize + 10)
            .attr("cy", hexSize)
            .attr("r", (d: D3Node) => d.data.wrapped.children.length ? 18 : 0)

        exco.append("text")
            .attr("id", (d: D3Node) => "exco-" + d.data.id)
            .attr("class", "node-exco-children")
            .attr("x", hexSize + 10)
            .attr("y", hexSize + 6)
            .text((d: D3Node) => d.data.wrapped.children.length > 99 ? "+99" : d.data.wrapped.children.length)

        node.transition()
            .duration(500)
            .style("opacity", 1)
            .attr("transform", (d: D3Node) => `translate(${d.x},${d.y})`)

        var linker = linkVertical()
            .x((d: any) => this.wrappers[d.node.id].x + d.dx)
            .y((d: any) => this.wrappers[d.node.id].y + d.dy)

        let wrapperLink = (d, margin) => {
            if (this.wrappers[d.source.id].y === this.wrappers[d.target.id].y) {
                if (this.wrappers[d.source.id].x < this.wrappers[d.target.id].x) {
                    return { source: { node: d.source, dx: margin, dy: 0 }, target: { node: d.target, dx: -margin, dy: 0 } }
                }
                return { source: { node: d.target, dx: margin, dy: 0 }, target: { node: d.source, dx: -margin, dy: 0 } }
            }

            if (this.wrappers[d.source.id].y < this.wrappers[d.target.id].y) {
                return { source: { node: d.source, dx: 0, dy: margin }, target: { node: d.target, dx: 0, dy: -margin } }
            }

            return { source: { node: d.target, dx: 0, dy: margin }, target: { node: d.source, dx: 0, dy: -margin } }
        }

        var visibleLinks = this.visibleLinks()

        var linkOverlay = this.gLinkOverlays.selectAll('path.link-overlay')
            .data(visibleLinks, (d: Link) => d.id)
        linkOverlay.enter()
            .append('path')
            .attr("id", (d: Link) => "link-overlay-" + d.id)
            .attr("class", "link-overlay")
            .style("opacity", 0)
            .attr("d", (d: Link) => linker(wrapperLink(d, 55)))
        linkOverlay.exit().remove()

        linkOverlay.transition()
            .duration(500)
            .attr("d", (d: Link) => linker(wrapperLink(d, 55)))

        var link = this.gLinks.selectAll('path.link')
            .data(visibleLinks, (d: Link) => d.id)
        var linkEnter = link.enter()
            .append('path')
            .attr("class", (d: Link) => "link " + this.props.linkAttrs(d).class)
            .style("opacity", 0)
            .attr("d", (d: Link) => linker(wrapperLink(d, 55)))
        link.exit().remove()

        linkEnter.transition()
            .duration(500)
            .style("opacity", 1)

        link.transition()
            .duration(500)
            .attr("d", (d: Link) => linker(wrapperLink(d, 55)))

        var linkWrap = this.gLinkWraps.selectAll('path.link-wrap')
            .data(visibleLinks, (d: Link) => d.id)
        linkWrap.enter()
            .append('path')
            .attr("class", "link-wrap")
            .attr("d", (d: Link) => linker(wrapperLink(d, 55)))
            .on("mouseover", (d: Link) => {
                select("#link-overlay-" + d.id)
                    .style("opacity", 1)
            })
            .on("mouseout", (d: Link) => {
                selectAll("path.link-overlay")
                    .style("opacity", 0)
            })
        linkWrap.exit().remove()

        linkWrap.transition()
            .duration(500)
            .attr("d", (d: Link) => linker(wrapperLink(d, 55)))
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