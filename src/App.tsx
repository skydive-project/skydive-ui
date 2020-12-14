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

import * as React from 'react'
import clsx from 'clsx'
import Websocket from 'react-websocket'
import { debounce } from 'throttle-debounce'

import { withStyles } from '@material-ui/core/styles'
import CssBaseline from '@material-ui/core/CssBaseline'
import Drawer from '@material-ui/core/Drawer'
import AppBar from '@material-ui/core/AppBar'
import Toolbar from '@material-ui/core/Toolbar'
import IconButton from '@material-ui/core/IconButton'
import Typography from '@material-ui/core/Typography'
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft'
import KeyboardArrowDown from '@material-ui/icons/KeyboardArrowDown'
import RemoveShoppingCartIcon from '@material-ui/icons/RemoveShoppingCart'
import Divider from '@material-ui/core/Divider'
import List from '@material-ui/core/List'
import Container from '@material-ui/core/Container'
import Paper from '@material-ui/core/Paper'
import Checkbox from '@material-ui/core/Checkbox'
import FormGroup from '@material-ui/core/FormGroup'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import { withSnackbar, WithSnackbarProps } from 'notistack'
import { connect } from 'react-redux'
import AccountCircle from '@material-ui/icons/AccountCircle'
import MenuIcon from '@material-ui/icons/Menu'
import MenuItem from '@material-ui/core/MenuItem'
import ListItemIcon from '@material-ui/core/ListItemIcon'
import Menu from '@material-ui/core/Menu'
import Fab from '@material-ui/core/Fab'
import Badge from '@material-ui/core/Badge'
import ListIcon from '@material-ui/icons/List'
import Button from '@material-ui/core/Button'

import { styles } from './AppStyles'
import { Topology, Node, NodeAttrs, LinkAttrs, LinkTagState, Link } from './Topology'
import { mainListItems, helpListItems } from './Menu'
import AutoCompleteInput from './AutoComplete'
import { AppState, selectElement, unselectElement, bumpRevision, session, closeSession } from './Store'
import { withRouter } from 'react-router-dom'
import SelectionPanel from './SelectionPanel'
import { Configuration } from './api/configuration'
import * as api from './api/api'
import Tools from './Tools'
import GremlinButton from './ActionButtons/Gremlin'
import CaptureButton from './ActionButtons/Capture'
import GremlinPanel from './DataPanels/Gremlin'
import CapturePanel from './DataPanels/Capture'
import FlowPanel from './DataPanels/Flow'

import './App.css'
import ConfigReducer, { Filter } from './Config'


// expose app ouside
declare global {
  interface Window {
    API: any,
    App: any,
    Tools: Tools
  }
}
window.API = api
window.Tools = Tools

interface Props extends WithSnackbarProps {
  classes: any
  configURL?: string
  dataURL?: string
  logo?: string

  selectElement: typeof selectElement
  unselectElement: typeof unselectElement
  selection: Array<Node | Link>
  bumpRevision: typeof bumpRevision
  session: session
  closeSession: typeof closeSession
  history: any
}

export interface WSContext {
  GremlinFilter: string | null
}

interface State {
  isContextMenuOn: string
  contextMenuX: number
  contextMenuY: number
  isNavOpen: boolean
  nodeTagStates: Map<string, boolean>
  linkTagStates: Map<string, LinkTagState>
  filters: Map<string, Filter>
  activeFilter: string
  suggestions: Array<string>
  anchorEl: Map<string, null | HTMLElement>
  isSelectionOpen: boolean
  wsContext: WSContext
  isGremlinPanelOpen: boolean
  isCapturePanelOpen: boolean
}

class App extends React.Component<Props, State> {

  tc: Topology | null
  websocket: Websocket | null
  synced: boolean
  state: State
  refreshTopology: any
  bumpRevision: typeof bumpRevision
  checkAuthID: number
  apiConf: Configuration
  wsContext: WSContext
  connected: boolean
  debSetState: (state: any) => void
  config: ConfigReducer

