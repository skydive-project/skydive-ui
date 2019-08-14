import React, { Component } from 'react';
import { TopologyComponent } from './Topology';
import './App.css';

const data = require('./dump.json');

class App extends Component {

  componentDidMount() {
    this.parseTopology(data)
  }

  parseTopology(data) {
    // first add all the nodes
    for (let node of data.Nodes) {
      let n = this.tc.addNode(node.ID, node.Metadata)
      this.tc.setParent(n, this.tc.root, this.nodeLayerWeight)
    }

    // then add ownership links
    for (let edge of data.Edges) {
      if (edge.Metadata.RelationType === "ownership") {
        let parent = this.tc.nodes[edge.Parent]
        let child = this.tc.nodes[edge.Child]

        this.tc.setParent(child, parent, this.nodeLayerWeight)
      }
    }

    // finally add remaining links
    // then add ownership links
    for (let edge of data.Edges) {
      if (edge.Metadata.RelationType !== "ownership") {
        let parent = this.tc.nodes[edge.Parent]
        let child = this.tc.nodes[edge.Child]

        this.tc.addLayerLink(child, parent, edge.Metadata)
      }
    }

    this.tc.renderTree()

    this.tc.zoomFit()

    /*for (let node of data.Nodes) {
        this.highlightNode(node.ID, true)
    }*/
  }

  nodeAttrs(node) {
    switch (node.data.Type) {
      case "host":
        return { class: node.data.Type, name: node.data.Name, icon: "\uf109" }
      case "bridge":
      case "ovsbridge":
        return { class: node.data.Type, name: node.data.Name, icon: "\uf1e0" }
      case "interface":
      case "device":
      case "veth":
      case "tun":
      case "tap":
        return { class: node.data.Type, name: node.data.Name, icon: "\uf120" }
      case "port":
      case "ovsport":
        return { class: node.data.Type, name: node.data.Name, icon: "\uf0e8" }
      case "netns":
        return { class: node.data.Type, name: node.data.Name, icon: "\uf24d" }
      default:
        return { class: node.data.Type, name: node.data.Name, icon: "\uf192" }
    }
  }

  linkAttrs(link) {
    return { class: link.RelationType || "" }
  }

  onNodeSelected(node) {
    console.log(node)
  }

  nodeLayerWeight(node) {
    switch (node.data.Type) {
      case "host":
        return 3
      case "bridge":
      case "ovsbridge":
        return 4
      case "netns":
        return 8
      default:
    }

    if (node.data.OfPort) {
      return 5
    }

    return node.parent ? node.parent.layerWeight : 1
  }

  sortNodesFnc(a, b) {
    return a.data.Name.localeCompare(b.data.Name)
  }

  render() {
    return (
      <div className="App">
        <TopologyComponent ref={node => this.tc = node} nodeAttrs={this.nodeAttrs} nodeLayerWeight={this.nodeLayerWeight} linkAttrs={this.linkAttrs}
          onNodeSelected={this.onNodeSelected} sortNodesFnc={this.sortNodesFnc}/>
      </div>
    );
  }
}

export default App;
