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

import * as React from "react"
import { hierarchy, tree } from 'd3-hierarchy'
import { Selection, select, selectAll, event } from 'd3-selection'
import { line, linkVertical, curveCatmullRom, curveCardinalClosed } from 'd3-shape'
import { } from 'd3-transition'
import { zoom, zoomIdentity } from 'd3-zoom'
import ResizeObserver from 'react-resize-observer'

import './Topology.css'

const animDuration = 500

export enum LinkTagState {
    Hidden = 1,
    EventBased,
    Visible
}

interface State {
    expanded: boolean
    selected: boolean
    mouseover: boolean
}

export class Node {
    id: string
    tags: Array<string>
    data: any
    weight: number | ((node: Node) => number)
    children: Array<Node>
    state: State
    parent: Node | null

    constructor(id: string, tags: Array<string>, data: any, state: State, weight: number | ((node: Node) => number)) {
        this.id = id
        this.tags = tags
        this.data = data
        this.weight = weight
        this.children = new Array<Node>()
        this.state = state
    }

    getWeight(): number {
        var weight = typeof this.weight === "function" ? this.weight(this) : this.weight
        var parentWeight = this.parent ? this.parent.getWeight() : 0

        if (!weight || weight < parentWeight) {
            weight = parentWeight
        }

        return weight
    }
}

export class Link {
    id: string
    tags: Array<string>
    source: Node
    target: Node
    data: any
    directed: boolean

    constructor(id: string, tags: Array<string>, source: Node, target: Node, data: any, directed: boolean) {
        this.id = id
        this.tags = tags
        this.source = source
        this.target = target
        this.directed = directed
    }
}

interface LevelNodes {
    weight: number
    nodes: Array<D3Node>
}

interface BoundingBox {
    x: number
    y: number
    width: number
    height: number
}

interface LevelRect {
    weight: number
    bb: BoundingBox
}

enum WrapperType {
    Normal = 1,
    Hidden,
    Group
}

class NodeWrapper {
    id: string
    wrapped: Node
    children: Array<NodeWrapper>
    parent: NodeWrapper | null
    type: WrapperType
    offset: number

    constructor(id: string, type: WrapperType, node: Node, parent: NodeWrapper | null) {
        this.id = id
        this.wrapped = node
        this.parent = parent
        this.children = new Array<NodeWrapper>()
        this.type = type
        this.offset = 0
    }
}

interface D3Node {
    data: NodeWrapper
    x: number
    y: number
    children: Array<D3Node>
}

interface Group {
    id: string
    nodes: Array<D3Node>
}

export interface NodeAttrs {
    name: string
    classes: Array<string>
    icon: string
}

export interface LinkAttrs {
    classes: Array<string>
}

interface Props {
    sortNodesFnc: (node1: Node, node2: Node) => number
    onShowNodeContextMenu: (node: Node) => any
    onNodeSelected: (node: Node, isSelected: boolean) => any
    className: string
    nodeAttrs: (node: Node) => NodeAttrs
    linkAttrs: (link: Link) => LinkAttrs
    weightTitles?: Map<number, string>
    groupBy?: string
    groupSize?: number
}