  constructor(props) {
    super(props)

    this.state = {
      isContextMenuOn: "none",
      contextMenuX: 0,
      contextMenuY: 0,
      isNavOpen: false,
      nodeTagStates: new Map<string, boolean>(),
      linkTagStates: new Map<string, LinkTagState>(),
      filters: new Map<string, Filter>(),
      suggestions: new Array<string>(),
      anchorEl: new Map<string, null | HTMLElement>(),
      isSelectionOpen: false,
      wsContext: { GremlinFilter: null },
      isGremlinPanelOpen: false,
      isCapturePanelOpen: false,
      activeFilter: ""
    }

    this.synced = false

    this.refreshTopology = debounce(300, this._refreshTopology.bind(this))

    // we will refresh info each 1s
    this.bumpRevision = debounce(1000, this.props.bumpRevision.bind(this))

    // debounce version of setState
    this.debSetState = debounce(200, this.setState.bind(this))

    // will handle multiple configuration files
    this.config = new ConfigReducer()
  }

  componentDidMount() {
    // make the application available globally
    window.App = this

    if (this.props.configURL) {
      this.config.appendURL("URL", this.props.configURL)
    }

    if (!this.props.dataURL) {
      this.checkAuthID = window.setInterval(() => {
        this.checkAuth()
      }, 2000)
    } else {
      this.loadStaticData(this.props.dataURL)
    }
  }

  componentWillUnmount() {
    if (this.checkAuthID) {
      window.clearInterval(this.checkAuthID)
    }
  }

  loadStaticData(url: string) {
    fetch(url).then(resp => {
      resp.json().then(data => {
        if (!Array.isArray(data)) {
          throw "topology schema error"
        }
        this.parseTopology(data[0])
      }).catch(() => {
        this.notify("Unable to load or parse topology data", "error")
      })
    })
  }

  /*appendConfig(id: string, url: string) {
    if (this.props.dataURL) {
      // load first the config and then the data
      var p = this.config.appendURL(id, url).then(() => {
        if (this.props.dataURL) {
          this.loadStaticData(this.props.dataURL)
        }
      })
    } else {
      var p = this.config.appendURL(id, url).then(() => {
        this.defaultFilter()
        this.sync()
      })
    }

    p.catch(() => {
      this.notify("Unable to load or parse extra config", "error")
    })
  }*/

  private defaultFilter() {
    var filter = this.config.defaultFilter()
    if (filter) {
      let filters = new Map<string, Filter>()
      filters.set(filter.id, filter)
      this.setState({ filters: filters, activeFilter: filter.id })

      filter.callback()
    }
  }

  private updateFilters(node: Node) {
    var updated: boolean = false

    for (let filter of this.config.filters(node)) {
      if (!this.state.filters.has(filter.id)) {
        this.state.filters.set(filter.id, filter)

        updated = true
      }
    }

    if (updated) {
      this.debSetState({ filters: this.state.filters })
    }
  }


  private updateSuggestions(node: Node, suggestions: Array<string>) {
    var updated: boolean = false

    for (let key of this.config.suggestions()) {
      try {
        var value = eval("node." + key)
        if (Array.isArray(value)) {
          for (let v of value) {
            if (!suggestions.includes(v)) {
              suggestions.push(v)
              updated = true
            }
          }
        } else if (typeof value === "string") {
          if (!suggestions.includes(value)) {
            suggestions.push(value)
            updated = true
          }
        }
      } catch (e) { }
    }

    if (updated) {
      this.debSetState({ suggestions: this.state.suggestions })
    }
  }

  addNode(node: any): boolean {
    if (!this.tc) {
      return false
    }

    // ignore Type ofrule
    if (node.Metadata.Type === "ofrule") {
      return false
    }

    var tags = this.config.nodeTags(node.Metadata)

    let n = this.tc.addNode(node.ID, tags, node.Metadata, (n: Node): number => this.config.nodeAttrs(n).weight)
    this.tc.setParent(n, this.tc.root)

    this.updateSuggestions(n, this.state.suggestions)

    this.updateFilters(n)

    return true
  }

  updatedNode(node: any): boolean {
    if (!this.tc) {
      return false
    }

    if (!node.Metadata) {
      console.warn("no metadata found: " + node)
      return false
    }

    // ignore Type ofrule
    if (node.Metadata.Type === "ofrule") {
      return false
    }

    var n = this.tc.updateNode(node.ID, node.Metadata)
    if (!n) {
      return false
    }

    // eventually update the panels
    this.bumpRevision(node.ID)

    this.updateFilters(n)

    return true
  }

  delNode(node: any): boolean {
    if (!this.tc) {
      return false
    }

    this.tc.delNode(node.ID)

    return true
  }

  addEdge(edge: any): boolean {
    if (!this.tc) {
      return false
    }

    let parent = this.tc.nodes.get(edge.Parent)
    let child = this.tc.nodes.get(edge.Child)

    if (parent && child) {
      if (edge.Metadata.RelationType === "ownership") {
        this.tc.setParent(child, parent)
      } else {
        this.tc.addLink(edge.ID, parent, child, [edge.Metadata.RelationType], edge.Metadata)
      }
    }

    return true
  }

