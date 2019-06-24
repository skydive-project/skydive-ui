import React, { Component } from 'react'
import { hierarchy, tree } from 'd3-hierarchy'
import { select } from 'd3-selection'
import { linkVertical } from 'd3-shape'
import { } from 'd3-transition'


export class TopologyComponent extends Component {
    constructor(props) {
        super(props)

        this.margin = { top: 40, right: 90, bottom: 50, left: 390 }

        var width = 1200 - this.margin.left - this.margin.right
        var height = 1200 - this.margin.top - this.margin.bottom

        this.tree = tree().size([width, height]).nodeSize([60, 60])
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
            var cloned = {id: node.id, data: node.data, layer: node.layer, children: []}
            if (parent) {
                cloned.parent = parent
            }

            for (let child of node.children) {
                cloned.children.push(clone(child, cloned))
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
                    node = {id: node.id + "-" + currDepth, parent: node.parent, children: [node]}
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

            var child = {id: id, parent: parent, layer: layer, data: data, children: []}
            parent.children.push(child)
            return child
        }

        var g = select(this.node)
            .append("g")

        var gNodes = g.append("g")
            .attr("class", "nodes")
            .attr("transform",
                "translate(" + this.margin.left + "," + this.margin.top + ")")

        var gLinks = g.append("g")
            .attr("class", "links")
            .attr("fill", "none")
            .attr("stroke", "#555")
            .attr("stroke-opacity", 0.4)
            .attr("stroke-width", 1.5)
            .attr("transform",
                "translate(" + this.margin.left + "," + this.margin.top + ")")

        var i = 0;

        setInterval(() => {
            if (i > 2) {
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

            var normTreeRoot = clone(treeRoot)
            for (let i = 0; i <= maxLayer; i++) {
                normalizeTreeDepth(normTreeRoot, normTreeRoot, i, 0)
            }

            var root = hierarchy(normTreeRoot);
            this.tree(root)

            var link = gLinks.selectAll('path.link')
                .data(root.links(), d => { return d.source.data.id + d.target.data.id })
            link.enter()
                .append('path')
                .attr("class", "link")
                .attr("d", linkVertical()
                .x(d => d.x)
                .y(d => d.y))
            link.exit().remove()

            link.transition()
                .duration(500)
                .attr("d", linkVertical()
                    .x(d => d.x)
                    .y(d => d.y))

            var node = gNodes.selectAll('g.node')
                .data(root.descendants(), d =>{ return d.data.id })
            node.exit().remove()

            var nodeEnter = node.enter()
                .filter(function (d) { return d.data.data })
                .append("g")
                .attr("class", "node")
                .attr("transform", d => `translate(${d.x},${d.y})`)

            nodeEnter.append("circle")
                .attr("fill", d => d.children ? "#555" : "#999")
                .attr("r", 2.5)

            nodeEnter.append("text")
                .attr("dy", ".35em")
                .attr("y", d => { return d.children ? -20 : 20 })
                .style("text-anchor", "middle")
                .text(d => { return d.data.data ? d.data.data.name : "" })

            node.transition()
                .duration(500)
                .attr("transform", d => `translate(${d.x},${d.y})`)
        }, 1000)
    }

    render() {
        return (
            <svg ref={node => this.node = node} width={1200} height={1200}></svg>
        )
    }
}