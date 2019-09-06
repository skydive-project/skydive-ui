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

export enum LinkTagState {
    Hidden = 1,
    EventBased,
    Visible
}

interface State {
    expanded: boolean
}

export class Node {
    id: string
    tags: Array<string>
    data: any
    weight: number
    children: Array<Node>
    state: State
    parent: Node | null

    constructor(id: string, tags: Array<string>, data: any, state: State) {
        this.id = id
        this.tags = tags
        this.data = data
        this.weight = 0
        this.children = new Array<Node>()
        this.state = state
    }
}

export class Link {
    id: string
    tags: Array<string>
    source: Node
    target: Node
    data: any

    constructor(id: string, tags: Array<string>, source: Node, target: Node, data: any) {
        this.id = id
        this.tags = tags
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

interface D3Node {
    data: NodeWrapper
    x: number
    y: number
    children: Array<D3Node>
}

export interface NodeAttrs {
    name: string
    class: string
    icon: string
}

export interface LinkAttrs {
    class: string
}

interface Props {
    sortNodesFnc: (node1: Node, node2: Node) => number
    onShowNodeContextMenu: (node: Node) => any
    onNodeSelected: (node: Node, isSelected: boolean) => any
    className: string
    nodeAttrs: (node: Node) => NodeAttrs
    linkAttrs: (link: Link) => LinkAttrs
}

/**
 * Topology component. Based on a tree enhanced by multiple levels supports.
 */
export class Topology extends React.Component<Props, {}> {

    private nodeWidth: number
    private nodeHeight: number
    private tree: tree
    private isCtrlPressed: boolean
    private svgDiv: HTMLElement | null
    private svg: Selection<SVGSVGElement, any, null, undefined>
    private g: Selection<SVGGraphicsElement, {}, null, undefined>
    private gLevels: Selection<SVGGraphicsElement, {}, null, undefined>
    private gHieraLinks: Selection<SVGGraphicsElement, {}, null, undefined>
    private gLinkOverlays: Selection<SVGGraphicsElement, {}, null, undefined>
    private gLinks: Selection<SVGGraphicsElement, {}, null, undefined>
    private gLinkWraps: Selection<SVGGraphicsElement, {}, null, undefined>
    private gNodes: Selection<SVGGraphicsElement, {}, null, undefined>
    private gContextMenu: Selection<SVGGraphicsElement, {}, null, undefined>
    private zoom: zoom
    private liner: line
    private nodeClickedID: number
    private d3nodes: Map<string, D3Node>
    private maxWeight: number
    private links: Array<any>

    root: Node
    nodes: Map<string, Node>
    nodeTagStates: Map<string, boolean>
    linkTagStates: Map<string, LinkTagState>

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

    private onResize(rect: any) {
        if (!this.svg) {
            return
        }
        this.svg
            .attr("width", rect.width)
            .attr("height", rect.height)
    }

    private createSVG() {
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

    private defaultState(): State {
        return { expanded: false }
    }

    resetTree() {
        this.initTree()
    }

    private initTree() {
        this.root = new Node("root", ["root"], { name: "root" }, { expanded: true })

        this.maxWeight = 0

        this.nodes = new Map<string, Node>()
        this.nodeTagStates = new Map<string, boolean>()

        this.links = new Array<Link>()
        this.linkTagStates = new Map<string, LinkTagState>()
    }

    /**
     * Set the state of links of given tag
     * @param {*} tag
     * @param {*} state
     */
    setLinkTagState(tag: string, state: LinkTagState) {
        this.linkTagStates.set(tag, state)
        this.renderTree()
    }

    /**
     * Active or disable nodes of given tag
     * @param {*} tag
     * @param {*} active
     */
    showNodeTag(tag: string, active: boolean) {
        this.nodeTagStates.set(tag, active)
        this.renderTree()
    }

    /**
     * Add a new node to the tree root
     * @param {string} id
     * @param {Array<string>} tags
     * @param {object} data
     */
    addNode(id: string, tags: Array<string>, data: any): Node {
        var node = new Node(id, tags, data, this.defaultState())
        this.nodes[id] = node

        tags.forEach(tag => {
            if (!this.nodeTagStates.has(tag)) {
                this.nodeTagStates.set(tag, false)
            }
        })

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
     * @param {node} child
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
     * @param {Array<string>} tags
     * @param {object} data
     */
    addLink(node1: Node, node2: Node, tags: Array<string>, data: any) {
        this.links.push(new Link(node1.id + "_" + node2.id, tags, node1, node2, data))

        tags.forEach(tag => {
            if (!this.linkTagStates.has(tag)) {
                this.linkTagStates.set(tag, LinkTagState.Hidden)
            }
        })
    }

    // clone using wrapped node
    private cloneTree(node: Node, parent: NodeWrapper | null): NodeWrapper | null {
        // always return root node as it is the base of the tree and thus all the
        // nodes
        if (!node.tags.some(tag => tag === "root" || this.nodeTagStates.get(tag) === true)) {
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

    private normalizeTree(node: Node): NodeWrapper | null {
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

    private collapse(node: Node) {
        if (node.state) {
            node.state.expanded = false
        }
        node.children.forEach((child: Node) => this.collapse(child))
    }

    private expand(node: NodeWrapper) {
        if (node.wrapped.state.expanded) {
            this.collapse(node.wrapped)
        } else {
            node.wrapped.state.expanded = true
        }

        this.renderTree()
    }

    private hexagon(d: D3Node, size: number) {
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

    private visibleLinks() {
        var links = Array<Link>()

        var findVisible = (node: Node | null) => {
            while (node) {
                if (this.d3nodes.get(node.id)) {
                    return node
                }
                node = node.parent
            }
        }

        this.links.forEach((link: Link) => {
            if (!(link.tags.some(tag => this.linkTagStates.get(tag) !== LinkTagState.Hidden))) {
                return
            }

            let source = findVisible(link.source)
            let target = findVisible(link.target)

            if (source && target && source !== target) {
                links.push(new Link(source.id + "_" + target.id, link.tags, source, target, link.data))
            }
        })

        return links
    }

    private limitX(node: D3Node, bb?: Array<number>) {
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

    private nodesRect(root: D3Node, nodes: Array<D3Node>): { x: number, y: number, width: number, height: number } | null {
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

    private _levelNodes(node: D3Node, nodes?: Map<number, { id: number, nodes: Array<D3Node> }>): Map<number, { id: number, nodes: Array<D3Node> }> {
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

    private levelNodes(node: D3Node): Array<{ id: number, nodes: Array<D3Node> }> {
        var levels = new Array<{ id: number, nodes: Array<D3Node> }>()

        this._levelNodes(node).forEach(value => {
            levels.push(value)
        });

        return levels
    }

    /**
     * Unselect all the nodes
     */
    private unselectAllNodes() {
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

    private showNodeContextMenu(d: D3Node) {
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

    private hideNodeContextMenu() {
        this.gContextMenu.select("g").remove()
    }

    private nodeClicked(d: D3Node) {
        event.stopPropagation()

        if (this.nodeClickedID) {
            return
        }

        this.nodeClickedID = window.setTimeout(() => {
            this.nodeClickedID = 0

            this.hideNodeContextMenu()
            this.toggleNode(d.data.id)
        }, 200)
    }

    private nodeDoubleClicked(d: D3Node) {
        // it's a dbl click then stop click handler
        if (this.nodeClickedID) {
            clearTimeout(this.nodeClickedID)
            this.nodeClickedID = 0
        }

        this.expand(d.data)
    }

    private neighborLinks(node: NodeWrapper, links: Array<Link>): Array<string> {
        var ids = new Array<string>()

        for (let link of links) {
            if (link.source.id === node.wrapped.id || link.target.id === node.wrapped.id) {
                ids.push(link.id)
            }
        }

        return ids
    }

    private showNode(d: D3Node) {
        var parent = d.data.parent
        while (parent) {
            if (!parent.wrapped.state.expanded) {
                this.expand(parent)
            }
            parent = parent.parent
        }
    }

    highlightNode(id: string, active: boolean) {
        var d = this.d3nodes.get(id)
        if (!d) {
            return false
        }
        this.showNode(d)

        var opacity = active ? 1 : 0

        select("#node-overlay-" + id)
            .style("opacity", opacity)

        var ids = this.neighborLinks(d.data, this.visibleLinks())
        for (let id of ids) {
            select("#link-" + id)
                .style("opacity", opacity)
            select("#link-overlay-" + id)
                .style("opacity", opacity)
        }
    }

    clearHighlighNode() {
        var self = this

        selectAll("circle.node-overlay")
            .style("opacity", 0)
        selectAll("path.link-overlay")
            .style("opacity", 0)

        // un-select non visible links
        selectAll("path.link").each(function(d: Link) {
            select(this).style("opacity", self.isLinkVisible(d) ? 1 : 0)
        })
    }

    isLinkVisible(link: Link) {
        return link.tags.some(tag => this.linkTagStates.get(tag) === LinkTagState.Visible)
    }

    /**
     * Invalidate the view and render the tree
     */
    renderTree() {
        var self = this

        var normRoot = this.normalizeTree(this.root)

        var root = hierarchy(normRoot)
        this.tree(root)

        this.d3nodes = new Map<string, D3Node>()
        root.each(node => {
            this.d3nodes.set(node.data.id, node)
        })

        const hieraLinker = linkVertical()
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
            .filter((d: any) => d.target.data.parent.wrapped !== this.root)
            .append('path')
            .attr("class", "hiera-link")
            .style("opacity", 0)
            .attr("d", hieraLinker)
        hieraLink.exit().remove()

        hieraLinkEnter.transition()
            .duration(500)
            .style("opacity", 1)

        hieraLink.transition()
            .duration(500)
            .attr("d", hieraLinker)

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
            .on("dblclick", (d: D3Node) => this.nodeDoubleClicked(d))
            .on("click", (d: D3Node) => this.nodeClicked(d))
            .on("contextmenu", (d: D3Node) => {
                event.preventDefault()
                this.showNodeContextMenu(d)
            })
            .on("mouseover", (d: D3Node) => {
                this.highlightNode(d.data.id, true)
            })
            .on("mouseout", () => {
                this.clearHighlighNode()
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
            .attr("dy", 2)
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

        const vLinker = linkVertical()
            .x((d: any) => {
                let node = this.d3nodes.get(d.node.id)
                return node ? node.x + d.dx : d.dx
            })
            .y((d: any) => {
                let node = this.d3nodes.get(d.node.id)
                return node ? node.y + d.dy : d.y
            })
        const linker = (d: Link) => vLinker(wrapperLink(d, 55))

        let wrapperLink = (d, margin) => {
            let dSource = this.d3nodes.get(d.source.id)
            let dTarget = this.d3nodes.get(d.target.id)

            if (!dSource || !dTarget) {
                return
            }

            if (dSource.y === dTarget.y) {
                if (dSource.x < dTarget.x) {
                    return { source: { node: d.source, dx: margin, dy: 0 }, target: { node: d.target, dx: -margin, dy: 0 } }
                }
                return { source: { node: d.target, dx: margin, dy: 0 }, target: { node: d.source, dx: -margin, dy: 0 } }
            }

            if (dSource.y < dTarget.y) {
                return { source: { node: d.source, dx: 0, dy: margin }, target: { node: d.target, dx: 0, dy: -margin } }
            }

            return { source: { node: d.target, dx: 0, dy: margin }, target: { node: d.source, dx: 0, dy: -margin } }
        }

        var visibleLinks = this.visibleLinks()

        var linkOverlay = this.gLinkOverlays.selectAll('path.link-overlay')
            .data(visibleLinks, (d: Link) => d.id)
        var linkOverlayEnter = linkOverlay.enter()
            .append('path')
            .attr("id", (d: Link) => "link-overlay-" + d.id)
            .attr("class", "link-overlay")
            .style("opacity", 0)
        linkOverlay.exit().remove()

        linkOverlay = linkOverlay.merge(linkOverlayEnter)
        linkOverlay.transition()
            .duration(500)
            .attr("d", d => linker(d))

        var link = this.gLinks.selectAll('path.link')
            .data(visibleLinks, (d: Link) => d.id)
        var linkEnter = link.enter()
            .append('path')
            .attr("id", (d: Link) => "link-" + d.id)
            .attr("class", (d: Link) => "link " + this.props.linkAttrs(d).class)
            .style("opacity", 0)
        link.exit().remove()

        link = link.merge(linkEnter)
        link.transition()
            .duration(500)
            .style("opacity", (d: Link) => this.isLinkVisible(d) ? 1 : 0)
            .attr("d", d => linker(d))

        var linkWrap = this.gLinkWraps.selectAll('path.link-wrap')
            .data(visibleLinks, (d: Link) => d.id)
        var linkWrapEnter = linkWrap.enter()
            .append('path')
            .attr("class", "link-wrap")
            .on("mouseover", (d: Link) => {
                if (this.isLinkVisible(d)) {
                    select("#link-overlay-" + d.id)
                        .style("opacity", 1)
                }
            })
            .on("mouseout", () => {
                selectAll("path.link-overlay")
                    .style("opacity", 0)
            })
        linkWrap.exit().remove()

        linkWrap = linkWrap.merge(linkWrapEnter)
        linkWrap.transition()
            .duration(500)
            .attr("d", d => linker(d))
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