  updatedEdge(edge: any): boolean {
    if (!this.tc) {
      return false
    }

    this.tc.updateLink(edge.ID, edge.Metadata)

    return true
  }

  delEdge(edge: any): boolean {
    if (!this.tc) {
      return false
    }

    this.tc.delLink(edge.ID)

    return true
  }

  parseTopology(data: { Nodes: any, Edges: any }) {
    if (!this.tc) {
      return
    }

    if (!data.Nodes) {
      return
    }

    // first add all the nodes
    for (let node of data.Nodes) {
      this.addNode(node)
    }

    if (!data.Edges) {
      return
    }

    // then add ownership links
    for (let edge of data.Edges) {
      if (edge.Metadata.RelationType === "ownership") {
        this.addEdge(edge)
      }
    }

    // finally add remaining links
    // then add ownership links
    for (let edge of data.Edges) {
      if (edge.Metadata.RelationType !== "ownership") {
        this.addEdge(edge)
      }
    }

    this.tc.activeNodeTag(this.config.defaultNodeTag())

    this.setState({ nodeTagStates: this.tc.nodeTagStates })

    this.tc.zoomFit()
  }

  nodeAttrs(node: Node): NodeAttrs {
    var attrs = this.config.nodeAttrs(node)
    if (node.data.State) {
      attrs.classes.push(node.data.State.toLowerCase())
    }

    return attrs
  }

  linkAttrs(link: Link): LinkAttrs {
    return this.config.linkAttrs(link)
  }

  onNodeSelected(node: Node, active: boolean) {
    if (active) {
      this.props.selectElement(node)
      this.openSelection()
    } else {
      if (this.tc) {
        this.tc.pinNode(node, false)
      }
      this.props.unselectElement(node)
    }
  }

  onLinkSelected(link: Link, active: boolean) {
    if (active) {
      this.props.selectElement(link)
      this.openSelection()
    } else {
      this.props.unselectElement(link)
    }
  }

  sortNodesFnc(a: Node, b: Node) {
    return this.config.nodeSortFnc(a, b)
  }

  onShowNodeContextMenu(node: Node) {
    return this.config.nodeMenu(node)
  }

  _refreshTopology() {
    if (this.tc) {
      this.tc.renderTree()
    }
  }

  onWebSocketMessage(msg: string) {
    var data: { Type: string, Obj: any } = JSON.parse(msg)
    switch (data.Type) {
      case "SyncReply":
        this.parseTopology(data.Obj)
        this.synced = true
        break
      case "NodeAdded":
        if (!this.synced) {
          return
        }
        if (this.addNode(data.Obj)) {
          this.refreshTopology()
        }
        break
      case "NodeUpdated":
        if (!this.synced) {
          return
        }

        if (this.updatedNode(data.Obj)) {
          this.refreshTopology()
        }
        break
      case "NodeDeleted":
        if (!this.synced) {
          return
        }
        if (this.delNode(data.Obj)) {
          this.refreshTopology()
        }
        break
      case "EdgeAdded":
        if (!this.synced) {
          return
        }
        if (this.addEdge(data.Obj)) {
          this.refreshTopology()

          if (this.tc) {
            this.setState({ linkTagStates: this.tc.linkTagStates })
          }
        }
        break
      case "EdgeUpdated":
        if (!this.synced) {
          return
        }

        if (this.updatedEdge(data.Obj)) {
          this.refreshTopology()
        }
        break
      case "EdgeDeleted":
        if (!this.synced) {
          return
        }
        if (this.delEdge(data.Obj)) {
          this.refreshTopology()
        }
        break
      default:
        break
    }
  }

  onWebSocketClose() {
    this.connected = false

    if (this.synced) {
      this.notify("Disconnected", "error")
    } else {
      this.notify("Not connected", "error")
    }

    this.synced = false

    // check if still authenticated
    this.checkAuth()
  }

  async checkAuth(): Promise<void> {
    const requestOptions = {
      method: 'GET',
      headers: {
        'X-Auth-Token': this.props.session.token
      }
    }

    return fetch(`${this.props.session.endpoint}/api/status`, requestOptions)
      .then(response => {
        if (response.status !== 200) {
          this.logout()
        }
      })
  }

