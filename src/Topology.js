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
        var treeRoot = {
            id: "root",
            data: {
                name: "root"
            },
            state: {
                expanded: true
            },
            layer: 0,
            children: []
        }

        // return depth of the given layer
        var layerDepth = (node, layer, currDepth) => {
            if (node.layer > layer) {
                return 0
            }

            var maxDepth = currDepth
            if (node.children) {
                for (let child of node.children) {
                    let depth = layerDepth(child, layer, currDepth + 1)
                    if (depth > maxDepth) {
                        maxDepth = depth
                    }
                }
            }

            return maxDepth
        }

        var clone = (node, parent) => {
            var cloned = {id: node.id, orig: node, layer: node.layer}
            if (parent) {
                cloned.parent = parent
            }

            if (node.children) {  
                cloned.children = []
            }

            for (let child of node.children) {
                if (node.state.expanded) {
                    cloned.children.push(clone(child, cloned))
                }
            }
            return cloned
        }

        // re-order tree to add placeholder node in order to separate layers
        var normalizeTreeDepth = (root, node, layer, currDepth) => {
            if (node.layer && node.layer > layer) {
                return
            }

            if (node.layer > 0 && node.layer === layer && node.parent && node.parent.layer !== layer) {
                var parentDepth = layerDepth(root, node.layer - 1, 0)

                var children =  node.parent.children
                var index = children.indexOf(node)

                while(currDepth <= parentDepth) {
                    node = {id: node.id + "-" + currDepth, parent: node.parent, orig: node, children: [node]}
                    currDepth++
                }
                children[index] = node
                
                return
            }

            if (node.children) {
               for (let child of node.children) {
                   if (child.layer <= layer) {
                       normalizeTreeDepth(root, child, layer, currDepth + 1)
                   }
               }
            }
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
                state: {
                    expanded: true
                }, 
                children: []
            }
            parent.children.push(child)
            return child
        }

        var svg = select(this.node);

        var g = svg
            .call(zoom()
                .scaleExtent([0.05, 3])
                .on("zoom", () => g.attr("transform", event.transform.toString()) ))
            .append("g")

        var gLayers = g.append("g")
            .attr("class", "layers")

        var gLinks = g.append("g")
            .attr("class", "links")
            .attr("fill", "none")
            .attr("stroke", "#555")
            .attr("stroke-opacity", 0.4)
            .attr("stroke-width", 1.5)

        var gNodes = g.append("g")
            .attr("class", "nodes")

        var expand = function(d) {
            select(this).select("text").text(() => {
                if (d.data.orig.state.expanded) {
                    return "\uf067"
                }
                return "\uf068"
            })

            if (d.data.orig.state.expanded) {
                d.data.orig.state.expanded = false
            } else {
                d.data.orig.state.expanded = true
            }

            update();
        }

        var update = () => {
            let normTreeRoot = clone(treeRoot)
            for (let i = 0; i <= maxLayer; i++) {
                normalizeTreeDepth(normTreeRoot, normTreeRoot, i, 0)
            }

            let root = hierarchy(normTreeRoot);
            this.tree(root)

            var link = gLinks.selectAll('path.link')
                .data(root.links(), d => d.source.data.id + d.target.data.id)
            var linkEnter = link.enter()
                .append('path')
                .attr("class", "link")
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
                .filter(d => d.data.orig.data)
                .append("g")
                .attr("class", "node")
                .style("opacity", 0)
                .attr("transform", d => `translate(${d.x},${d.y})`)

            nodeEnter.transition()
                .duration(500)
                .style("opacity", 1)

            const hexSize = 20

            var hexagon = (d, size) => {
                var s32 = (Math.sqrt(3)/2)

                if (!size) {
                    size = 20
                }

                return [
                    {"x": size, "y": 0},
                    {"x": size / 2, "y": size * s32},
                    {"x": -size / 2, "y": size * s32},
                    {"x": -size, "y": 0},
                    {"x": -size / 2, "y": -size * s32},
                    {"x": size / 2, "y": -size * s32}
                ]
            }

            var liner = line()
                .x(d =>  d.x)
                .y(d =>  d.y)
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
                .text(d => d.data.orig.data ? d.data.orig.data.name : "")

            var exco = nodeEnter.append("g")
            exco.on("click", expand);

            exco.append("circle")
                .attr("class", "collapse")
                .attr("cx", hexSize - 5)
                .attr("cy", hexSize - 5)
                .attr("r", d => d.data.orig.children.length ? 7 : 0)
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
                .text(d => d.data.orig.state.expanded ? "\uf068" : "\uf067")

            node.transition()
                .duration(500)
                .style("opacity", 1)
                .attr("transform", d => `translate(${d.x},${d.y})`)
            }    

        var i = 0;

        setInterval(() => {
            if (i > 1) {
                return
            }
            i++

            var host = addChild(treeRoot, "host-" + i, {name: "host " + i}, 1)
            addChild(host, "host-lo-" + i, {name: "lo"}, 1)
            addChild(host, "host-ethO-" + i, {name: "eth0"}, 1)
            addChild(host, "host-br-int-" + i, {name: "br-int"}, 1)

            var br = addChild(host, "br-int-" + i, {name: "br-int"}, 2)
            addChild(br, "port1-" + i, {name: "port1"}, 2)
            addChild(br, "port2-" + i, {name: "port2"}, 2)
            addChild(br, "port3-" + i, {name: "port3"}, 2)

            var ns1 = addChild(host, "ns1-" + i, {name: "ns1"}, 3)
            addChild(ns1, "ns1-lo-" + i, {name: "lo"}, 3)
            addChild(ns1, "ns1-eth0-" + i, {name: "eth0"}, 3)

            var ns2 = addChild(host, "ns2-" + i, {name: "ns2"}, 3)
            addChild(ns2, "ns2-lo-" + i, {name: "lo"}, 3)
            addChild(ns2, "ns2-eth0-0" + i, {name: "eth0"}, 3)

            update(null, true)
        }, 200)
    }

    render() {
        return (
            <svg ref={node => this.node = node} width={1200} height={1200}></svg>
        )
    }
}