import React, { Component } from 'react'
import { hierarchy, tree } from 'd3-hierarchy'
import { select } from 'd3-selection'
import { linkVertical } from 'd3-shape'


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
            data: {
                name: "root"
            },
            layer: 0,
            children: []
        }

        var layerDepth = (node, layer, currDepth) => {
            if (node.layer > layer) {
                return 0
            }

            var maxDepth = currDepth
            if (node.children) {
                for (let child of node.children) {
                    let depth = layerDepth(child, layer, currDepth + 1)
                    if (depth >= maxDepth) {
                        maxDepth = depth
                    }
                }
            }

            return maxDepth
        }

        var normalizeTreeDepth = (root, node, layer, currDepth) => {
            if (node.layer && node.layer > layer) {
                return
            }

            if (node.layer > 0 && node.layer === layer && node.parent && node.parent.layer !== layer) {
                var parentDepth = layerDepth(root, node.layer - 1, 0)
               
                var children =  node.parent.children
                var index = children.indexOf(node)

                while(currDepth <= parentDepth) {
                    node = {children: [node]}
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

        var addChild = (parent, data, layer) => {
            if (layer > maxLayer) {
                maxLayer = layer
            }

            var child = {parent: parent, layer: layer, data: data, children: []}
            parent.children.push(child)

            if (layer !== parent.layer) {
                for (let i = 0; i <= maxLayer; i++) {
                    normalizeTreeDepth(treeRoot, treeRoot, i, 0)
                }
            }
            return child
        }

        var host = addChild(treeRoot, {name: "host 1"}, 1)
        addChild(host, {name: "lo"}, 1)
        addChild(host, {name: "eth0"}, 1)
        addChild(host, {name: "br-int"}, 1)

        var br = addChild(host, {name: "br-int"}, 2)
        addChild(br, {name: "port1"}, 2)
        addChild(br, {name: "port2"}, 2)
        addChild(br, {name: "port3"}, 2)

       var ns1 = addChild(host, {name: "ns1"}, 3)
        addChild(ns1, {name: "lo"}, 3)
        addChild(ns1, {name: "eth0"}, 3)

        var ns2 = addChild(host, {name: "ns2"}, 3)
        addChild(ns2, {name: "lo"}, 3)
        addChild(ns2, {name: "eth0"}, 3)

        var root = hierarchy(treeRoot);
        this.tree(root)



        console.log(treeRoot)

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

        var i = 0

        var link = gLinks.selectAll('g.link')
            .data(root.links(), function (d) { return d.id || (d.id = ++i) })
        link.enter()
            .append('path')
            .attr("d", linkVertical()
            .x(d => d.x)
            .y(d => d.y))

        var node = gNodes.selectAll('g.node')
            .data(root.descendants(), function (d) { return d.id || (d.id = ++i) })
        var nodeEnter = node.enter()
            .filter(function (d) { return d.data.data })
            .append('g')
            .attr('class', 'node')
            .attr("transform", d =>`translate(${d.x},${d.y})`)

        nodeEnter.append("circle")
            .attr("fill", d => d.children ? "#555" : "#999")
            .attr("r", 2.5)

        nodeEnter.append("text")
            .attr("dy", ".35em")
            .attr("y", function (d) { return d.children ? -20 : 20 })
            .style("text-anchor", "middle")
            .text(function (d) {
                return d.data.data ? d.data.data.name : ""
            })
    }

    render() {
        return (
            <svg ref={node => this.node = node} width={1200} height={1200}></svg>
        )
    }
}