  sendMessage(data: any) {
    if (this.websocket) {
      this.websocket.sendMessage(JSON.stringify(data))
    }
  }

  setWSContext(context: WSContext) {
    this.setState({ wsContext: context })
    this.sync()
  }

  setGremlinFilter(gremlin: string) {
    if (this.state.wsContext.GremlinFilter !== gremlin) {
      this.state.wsContext.GremlinFilter = gremlin
      this.setWSContext(this.state.wsContext)
    }
  }

  sync() {
    if (!this.tc || !this.connected) {
      return
    }

    // then reset the topology view and re-sync
    this.tc.resetTree()
    var msg = { "Namespace": "Graph", "Type": "SyncRequest", "Obj": this.state.wsContext }
    this.sendMessage(msg)
  }

  onWebSocketOpen() {
    this.connected = true

    if (!this.tc) {
      return
    }

    this.notify("Connected", "info")
    this.defaultFilter()
    this.sync()

    // set API configuration
    this.apiConf = new Configuration({ accessToken: this.props.session.token })
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

  onLinkTagStateChange(event) {
    if (!this.tc) {
      return
    }

    switch (this.tc.linkTagStates.get(event.target.value)) {
      case LinkTagState.Hidden:
        this.tc.setLinkTagState(event.target.value, LinkTagState.EventBased)
        break
      case LinkTagState.EventBased:
        this.tc.setLinkTagState(event.target.value, LinkTagState.Visible)
        break
      case LinkTagState.Visible:
        this.tc.setLinkTagState(event.target.value, LinkTagState.Hidden)
        break
    }
  }

  onLinkTagChange(tags: Map<string, LinkTagState>) {
    this.setState({ linkTagStates: tags })
  }

  onSearchChange(selected: Array<string>) {
    if (!this.tc) {
      return
    }

    this.tc.unpinNodes()
    this.tc.searchNodes(selected).forEach(node => {
      if (this.tc) {
        this.tc.pinNode(node, true)
      }
    })
  }

  subscriberURL(): string {
    var url = new URL(`/ws/subscriber?x-client-type=webui&x-auth-token=${this.props.session.token}`, this.props.session.endpoint)
    if (url.protocol.startsWith('https')) {
      url.protocol = 'wss:'
    } else {
      url.protocol = 'ws'
    }

    return url.toString()
  }

  openMenu(id: string, event: React.MouseEvent<HTMLElement>) {
    this.state.anchorEl.set(id, event.currentTarget)
    this.setState({ anchorEl: this.state.anchorEl })
  }

  closeMenu(id) {
    this.state.anchorEl.set(id, null)
    this.setState({ anchorEl: this.state.anchorEl })
  }

  logout() {
    this.props.closeSession()
    this.props.history.push("/login")
  }

  activeNodeTag(tag: string) {
    if (!this.tc) {
      return
    }

    this.tc.activeNodeTag(tag)
    this.setState({ nodeTagStates: this.tc.nodeTagStates })
  }

  onSelectionLocation(el: Node | Link) {
    if (!this.tc) {
      return
    }

    if (el.type === 'node') {
      this.tc.unpinNodes()
      this.tc.pinNode(el, true)
    } else {
      this.tc.centerLink(el)
    }
  }

  onTopologyClick() {
    this.setState({ isSelectionOpen: false })
  }

  onSelectionClose(el: Node | Link) {
    this.selectionClose(el)
  }

  selectionClose(el: Node | Link) {
    if (!this.tc) {
      return
    }

    if (el.type === 'node') {
      this.tc.selectNode(el.id, false)
    } else {
      this.tc.selectLink(el.id, false)
    }
  }

  openSelection() {
    this.setState({ isSelectionOpen: true })
  }

  unselectAll() {
    this.props.selection.forEach(el => {
      this.selectionClose(el)
    })
  }

  renderSelectionMenuItem(classes: any) {
    return this.props.selection.map((el: Node | Link, i: number) => {
      var className = classes.menuItemIconFree

      if (el.type === 'node') {
        let attrs = this.config.nodeAttrs(el)
        var icon: string = attrs.icon
        var href: string = attrs.href

        if (attrs.iconClass === "font-brands") {
          className = classes.menuItemIconBrands
        }

        var title = this.config.nodeTabTitle(el)
      } else {
        let attrs = this.config.linkAttrs(el)
        var icon: string = attrs.icon
        var href: string = attrs.href

        if (attrs.iconClass === "font-brands") {
          className = classes.menuItemIconBrands
        }

        var title = this.config.linkTabTitle(el)
      }

      const iconRender = () => {
        if (href) {
          return (
            <img src={href} className={classes.menuItemIconImg} />
          )
        }
        return icon
      }

      return (
        <MenuItem key={"menu-item-" + i} >
          <span className={className}>{iconRender()}</span>
          <Typography>{title}</Typography>
        </MenuItem>
      )
    })
  }

  connection() {
    return (
      <React.Fragment>
        {
          this.props.dataURL === undefined &&
          <Websocket ref={node => this.websocket = node} url={this.subscriberURL()} onOpen={this.onWebSocketOpen.bind(this)}
            onMessage={this.onWebSocketMessage.bind(this)} onClose={this.onWebSocketClose.bind(this)}
            reconnectIntervalInMilliSeconds={2500} />
        }
      </React.Fragment>
    )
  }

  actionButtons(el: Node | Link) {
    return (
      <React.Fragment>
        <GremlinButton el={el} onClick={() => { this.setState({ isGremlinPanelOpen: !this.state.isGremlinPanelOpen }) }} />
        <CaptureButton el={el} onClick={() => { this.setState({ isCapturePanelOpen: !this.state.isCapturePanelOpen }) }} />
      </React.Fragment>
    )
  }

  dataPanels(el: Node | Link) {
    return (
      <React.Fragment>
        <GremlinPanel el={el} expanded={this.state.isGremlinPanelOpen} />
        <CapturePanel el={el} expanded={this.state.isCapturePanelOpen} config={this.config} />
        {el.data!.Captures &&
          <FlowPanel el={el} />
        }
      </React.Fragment>
    )
  }

  renderFilterButtons(classes: any) {
    return (
      <React.Fragment>
        <Container className={classes.filtersPanel}>
          {Array.from(this.state.filters.values()).map((filter) => (
            <Button variant="contained" key={filter.id} aria-label="delete" size="small"
              color={this.state.activeFilter === filter.id ? "primary" : "default"}
              className={classes.filtersFab}
              onClick={() => { this.setState({ activeFilter: filter.id }); filter.callback() }}>
              {filter.label}
            </Button>
          ))}
        </Container>
      </React.Fragment>
    )
  }

  renderLinkTagButtons(classes: any) {
    return (
      <React.Fragment>
        {this.state.linkTagStates.size !== 0 &&
          <Container className={classes.linkTagsPanel}>
            <Paper className={classes.linkTagsPanelPaper}>
              <Typography component="h6" color="primary" gutterBottom>
                Link types
              </Typography>
              <FormGroup>
                {Array.from(this.state.linkTagStates.keys()).map((key) => (
                  <FormControlLabel key={key} control={
                    <Checkbox value={key} color="primary" onChange={this.onLinkTagStateChange.bind(this)}
                      checked={this.state.linkTagStates.get(key) === LinkTagState.Visible}
                      indeterminate={this.state.linkTagStates.get(key) === LinkTagState.EventBased} />
                  }
                    label={key} />
                ))}
              </FormGroup>
            </Paper>
          </Container>
        }
      </React.Fragment>
    )
  }

  renderNodeTagButtons(classes: any) {
    return (
      <Container className={classes.nodeTagsPanel}>
        {Array.from(this.state.nodeTagStates.keys()).sort((a, b) => {
          if (a === this.config.defaultNodeTag()) {
            return -1
          } else if (b === this.config.defaultNodeTag()) {
            return 1
          }
          return 0
        }).map((tag) => (
          <Fab key={tag} variant="extended" aria-label="delete" size="small"
            color={this.state.nodeTagStates.get(tag) ? "primary" : "default"}
            className={classes.nodeTagsFab}
            onClick={this.activeNodeTag.bind(this, tag)}>
            {tag}
          </Fab>
        ))}
      </Container>
    )
  }

  renderMenuButtons(classes: any) {
    return (
      <div>
        <IconButton
          aria-controls="menu-selection"
          aria-haspopup="true"
          onClick={(event: React.MouseEvent<HTMLElement>) => this.props.selection.length > 0 && this.openMenu("selection", event)}
          color="inherit">
          <Badge badgeContent={this.props.selection.length} color="secondary">
            <ListIcon />
          </Badge>
        </IconButton>
        <Menu
          id="menu-selection"
          anchorEl={this.state.anchorEl.get("selection")}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          keepMounted
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          open={Boolean(this.state.anchorEl.get("selection"))}
          onClose={this.closeMenu.bind(this, "selection")}>
          <MenuItem onClick={() => { this.closeMenu("selection"); this.openSelection() }}>
            <ListItemIcon>
              <KeyboardArrowDown fontSize="small" />
            </ListItemIcon>
            <Typography>Show selection</Typography>
          </MenuItem>
          <Divider />
          {this.renderSelectionMenuItem(classes)}
          <Divider />
          <MenuItem onClick={() => { this.closeMenu("selection"); this.unselectAll() }}>
            <ListItemIcon>
              <RemoveShoppingCartIcon fontSize="small" />
            </ListItemIcon>
            <Typography>Unselect all</Typography>
          </MenuItem>
        </Menu>
        <IconButton
          aria-label="account of current user"
          aria-controls="menu-profile"
          aria-haspopup="true"
          onClick={this.openMenu.bind(this, "profile")}
          color="inherit">
          <AccountCircle />
        </IconButton>
        <Menu
          id="menu-profile"
          anchorEl={this.state.anchorEl.get("profile")}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          keepMounted
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          open={Boolean(this.state.anchorEl.get("profile"))}
          onClose={this.closeMenu.bind(this, "profile")}>
          <MenuItem onClick={this.logout.bind(this)}>Logout</MenuItem>
        </Menu>
      </div>
    )
  }

  render() {
    const { classes } = this.props

    return (
      <div className={classes.app}>
        <CssBaseline />
        {this.connection()}
        <AppBar position="absolute" className={clsx(classes.appBar, this.state.isNavOpen && classes.appBarShift)}>
          <Toolbar className={classes.toolbar}>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="open drawer"
              onClick={this.openDrawer.bind(this)}
              className={clsx(classes.menuButton, this.state.isNavOpen && classes.menuButtonHidden)}>
              <MenuIcon />
            </IconButton>
            <Typography component="h1" variant="h6" color="inherit" noWrap className={classes.title}>
              {this.props.logo}
            </Typography>
            {this.config.subTitle &&
              <Typography className={classes.subTitle} variant="caption">{this.config.subTitle()}</Typography>
            }
            <div className={classes.search}>
              <AutoCompleteInput placeholder="metadata value" suggestions={this.state.suggestions} onChange={this.onSearchChange.bind(this)} />
            </div>
            <div className={classes.grow} />
            {this.renderMenuButtons(classes)}
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
          <Container maxWidth="xl" className={classes.container}>
            <Topology className={classes.topology} ref={node => this.tc = node}
              nodeAttrs={this.nodeAttrs.bind(this)}
              linkAttrs={this.linkAttrs.bind(this)}
              onNodeSelected={this.onNodeSelected.bind(this)}
              sortNodesFnc={this.sortNodesFnc.bind(this)}
              onShowNodeContextMenu={this.onShowNodeContextMenu.bind(this)}
              weightTitles={this.config.weightTitles()}
              groupSize={this.config.groupSize()}
              groupType={this.config.groupType.bind(this.config)}
              groupName={this.config.groupName.bind(this.config)}
              onClick={this.onTopologyClick.bind(this)}
              onLinkSelected={this.onLinkSelected.bind(this)}
              onLinkTagChange={this.onLinkTagChange.bind(this)}
              onNodeClicked={this.config.nodeClicked.bind(this.config)}
              onNodeDblClicked={this.config.nodeDblClicked.bind(this.config)}
              defaultLinkTagMode={this.config.defaultLinkTagMode.bind(this.config)}
            />
          </Container>
          <Container className={classes.rightPanel}>
            <Paper className={clsx(classes.rightPanelPaper, (!this.props.selection.length || !this.state.isSelectionOpen) && classes.rightPanelPaperClose)}
              square={true}>
              <SelectionPanel onLocation={this.onSelectionLocation.bind(this)} onClose={this.onSelectionClose.bind(this)} config={this.config}
                buttonsContent={this.actionButtons.bind(this)} panelsContent={this.dataPanels.bind(this)} />
            </Paper>
          </Container>
          {this.renderNodeTagButtons(classes)}
          {this.renderFilterButtons(classes)}
          {this.renderLinkTagButtons(classes)}
        </main>
      </div>
    )
  }
}

export const mapStateToProps = (state: AppState) => ({
  selection: state.selection,
  session: state.session
})

export const mapDispatchToProps = ({
  selectElement,
  unselectElement,
  bumpRevision,
  closeSession
})

export default withStyles(styles)(connect(mapStateToProps, mapDispatchToProps)(withSnackbar(withRouter(App))))
