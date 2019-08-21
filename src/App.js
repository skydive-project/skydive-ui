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
import clsx from 'clsx'
import Websocket from 'react-websocket'

import { withStyles } from '@material-ui/core/styles'
import CssBaseline from '@material-ui/core/CssBaseline'
import Drawer from '@material-ui/core/Drawer'
import AppBar from '@material-ui/core/AppBar'
import Toolbar from '@material-ui/core/Toolbar'
import IconButton from '@material-ui/core/IconButton'
import MenuIcon from '@material-ui/icons/Menu'
import Typography from '@material-ui/core/Typography'
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft'
import Divider from '@material-ui/core/Divider'
import List from '@material-ui/core/List'
import Container from '@material-ui/core/Container'
import Paper from '@material-ui/core/Paper'
import { withSnackbar } from 'notistack'

import JSONTree from 'react-json-tree'

import { Topology } from './Topology'
import { mainListItems, helpListItems } from './Menu'
import './App.css'
import logo from './Logo.png'

const data = require('./dump.json')

const styles = theme => ({
  app: {
    display: 'flex',
  },
  toolbar: {
    paddingRight: 24, // keep right padding when drawer closed
  },
  toolbarIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: '0 8px',
    ...theme.mixins.toolbar,
  },
  appBar: {
    backgroundColor: '#000',
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  appBarShift: {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  menuButton: {
    marginRight: 20,
  },
  menuButtonHidden: {
    display: 'none',
  },
  title: {
    textAlign: 'left',
    flexGrow: 1,
  },
  drawerPaper: {
    position: 'relative',
    whiteSpace: 'nowrap',
    width: drawerWidth,
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  drawerPaperClose: {
    overflowX: 'hidden',
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    width: theme.spacing(7),
    [theme.breakpoints.up('sm')]: {
      width: theme.spacing(0),
    },
  },
  appBarSpacer: theme.mixins.toolbar,
  content: {
    flexGrow: 1,
    height: '100vh',
    overflow: 'auto',
  },
  container: {
    paddingTop: theme.spacing(0),
    paddingBottom: theme.spacing(0),
    paddingLeft: theme.spacing(0),
    paddingRight: theme.spacing(0),
  },
  topology: {
    height: `calc(100vh - ${80}px)`,
  },
  panel: {
    position: 'absolute',
    top: 80,
    right: 15,
    bottom: 0,
    maxWidth: 'unset',
    width: 'unset',
    paddingTop: theme.spacing(0),
    paddingBottom: theme.spacing(0),
    paddingLeft: theme.spacing(0),
    paddingRight: theme.spacing(0),
  },
  panelPaper: {
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    width: 400,
    height: `calc(100% - ${20}px)`,
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    })
  },
  panelPaperClose: {
    overflow: 'hidden',
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    width: theme.spacing(7),
    [theme.breakpoints.up('sm')]: {
      width: theme.spacing(0),
    },
  },
  panelPaperFragment: {
    padding: theme.spacing(2),
  },
  jsonTree: {
    backgroundColor: 'unset'
  }
})

const drawerWidth = 300

class App extends Component {

  constructor(props) {
    super(props)

    this.state = {
      isContextMenuOn: "none",
      contextMenuX: 0,
      contextMenuY: 0,
      isNavOpen: false,
      info: {},
      overflow: 'hidden' // hack for info panel
    }

    this.synced = false

    this.onShowNodeContextMenu = this.onShowNodeContextMenu.bind(this)
    this.onOpen = this.onOpen.bind(this)
    this.onClose = this.onClose.bind(this)
    this.onMessage = this.onMessage.bind(this)
    this.onNodeSelected = this.onNodeSelected.bind(this)
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

    if (!data.Edges) {
      return
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

  onNodeSelected(node, active) {
    if (active) {
      this.setState({ info: { id: node.id, data: node.data } })

      // hack in order to restore overflow of panel after transition
      setTimeout(() => {
        this.setState({ overflow: 'auto' })
      }, 1000)
    } else {
      this.setState({ info: {}, overflow: 'hidden' })
    }
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
        if (!data.Obj.Nodes) {
          return
        }
        this.parseTopology(data.Obj)
        this.synced = true
      default:
        break
    }
  }

  onClose() {
    if (this.synced) {
      this.notify("Disconnected", "danger")
    } else {
      this.notify("Not connected", "danger")
    }

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
    this.notify("Connected", "info")
    this.sync()
    this.notify("Synchronized", "info")
  }

  notify(msg, variant) {
    this.props.enqueueSnackbar(msg, {
      variant: variant,
      autoHideDuration: 1000,
      anchorOrigin: {
        vertical: 'bottom',
        horizontal: 'right',
      }
    })
  }

  openDrawer() {
    this.setState({ isNavOpen: true })
  }

  closeDrawer() {
    this.setState({ isNavOpen: false })
  }

  render() {
    const { classes } = this.props

    return (
      <div className={classes.app}>
        <CssBaseline />
        <Websocket ref={node => this.websocket = node} url="ws://localhost:8082/ws/subscriber?x-client-type=webui" onOpen={this.onOpen}
          onMessage={this.onMessage} onClose={this.onClose} reconnectIntervalInMilliSeconds={2500} />
        <AppBar position="absolute" className={clsx(classes.appBar, this.state.isNavOpen && classes.appBarShift)}>
          <Toolbar className={classes.toolbar}>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="open drawer"
              onClick={() => this.openDrawer()}
              className={clsx(classes.menuButton, this.state.isNavOpen && classes.menuButtonHidden)}>
              <MenuIcon />
            </IconButton>
            <Typography component="h1" variant="h6" color="inherit" noWrap className={classes.title}>
              <img src={logo} alt="logo" />
            </Typography>
          </Toolbar>
        </AppBar>
        <Drawer
          variant="permanent"
          classes={{
            paper: clsx(classes.drawerPaper, !this.state.isNavOpen && classes.drawerPaperClose),
          }}
          open={this.state.isNavOpen}>
          <div className={classes.toolbarIcon}>
            <IconButton onClick={() => this.closeDrawer()}>
              <ChevronLeftIcon />
            </IconButton>
          </div>
          <Divider />
          <List>{mainListItems}</List>
          <Divider />
          <List>{helpListItems}</List>
        </Drawer>
        <main className={classes.content}>
          <div className={classes.appBarSpacer} />
          <Container maxWidth="xl" className={classes.container}>
            <Topology className={classes.topology} ref={node => this.tc = node} nodeAttrs={this.nodeAttrs} nodeLayerWeight={this.nodeLayerWeight} linkAttrs={this.linkAttrs}
              onNodeSelected={this.onNodeSelected} sortNodesFnc={this.sortNodesFnc}
              onShowNodeContextMenu={this.onShowNodeContextMenu} />
          </Container>
          <Container className={classes.panel}>
            <Paper className={clsx(classes.panelPaper, !this.state.info.id && classes.panelPaperClose)}>
              <div className={classes.panelPaperFragment} style={{ overflow: this.state.overflow }} >
                <Typography component="h6" color="primary" gutterBottom>
                  ID : {this.state.info.id}
                </Typography>
                {this.state.info.data &&
                  <JSONTree className={classes.jsonTree} data={this.state.info.data} theme="bright" invertTheme hideRoot sortObjectKeys />
                }
              </div>
            </Paper>
          </Container>
        </main>
      </div>
    )
  }
}

export default withStyles(styles)(withSnackbar(App))