const maxWeight = 15

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
    private gLevelLabels: Selection<SVGGraphicsElement, {}, null, undefined>
    private gHieraLinks: Selection<SVGGraphicsElement, {}, null, undefined>
    private gLinkOverlays: Selection<SVGGraphicsElement, {}, null, undefined>
    private gLinks: Selection<SVGGraphicsElement, {}, null, undefined>
    private gLinkWraps: Selection<SVGGraphicsElement, {}, null, undefined>
    private gGroups: Selection<SVGGraphicsElement, {}, null, undefined>
    private gNodes: Selection<SVGGraphicsElement, {}, null, undefined>
    private gContextMenu: Selection<SVGGraphicsElement, {}, null, undefined>
    private zoom: zoom
    private liner: line
    private nodeClickedID: number
    private d3nodes: Map<string, D3Node>
    private links: Array<Link>
    private absTransformX: number
    private absTransformY: number
    private nodeTagCount: Map<string, number>
    private linkTagCount: Map<string, number>
    private invalidated: boolean
    private levelRects: Array<LevelRect>
    private groups: Map<string, NodeWrapper>
    private groupStates: Map<string, State>

    root: Node
    nodes: Map<string, Node>
    nodeTagStates: Map<string, boolean>
    linkTagStates: Map<string, LinkTagState>
    weightTitles: Map<number, string>

    constructor(props) {
        super(props)

        this.nodeWidth = 140
        this.nodeHeight = 260

        if (this.props.weightTitles) {
            this.weightTitles = this.props.weightTitles
        } else {
            this.weightTitles = new Map<number, string>()
        }

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
            .attr("id", "link-directed-marker")
            .attr("viewBox", "-5 -5 10 10")
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("class", "link-marker link-directed-marker")
            .attr("d", "M 0,0 m -5,-5 L 5,0 L -5,5 Z")

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

        this.absTransformX = this.absTransformY = 0

        this.zoom = zoom()
            .scaleExtent([0.1, 1.5])
            .on("zoom", () => {
                this.hideAllLevelLabels()
                this.hideNodeContextMenu()
                this.g.attr("transform", event.transform.toString())

                this.absTransformX = event.transform.x * 1 / event.transform.k
                this.absTransformY = event.transform.y * 1 / event.transform.k
            })
            .on("end", () => {
                window.setTimeout(function () {
                    this.showAllLevelLabels()
                }.bind(this), 200)
            })

        this.svg.call(this.zoom)
            .on("dblclick.zoom", null)

        this.g = this.svg
            .append("g")

        // levels group
        this.gLevels = this.g.append("g")
            .attr("class", "levels")

        // groups group, yes read it correctly groups group
        this.gGroups = this.g.append("g")
            .attr("class", "groups")

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

        // levels group
        this.gLevelLabels = this.g.append("g")
            .attr("class", "level-labels")

        // context menu group
        this.gContextMenu = this.svg.append("g")
            .attr("class", "context-menu")

        this.liner = line()
            .x(d => d.x)
            .y(d => d.y)
            .curve(curveCardinalClosed.tension(0.7))
    }

    private defaultState(): State {
        return { expanded: false, selected: false, mouseover: false }
    }

    resetTree() {
        this.initTree()
        this.renderTree()
    }

    private initTree() {
        this.root = new Node("root", ["root"], { name: "root" }, { expanded: true, selected: false, mouseover: false }, 0)

        this.nodes = new Map<string, Node>()
        this.nodeTagStates = new Map<string, boolean>()

        this.links = new Array<Link>()
        this.linkTagStates = new Map<string, LinkTagState>()

        this.nodeTagCount = new Map<string, number>()
        this.linkTagCount = new Map<string, number>()

        this.levelRects = new Array<LevelRect>()

        this.groups = new Map<string, NodeWrapper>()
        this.groupStates = new Map<string, State>()

        this.invalidated = true
    }

    setLinkTagState(tag: string, state: LinkTagState) {
        this.linkTagStates.set(tag, state)
        this.renderTree()
    }

    showNodeTag(tag: string, active: boolean) {
        this.nodeTagStates.set(tag, active)
        this.renderTree()
    }

    addNode(id: string, tags: Array<string>, data: any, weight: number | ((node: Node) => number)): Node {
        var node = new Node(id, tags, data, this.defaultState(), weight)
        this.nodes.set(id, node)

        tags.forEach(tag => {
            var count = this.nodeTagCount.get(tag) || 0
            this.nodeTagCount.set(tag, count + 1)

            if (!this.nodeTagStates.has(tag)) {
                this.nodeTagStates.set(tag, false)
            }
        })

        this.invalidated = true

        return node
    }

    updateNode(id: string, data: any) {
        var node = this.nodes.get(id)
        if (!node) {
            return
        }
        var prevWeight = node.getWeight()
        node.data = data

        // check whether the new data have change the weight
        // in order to trigger a recalculation
        if (prevWeight !== node.getWeight()) {
            this.invalidated = true
        }
    }

    delNode(id: string) {
        var node = this.nodes.get(id)
        if (!node) {
            return
        }

        if (node.parent) {
            node.parent.children = node.parent.children.filter(c => node && c.id !== node.id)
        }

        for (let link of this.links) {
            if (link.source === node || link.target === node) {
                this.links = this.links.filter(c => c === link)
            }
        }

        // remove tags if needed
        node.tags.forEach(tag => {
            var count = this.nodeTagCount.get(tag) || 0
            if (!count) {
                this.nodeTagCount.delete(tag)
                this.nodeTagStates.delete(tag)
            } else {
                this.nodeTagCount.set(tag, count - 1)
            }
        })

        this.nodes.delete(node.id)

        this.invalidated = true
    }

    setParent(child: Node, parent: Node) {
        // remove from previous parent if needed
        if (child.parent) {
            child.parent.children = child.parent.children.filter(c => c.id !== child.id)
        }

        parent.children.push(child)
        child.parent = parent

        this.invalidated = true
    }

    addLink(id: string, node1: Node, node2: Node, tags: Array<string>, data: any, directed: boolean) {
        this.links.push(new Link(id, tags, node1, node2, data, directed))

        tags.forEach(tag => {
            var count = this.linkTagCount.get(tag) || 0
            this.linkTagCount.set(tag, count + 1)

            if (!this.linkTagStates.has(tag)) {
                this.linkTagStates.set(tag, LinkTagState.EventBased)
            }
        })
    }

    updateLink(id: string, data: any) {
        this.links.some(link => {
            if (link.id === id) {
                link.data = data
                return true
            }
            return false
        })
    }

    delLink(id: string) {
        this.links = this.links.filter(link => {
            if (link.id !== id) {
                return true
            }

            // remove tags if needed
            link.tags.forEach(tag => {
                var count = this.nodeTagCount.get(tag) || 0
                if (!count) {
                    this.nodeTagCount.delete(tag)
                    this.nodeTagStates.delete(tag)
                } else {
                    this.nodeTagCount.set(tag, count - 1)
                }
            })

            return false
        })
    }

    // group nodes using groupBy and groupSize
    private groupify(node: NodeWrapper): Map<string, NodeWrapper> {
        var groups = new Map<string, NodeWrapper>()

        // dispatch node per groups
        node.children.forEach(child => {
            var field = child.wrapped.data.Type
            if (!field) {
                return
            }

            var weight = child.wrapped.getWeight()

            // group only nodes being at the same level, meaning weight
            var gid = node.id + "_" + field + "_" + weight

            var name = field + '(s)'

            var wrapper = groups.get(gid)
            if (!wrapper) {
                var state = this.groupStates.get(gid) || { expanded: false, selected: false, mouseover: false }
                this.groupStates.set(gid, state)

                var wrapped = new Node(gid, [], { Name: name, "Type": field }, state, () => { return child.wrapped.getWeight() })
                wrapper = new NodeWrapper(gid, WrapperType.Group, wrapped, node)
            }

            child.wrapped.tags.forEach(tag => {
                if (wrapper && !wrapper.wrapped.tags.includes(tag)) {
                    wrapper.wrapped.tags.push(tag)
                }
            })

            wrapper.wrapped.children.push(child.wrapped)
            wrapper.children.push(child)

            groups.set(gid, wrapper)
        })

        var pushed = new Set<string>()

        var children = new Array<NodeWrapper>()
        node.children.forEach(child => {
            var field = child.wrapped.data.Type
            if (!field) {
                children.push(child)
                return
            }

            var gid = node.id + "_" + field + "_" + child.wrapped.getWeight()
            if (pushed.has(gid)) {
                return
            }

            var wrapper = groups.get(gid)
            if (wrapper && wrapper.wrapped.children.length > 5) {
                if (wrapper.wrapped.state.expanded) {
                    children = children.concat(wrapper.children.splice(2, 4))
                } else {
                    wrapper.children = []
                    children.push(wrapper)
                }
                pushed.add(gid)
            } else {
                groups.delete(gid)
                children.push(child)
            }
        })
        node.children = children

        return groups
    }

    // clone using wrapped node
    private cloneTree(node: Node, parent: NodeWrapper | null): NodeWrapper | null {
        // always return root node as it is the base of the tree and thus all the
        // nodes
        if (!node.tags.some(tag => tag === "root" || this.nodeTagStates.get(tag) === true)) {
            return null
        }

        let cloned = new NodeWrapper(node.id, WrapperType.Normal, node, parent)

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
            for (const [gid, group] of this.groupify(cloned).entries()) {
                this.groups.set(gid, group)
            }
        }

        return cloned
    }

    private normalizeTree(node: Node): NodeWrapper | null {
        // return depth of the given layer
        let layerHeight = (node: NodeWrapper, weight: number, currDepth: number): number => {
            if (node.wrapped.getWeight() > weight) {
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

        // re-order tree to add wrapper node in order to separate levels
        let normalizeTreeHeight = (root: NodeWrapper, node: NodeWrapper, weight: number, currDepth: number, cache: { chains: Map<string, { first: NodeWrapper, last: NodeWrapper }> }) => {
            var nodeWeight = node.wrapped.getWeight()
            if (nodeWeight > weight) {
                return
            }

            if (nodeWeight === weight && node.parent && node.parent.wrapped.getWeight() !== weight) {
                let parentDepth = layerHeight(root, node.wrapped.getWeight() - 1, 0)
                if (currDepth > parentDepth) {
                    return
                }
                let path = node.parent.wrapped.id + "/" + nodeWeight

                let first: NodeWrapper, last: NodeWrapper
                let chain = cache.chains.get(path)
                if (chain) {
                    first = chain.first

                    node.parent.children = node.parent.children.filter(d => d !== node)

                    last = chain.last
                } else {
                    first = new NodeWrapper(node.id + "_" + currDepth, WrapperType.Hidden, node.wrapped, node.parent)

                    let children = node.parent.children
                    let index = children.indexOf(node)
                    children[index] = first

                    last = first

                    while (currDepth++ < parentDepth) {
                        let next = new NodeWrapper(node.id + "_" + currDepth, WrapperType.Hidden, node.wrapped, node.parent)

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

        this.groups.clear()

        var tree = this.cloneTree(node, null)
        if (!tree) {
            return null
        }

        for (let i = 0; i <= maxWeight; i++) {
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

        this.invalidated = true

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
                links.push(new Link(source.id + "_" + target.id, link.tags, source, target, link.data, link.directed))
            }
        })

        return links
    }

    private sceneSizeX() {
        var bb = Array<number>()
        var first = true

        Array.from(this.d3nodes.values()).forEach(node => {
            if (first == true || bb[0] > node.x) {
                bb[0] = node.x
            }
            if (first == true || bb[1] < node.x) {
                bb[1] = node.x
            }

            first = false
        })

        return bb
    }

    private nodesBB(d3nodes: Array<D3Node>): BoundingBox | null {
        if (d3nodes.length === 0) {
            return null
        }

        var node0 = d3nodes[0]
        var minX = node0.x, maxX = node0.x, minY = node0.y, maxY = node0.y

        for (let node of d3nodes) {
            if (minX > node.x) {
                minX = node.x
            }
            if (maxX < node.x) {
                maxX = node.x
            }
            if (minY > node.y) {
                minY = node.y
            }
            if (maxY < node.y) {
                maxY = node.y
            }
        }

        return {
            x: minX - this.nodeWidth / 2,
            y: minY - this.nodeHeight / 2,
            width: maxX - minX + this.nodeWidth,
            height: maxY - minY + this.nodeHeight
        }
    }

    private levelRect(levelNodes: LevelNodes): LevelRect | null {
        if (!this.svgDiv) {
            return null
        }

        var node0 = levelNodes.nodes[0]
        var minY = node0.y, maxY = node0.y

        for (let node of levelNodes.nodes) {
            if (minY > node.y) {
                minY = node.y
            }
            if (maxY < node.y) {
                maxY = node.y
            }
        }

        var gBB = this.sceneSizeX()
        const margin = this.nodeHeight / 2

        var width = this.svgDiv.clientWidth * 10

        return {
            weight: levelNodes.weight,
            bb: {
                x: gBB[0] - width,
                y: minY - margin,
                width: (gBB[1] - gBB[0]) + width * 2,
                height: maxY - minY + margin * 2
            }
        }
    }

    private updateLevelRects(levels: Array<LevelNodes>) {
        this.levelRects = new Array<LevelRect>()

        var prevY = 0
        levels.reverse().forEach(levelNodes => {
            var rect = this.levelRect(levelNodes)
            if (rect) {
                // ensure there is no overlap between no zone
                if (prevY && rect.bb.y + rect.bb.height > prevY) {
                    rect.bb.height = prevY - rect.bb.y
                }
                this.levelRects.push(rect)

                prevY = rect.bb.y
            }
        })
    }

    private levelNodes(): Array<LevelNodes> {
        var levelNodes = new Map<number, LevelNodes>()
        Array.from(this.d3nodes.values()).forEach(node => {
            if (node.data.wrapped !== this.root && node.data.type !== WrapperType.Hidden) {
                var arr = levelNodes.get(node.data.wrapped.getWeight())
                if (!arr) {
                    arr = { weight: node.data.wrapped.getWeight(), nodes: [node] }
                    levelNodes.set(node.data.wrapped.getWeight(), arr)
                } else {
                    arr.nodes.push(node)
                }
            }
        })

        var levels = Array.from(levelNodes.values())
        levels.sort(function (a: LevelNodes, b: LevelNodes) {
            return a.weight - b.weight
        })

        return levels
    }

    private unselectAllNodes() {
        var self = this

        this.gNodes.selectAll(".node-selected").each(function () {
            var node = select(this)
            if (!node) {
                return
            }
            node.classed("node-selected", false)

            var id = node.attr("id")
            if (!id) {
                return
            }
            id = id.replace(/^node-/, '')

            let n = self.nodes.get(id)
            if (!n) {
                return
            }
            n.state.selected = false

            if (self.props.onNodeSelected) {
                self.props.onNodeSelected(n, false)
            }
        })
        this.unHighlightNeighborLinks()
    }

    private unHighlightNeighborLinks() {
        var self = this

        selectAll("path.link-overlay")
            .style("opacity", 0)

        selectAll("path.link").each(function (d: Link) {
            select(this).style("opacity", self.isLinkVisible(d) ? 1 : 0)
        })
    }

    selectNode(id: string, active: boolean) {
        if (!this.isCtrlPressed) {
            this.unselectAllNodes()
        }
        let n = this.nodes.get(id)
        if (!n) {
            return
        }
        n.state.selected = active

        select("#node-" + id).classed("node-selected", active)

        var d = this.d3nodes.get(id)
        if (d) {
            this.highlightNeighborLinks(d, active)
        }

        if (this.props.onNodeSelected) {
            let n = this.nodes.get(id)
            if (n) {
                this.props.onNodeSelected(n, active)
            }
        }
    }

    toggleNode(id: string) {
        if (select("#node-" + id).classed("node-selected")) {
            this.selectNode(id, false)
        } else {
            this.selectNode(id, true)
        }
    }

    private viewSize(): { width: number, height: number } {
        var element = this.g.node()
        if (!element) {
            return { width: 0, height: 0 }
        }
        var parent = element.parentElement
        if (!parent) {
            return { width: 0, height: 0 }
        }

        return { width: parent.clientWidth || parent.parentNode.clientWidth, height: parent.clientHeight || parent.parentNode.clientHeight }
    }

    zoomFit() {
        if (!this.gNodes) {
            return
        }

        var element = this.gNodes.node()
        if (!element) {
            return
        }
        var bounds = element.getBBox()

        var viewSize = this.viewSize()

        var width = bounds.width, height = bounds.height
        if (width === 0 || height === 0) {
            return
        }
        var midX = bounds.x + width / 2, midY = bounds.y + height / 2

        var scale = 0.65 / Math.max(width / viewSize.width, height / viewSize.height)
        if (scale > 1) {
            scale = 1
        }

        this.absTransformX = viewSize.width / 2 - midX * scale
        this.absTransformY = viewSize.height / 2 - midY * scale

        var t = zoomIdentity
            .translate(this.absTransformX, this.absTransformY)
            .scale(scale)
        this.svg
            .transition()
            .duration(animDuration)
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

    private neighborLinks(node: NodeWrapper, links: Array<Link>): Array<Link> {
        var neighbors = new Array<Link>()

        for (let link of links) {
            if (link.source.id === node.wrapped.id || link.target.id === node.wrapped.id) {
                neighbors.push(link)
            }
        }

        return neighbors
    }

    private showNode(node: Node) {
        var nodes = new Array<Node>()

        var parent = node.parent
        while (parent) {
            if (!parent.state.expanded) {
                nodes.push(parent)
            }
            parent = parent.parent
        }

        nodes.reverse().forEach(node => {
            var d = this.d3nodes.get(node.id)
            if (d) {
                this.expand(d.data)
            }
        })
    }

    pinNode(node: Node, active) {
        this.showNode(node)

        var d = this.d3nodes.get(node.id)
        if (!d) {
            return false
        }

        select("#node-pinned-" + node.id)
            .style("opacity", active ? 1 : 0)

        var scale = 0.8
        var viewSize = this.viewSize()

        var t = zoomIdentity
            .translate(viewSize.width / 2 - scale * d.x, viewSize.height / 2 - scale * d.y)
            .scale(scale)
        this.svg
            .transition()
            .duration(800)
            .call(this.zoom.transform, t)
    }

    unpinNodes() {
        selectAll("g.node-pinned").style("opacity", 0)
    }

    private isLinkNodeSelected(link: Link): boolean {
        return link.source.state.selected || link.target.state.selected
    }

    private isLinkNodeMouseOver(link: Link): boolean {
        return link.source.state.mouseover || link.target.state.mouseover
    }

    private highlightNeighborLinks(d: D3Node, active: boolean) {
        var opacity = active ? 1 : 0

        var links = this.neighborLinks(d.data, this.visibleLinks())
        for (let link of links) {
            if (active || !this.isLinkNodeSelected(link)) {
                select("#link-" + link.id)
                    .style("opacity", opacity)
                select("#link-overlay-" + link.id)
                    .style("opacity", opacity)
            }
        }
    }

    private overNode(id: string, active: boolean) {
        var d = this.d3nodes.get(id)
        if (!d) {
            return false
        }
        d.data.wrapped.state.mouseover = active

        var opacity = active ? 1 : 0

        select("#node-overlay-" + id)
            .style("opacity", opacity)

        if (!d.data.wrapped.state.selected) {
            this.highlightNeighborLinks(d, active)
        }
    }

    private isLinkVisible(link: Link) {
        return link.tags.some(tag => (this.linkTagStates.get(tag) === LinkTagState.Visible) ||
            this.linkTagStates.get(tag) === LinkTagState.EventBased &&
            (link.source.state.selected || link.target.state.selected ||
                link.source.state.mouseover || link.target.state.mouseover))
    }

    private searchMetadata(data: any, values: Map<any, boolean>, remaining: number): boolean {
        for (let key in data) {
            if (typeof data[key] === "object") {
                if (this.searchMetadata(data[key], values, remaining)) {
                    return true
                }
            } else {
                let expected = data[key]
                for (const [key, value] of values.entries()) {
                    if (key === expected && !value) {
                        values.set(key, true)
                        remaining--
                    }

                    if (!remaining) {
                        return true
                    }
                }
            }
        }

        return false
    }

    searchNodes(values: Array<any>): Array<Node> {
        var vm = new Map<any, boolean>()

        var nodes = new Array<Node>()
        Array.from(this.nodes.values()).forEach(node => {
            // reset state of each value
            values.forEach(value => vm.set(value, false))

            if (this.searchMetadata(node.data, vm, values.length)) {
                nodes.push(node)
            }
        })

        return nodes
    }

    private showLevelLabel(d: LevelRect) {
        var label = select("#level-label-" + d.weight)
        label
            .attr("transform", `translate(${-this.absTransformX},${d.bb.y + 2})`)
            .select("rect")
            .attr("height", d.bb.height - 4)

        var text = label.select("text")
            .attr("style", "")
        var element = text.node()
        if (element) {
            text
                .attr("dy", (d.bb.height - element.getComputedTextLength()) / 2)
                .attr("style", "writing-mode: tb; glyph-orientation-vertical: 0")
        }
        label.transition()
            .duration(animDuration)
            .style("opacity", 1)
    }

    private hideAllLevelLabels() {
        this.gLevelLabels.selectAll('g.level-label')
            .style("opacity", 0)
            .interrupt()
    }

    private showAllLevelLabels() {
        selectAll("g.level-label").each((d: LevelRect) => this.showLevelLabel(d))
    }

    private groupBB(node: NodeWrapper): BoundingBox | null {
        var d3nodes = new Array<D3Node>()

        if (node.wrapped.state.expanded) {
            node.wrapped.children.forEach(child => {
                let d3node = this.d3nodes.get(child.id)
                if (d3node) {
                    d3nodes.push(d3node)
                }
            })
        } else {
            let d3node = this.d3nodes.get(node.id)
            if (d3node) {
                d3nodes.push(d3node)
            }
        }

        return this.nodesBB(d3nodes)
    }

    private renderLevels() {
        var self = this

        if (this.invalidated) {
            this.updateLevelRects(this.levelNodes())
        }

        var levelLabel = this.gLevelLabels.selectAll('g.level-label')
            .interrupt()
            .data(this.levelRects, (d: LevelRect) => "level-label-" + d.weight)
        var levelLabelEnter = levelLabel.enter()
            .append("g")
            .attr("id", (d: LevelRect) => "level-label-" + d.weight)
            .attr("class", "level-label")
            .style("opacity", 0)
            .attr("transform", (d: LevelRect) => `translate(${-self.absTransformX},${d.bb.y})`)
        levelLabelEnter.append("rect")
            .attr("width", 40)
            .attr("height", (d: LevelRect) => d.bb.height)
        levelLabelEnter.append("text")
            .attr("font-size", 26)
            .attr("dx", 18)
            .text((d: LevelRect) => self.weightTitles.get(d.weight) || 'Level ' + d.weight)
        levelLabel.exit().remove()

        var level = this.gLevels.selectAll('g.level')
            .data(this.levelRects, (d: LevelRect) => "level-" + d.weight)
            .interrupt()
        var levelEnter = level.enter()
            .append('g')
            .attr("id", (d: LevelRect) => "level-" + d.weight)
            .attr("class", "level")
            .style("opacity", 0)
            .attr("transform", (d: LevelRect) => `translate(${d.bb.x},${d.bb.y})`)

        levelEnter.append("rect")
            .attr("id", (d: LevelRect) => "level-zone-" + d.weight)
            .attr("class", "level-zone")
            .attr("width", (d: LevelRect) => d.bb.width)
            .attr("height", (d: LevelRect) => d.bb.height)
        level.exit().remove()

        levelEnter.transition()
            .duration(animDuration)
            .style("opacity", 1)
            .on('end', d => this.showLevelLabel(d))

        level.transition()
            .duration(animDuration)
            .style("opacity", 1)
            .on('end', d => this.showLevelLabel(d))
            .attr("transform", (d: LevelRect) => `translate(${d.bb.x},${d.bb.y})`)
            .select('rect.level-zone')
            .attr("height", (d: LevelRect) => d.bb.height)
    }

    private renderHieraLinks(root: any) {
        const hieraLinker = linkVertical()
            .x(d => d.x)
            .y(d => d.y)

        var hieraLink = this.gHieraLinks.selectAll('path.hiera-link')
            .data(root.links(), (d: any) => d.source.data.id + d.target.data.id)
            .interrupt()
        var hieraLinkEnter = hieraLink.enter()
            .filter((d: any) => d.target.data.parent.wrapped !== this.root)
            .append('path')
            .attr("class", "hiera-link")
            .style("opacity", 0)
            .attr("d", hieraLinker)
        hieraLink.exit().remove()

        hieraLinkEnter.transition()
            .duration(animDuration)
            .style("opacity", 1)

        hieraLink.transition()
            .duration(animDuration)
            .attr("d", hieraLinker)
            .style("opacity", 1)
    }

    private renderGroups() {
        var self = this

        var group = this.gGroups.selectAll('g.group')
            .interrupt()
            .data(Array.from(this.groups.values()), (d: NodeWrapper) => d.id)
        var groupEnter = group.enter()
            .append("g")
            .attr("class", "group")
            .attr("id", (d: Group) => d.id)
            .style("opacity", 0)
        group.exit().remove()

        const groupRect = function (rect: any, d: NodeWrapper, animated: boolean) {
            var bb = self.groupBB(d)
            if (!bb) {
                return
            }

            if (animated) {
                rect = rect.transition()
                    .duration(animDuration)
            }

            rect
                .attr("x", bb.x)
                .attr("y", bb.y + 50)
                .attr("width", bb.width)
                .attr("height", bb.height - 55)
        }

        groupEnter.transition()
            .duration(animDuration)
            .style("opacity", 1)

        groupEnter.append("rect")
            //.attr("rx", 10)
            //.attr("ry", 10)
            .each(function (d: NodeWrapper) { groupRect(select(this), d, false) })

        group.selectAll("rect")
            .each(function (d: NodeWrapper) { groupRect(select(this), d, true) })

        group.transition()
            .duration(animDuration)
            .style("opacity", 1)
    }

    private renderNodes(root: any) {
        var node = this.gNodes.selectAll('g.node')
            .interrupt()
            .data(root.descendants(), (d: D3Node) => d.data.id)

        const nodeClass = (d: D3Node) => new Array<string>().concat("node",
            this.props.nodeAttrs(d.data.wrapped).classes,
            d.data.wrapped.state.selected ? "node-selected" : "").join(" ")

        var nodeEnter = node.enter()
            .filter((d: D3Node) => d.data.type !== WrapperType.Hidden && d.data.wrapped !== this.root)
            .append("g")
            .attr("id", (d: D3Node) => "node-" + d.data.id)
            .attr("class", nodeClass)
            .style("opacity", 0)
            .attr("transform", (d: D3Node) => `translate(${d.x},${d.y})`)
            .on("dblclick", (d: D3Node) => this.nodeDoubleClicked(d))
            .on("click", (d: D3Node) => this.nodeClicked(d))
            .on("contextmenu", (d: D3Node) => {
                event.preventDefault()
                this.showNodeContextMenu(d)
            })
            .on("mouseover", (d: D3Node) => {
                this.overNode(d.data.id, true)
            })
            .on("mouseout", (d: D3Node) => {
                this.overNode(d.data.id, false)
            })
        node.exit()
            .transition()
            .duration(animDuration).style("opacity", 0)
            .remove()

        nodeEnter.transition()
            .duration(animDuration)
            .style("opacity", 1)

        const hexSize = 30

        nodeEnter.append("circle")
            .attr("id", (d: D3Node) => "node-overlay-" + d.data.id)
            .attr("class", "node-overlay")
            .attr("r", hexSize + 16)
            .style("opacity", 0)

        var highlight = nodeEnter.append("g")
            .attr("id", (d: D3Node) => "node-pinned-" + d.data.id)
            .attr("class", "node-pinned")
            .style("opacity", 0)
        highlight.append("circle")
            .attr("r", hexSize + 16)
        highlight.append("text")
            .text("\uf3c5")
            .attr("dy", -60)

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
            .attr("dy", 9)
            .text((d: D3Node) => this.props.nodeAttrs(d.data.wrapped).icon)

        var wrapText = (text, lineHeight, width) => {
            text.each(function () {
                var text = select(this)
                var y = text.attr("y")
                var dy = parseFloat(text.attr("dy"))
                var words = text.text().match(/.{1,10}/g).reverse()
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

                        if (line.length) {
                            tspan.text(line.join(""))
                            line = [word]
                            tspan = text.append("tspan")
                                .attr("x", 0)
                                .attr("y", y)
                                .attr("dy", ++lineNumber * lineHeight + dy + "em")
                                .text(word)
                        }
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
            .duration(animDuration)
            .style("opacity", 1)
            .attr("transform", (d: D3Node) => `translate(${d.x},${d.y})`)
            .attr("class", nodeClass)
    }

    private renderLinks() {
        const vLinker = linkVertical()
            .x((d: any) => {
                let node = this.d3nodes.get(d.node.id)
                return node ? node.x + d.dx : d.dx
            })
            .y((d: any) => {
                let node = this.d3nodes.get(d.node.id)
                return node ? node.y + d.dy : d.y
            })

        const hLinker = (d: any) => {
            var source = this.d3nodes.get(d.source.node.id)
            var target = this.d3nodes.get(d.target.node.id)

            if (!source || !target) {
                return []
            }

            var x1 = source.x + d.source.dx
            var x2 = target.x + d.target.dx
            var y = source.y + d.source.dy

            if (Math.abs(x1 - x2) > this.nodeWidth) {
                var points = [
                    { x: x1, y: y + 10 },
                    { x: (x1 + x2) / 2, y: y + 40 },
                    { x: x2, y: y + 10 }
                ]
            } else {
                var points = [
                    { x: x1, y: y },
                    { x: x2, y: y }
                ]
            }

            const liner = line()
                .x(d => d.x)
                .y(d => d.y)
                .curve(curveCatmullRom.alpha(0.5))

            return liner(points)
        }

        var wrapperLink = (d, margin) => {
            var dSource = this.d3nodes.get(d.source.id)
            var dTarget = this.d3nodes.get(d.target.id)

            if (!dSource || !dTarget) {
                return
            }

            if (dSource.y === dTarget.y) {
                if (dSource.x < dTarget.x) {
                    return hLinker({ source: { node: d.source, dx: margin, dy: 0 }, target: { node: d.target, dx: -margin, dy: 0 } })
                }
                return hLinker({ source: { node: d.source, dx: -margin, dy: 0 }, target: { node: d.target, dx: margin, dy: 0 } })
            }

            if (dSource.y < dTarget.y) {
                return vLinker({ source: { node: d.source, dx: 0, dy: margin }, target: { node: d.target, dx: 0, dy: -margin } })
            }

            return vLinker({ source: { node: d.source, dx: 0, dy: -margin }, target: { node: d.target, dx: 0, dy: margin } })
        }
        const linker = (d: Link) => wrapperLink(d, 55)

        var visibleLinks = this.visibleLinks()

        var linkOverlay = this.gLinkOverlays.selectAll('path.link-overlay')
            .interrupt()
            .data(visibleLinks, (d: Link) => d.id)
        var linkOverlayEnter = linkOverlay.enter()
            .append('path')
            .attr("id", (d: Link) => "link-overlay-" + d.id)
            .attr("class", "link-overlay")
            .style("opacity", 0)
        linkOverlay.exit().remove()

        linkOverlay = linkOverlay.merge(linkOverlayEnter)
        linkOverlay.transition()
            .duration(animDuration)
            .style("opacity", (d: Link) => this.isLinkNodeSelected(d) || this.isLinkNodeMouseOver(d) ? 1 : 0)
            .attr("d", (d: Link) => linker(d))

        var link = this.gLinks.selectAll('path.link')
            .interrupt()
            .data(visibleLinks, (d: Link) => d.id)
        var linkEnter = link.enter()
            .append('path')
            .attr("id", (d: Link) => "link-" + d.id)
            .attr("class", (d: Link) => "link " + this.props.linkAttrs(d).classes.join(" ") + (d.directed ? " directed" : ""))
            .style("opacity", 0)
        link.exit().remove()

        link = link.merge(linkEnter)
        link.transition()
            .duration(animDuration)
            .style("opacity", (d: Link) => this.isLinkVisible(d) ? 1 : 0)
            .attr("d", d => linker(d))

        var linkWrap = this.gLinkWraps.selectAll('path.link-wrap')
            .interrupt()
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
            .on("mouseout", (d: Link) => {
                if (!d.source.state.selected && !d.target.state.selected) {
                    select("#link-overlay-" + d.id)
                        .style("opacity", 0)
                }
            })
        linkWrap.exit().remove()

        linkWrap = linkWrap.merge(linkWrapEnter)
        linkWrap.transition()
            .duration(animDuration)
            .attr("d", d => linker(d))
    }

    renderTree() {
        var self = this

        var normRoot = this.normalizeTree(this.root)

        var root = hierarchy(normRoot)
        this.tree(root)

        // update d3nodes cache
        this.d3nodes = new Map<string, D3Node>()
        root.each(node => {
            this.d3nodes.set(node.data.id, node)
        })

        this.renderLevels()
        this.renderHieraLinks(root)
        this.renderGroups()
        this.renderNodes(root)
        this.renderLinks()

        this.invalidated = false
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