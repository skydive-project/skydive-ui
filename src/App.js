import React, { Component } from 'react';
import { TopologyComponent } from './Topology';
import './App.css';

class App extends Component {

  constructor(props) {
    super(props)
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

  render() {
    return (
      <div className="App">
        <TopologyComponent nodeAttrs={this.nodeAttrs} nodeLayerWeight={this.nodeLayerWeight} linkAttrs={this.linkAttrs} 
          onNodeSelected={this.onNodeSelected}/>
      </div>
    );
  }
}

export default App;
