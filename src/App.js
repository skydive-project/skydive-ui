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
import Websocket from 'react-websocket'
import { TopologyComponent } from './Topology'
import './App.css'

const data = require('./dump.json')

class App extends Component {

  constructor(props) {
    super(props)

    this.state = {
      isContextMenuOn: "none",
      contextMenuX: 0,
      contextMenuY: 0
    }

    this.synced = false

    this.onShowNodeContextMenu = this.onShowNodeContextMenu.bind(this)
    this.onOpen = this.onOpen.bind(this)
    this.onMessage = this.onMessage.bind(this)
  }

  componentDidMount() {
    //this.parseTopology(data)
  }

  parseTopology(data) {
    // first add all the nodes
    for (let node of data.Nodes) {

      // ignore Type ofrule
      if (node.Metadata.Type === "ofrule") {
        continue
      }

      let n = this.tc.addNode(node.ID, node.Metadata)
      this.tc.setParent(n, this.tc.root, this.nodeLayerWeight)
    }

    // then add ownership links
    for (let edge of data.Edges) {
      if (edge.Metadata.RelationType === "ownership") {
        let parent = this.tc.nodes[edge.Parent]
        let child = this.tc.nodes[edge.Child]

        if (parent && child) {
          this.tc.setParent(child, parent, this.nodeLayerWeight)
        }
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
    var classes = [node.data.Type]
    if (node.data.State) {
      classes.push(node.data.State.toLowerCase())
    }

    switch (node.data.Type) {
      case "host":
        return { class: classes.join(" "), name: node.data.Name, icon: "\uf109" }
      case "bridge":
      case "ovsbridge":
        return { class: classes.join(" "), name: node.data.Name, icon: "\uf1e0" }
      case "interface":
      case "device":
      case "veth":
      case "tun":
      case "tap":
        return { class: classes.join(" "), name: node.data.Name, icon: "\uf120" }
      case "port":
      case "ovsport":
        return { class: classes.join(" "), name: node.data.Name, icon: "\uf0e8" }
      case "netns":
        return { class: classes.join(" "), name: node.data.Name, icon: "\uf24d" }
      default:
        return { class: classes.join(" "), name: node.data.Name, icon: "\uf192" }
    }
  }

  linkAttrs(link) {
    return { class: link.RelationType || "" }
  }

  onNodeSelected(node) {

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
    if (!a.data.Name) {
      console.log(a.data)
    }
    return a.data.Name.localeCompare(b.data.Name)
  }

  onShowNodeContextMenu(node) {
    return [
      { class: "", text: "Capture", disabled: false, callback: () => { console.log("Capture") } },
      { class: "", text: "Capture all", disabled: true, callback: () => { console.log("Capture all") } },
      { class: "", text: "Injection", disabled: false, callback: () => { console.log("Injection") } },
      { class: "", text: "Flows", disabled: false, callback: () => { console.log("Flows") } }
    ]
  }

  onMessage(msg) {
    var data = JSON.parse(msg)
    switch (data.Type) {
      case "SyncReply":
        this.parseTopology(data.Obj)
        this.synced = true
    }
  }

  onClose() {
    this.synced = false
  }

  sendMessage(data) {
    this.websocket.sendMessage(JSON.stringify(data))
  }

  sync() {
    var msg = { "Namespace": "Graph", "Type": "SyncRequest", "Obj": null }
    this.sendMessage(msg)
  }

  onOpen() {
    this.sync()
  }

  render() {
    return (
      <div className="App">
        <Websocket ref={node => this.websocket = node} url="ws://localhost:8082/ws/subscriber?x-client-type=webui" onOpen={this.onOpen}
          onMessage={this.onMessage} onClose={this.onClose} />
        <TopologyComponent ref={node => this.tc = node} nodeAttrs={this.nodeAttrs} nodeLayerWeight={this.nodeLayerWeight} linkAttrs={this.linkAttrs}
          onNodeSelected={this.onNodeSelected} sortNodesFnc={this.sortNodesFnc}
          onShowNodeContextMenu={this.onShowNodeContextMenu} />
      </div>
    )
  }
}

export default App
