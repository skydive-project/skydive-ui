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
import AccessTimeIcon from '@material-ui/icons/AccessTime'
import RestoreIcon from '@material-ui/icons/Restore'
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
import Autocomplete, { createFilterOptions } from '@material-ui/lab/Autocomplete'
import TextField from '@material-ui/core/TextField'
import Dialog from '@material-ui/core/Dialog'
import DialogTitle from '@material-ui/core/DialogTitle'
import DialogContent from '@material-ui/core/DialogContent'
import DialogActions from '@material-ui/core/DialogActions'
import Button from '@material-ui/core/Button'
import Chip from '@material-ui/core/Chip'
import WavesIcon from '@material-ui/icons/Waves'

import { styles } from './AppStyles'
import { Topology, Node, NodeAttrs, LinkAttrs, LinkTagState, Link } from './Topology'
import { MenuListItems, HelpListItems } from './Menu'
import AutoCompleteInput from './AutoComplete'
import {
  AppState,
  selectElement, unselectElement,
  bumpRevision,
  session, closeSession
} from './Store'
import { withRouter } from 'react-router-dom'
import SelectionPanel from './SelectionPanel'
import { Configuration } from './api/configuration'
import * as api from './api/api'
import { StatusApi, APIInfoApi } from './api'
import Tools from './Tools'
import GremlinButton from './ActionButtons/Gremlin'
import CaptureButton from './ActionButtons/Capture'
import GremlinPanel from './DataPanels/Gremlin'
import CapturePanel from './DataPanels/Capture'
import FlowPanel from './DataPanels/Flow'
import AboutDialog from './About'
import TimetravelPanel from './TimetravelPanel'

const packageJson = require('../package.json')

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
  Time: number | null
}

interface AddFilterValue {
  label: string
  gremlinFilter: string
}

const addFilterValue = createFilterOptions<AddFilterValue>();

interface State {
  isContextMenuOn: string
  contextMenuX: number
  contextMenuY: number
  isNavOpen: boolean
  nodeTagStates: Map<string, boolean>
  linkTagStates: Map<string, LinkTagState>
  filters: Array<Filter>
  activeFilter: Filter | null
  suggestions: Array<string>
  anchorEl: Map<string, null | HTMLElement>
  isSelectionOpen: boolean
  isTimetravelOpen: boolean
  wsContext: WSContext
  isGremlinPanelOpen: boolean
  isCapturePanelOpen: boolean
  addFilterOpened: boolean
  addFilterValue: AddFilterValue
  isAboutOpen: boolean
  appVersion: string
  timeContext: Date | null
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
  debUpdateFilters: () => void
  config: ConfigReducer
  filters: Map<string, Filter>
  nextTag?: string
  filterInput: string
  customFilters: Array<Filter>

  constructor(props) {
    super(props)

    this.state = {
      isContextMenuOn: "none",
      contextMenuX: 0,
      contextMenuY: 0,
      isNavOpen: false,
      nodeTagStates: new Map<string, boolean>(),
      linkTagStates: new Map<string, LinkTagState>(),
      filters: new Array<Filter>(),
      suggestions: new Array<string>(),
      anchorEl: new Map<string, null | HTMLElement>(),
      isSelectionOpen: false,
      isTimetravelOpen: false,
      wsContext: { GremlinFilter: null, Time: null },
      isGremlinPanelOpen: false,
      isCapturePanelOpen: false,
      activeFilter: null,
      addFilterOpened: false,
      addFilterValue: { label: "", gremlinFilter: "" },
      isAboutOpen: false,
      appVersion: "",
      timeContext: null
    }

    this.synced = false

    this.refreshTopology = debounce(300, this._refreshTopology.bind(this))

    // we will refresh info each 1s
    this.bumpRevision = debounce(1000, this.props.bumpRevision.bind(this))

    // debounce version of setState
    this.debSetState = debounce(200, this.setState.bind(this))

    // debounce updateFilters
    this.debUpdateFilters = debounce(5000, this.updateFilters.bind(this))

    // will handle multiple configuration files
    this.config = new ConfigReducer()

    this.filters = new Map<string, Filter>()

    this.customFilters = new Array<Filter>()
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

  private applyDefaultFilter(): boolean {
    var filter = this.config.defaultFilter()
    if (filter) {
      this.nextTag = filter.tag
      filter.callback()

      return true
    }

    return false
  }

  private applyFilter(filter: Filter | null) {
    this.state.activeFilter = filter
    this.debSetState(this.state)

    if (filter) {
      this.nextTag = filter.tag
      filter.callback()
    } else {
      this.applyDefaultFilter()
    }
  }

  private updateFilters() {
    this.config.filters().then(filters => {
      for (let filter of filters) {
        if (!this.filters.has(filter.id)) {
          this.filters.set(filter.id, filter)
        }
      }

      let fnc = (a: Filter, b: Filter) => {
        if (a.category == b.category) {
          return a.label.localeCompare(b.label)
        }
        return a.category.localeCompare(b.category)
      }

      let configFilters = Array.from(this.filters.values()).sort(fnc)
      this.state.filters = this.customFilters.concat(configFilters)


      this.debSetState(this.state)
    })
  }

  private updateSuggestions(node: Node) {
    var suggestions = this.state.suggestions
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
      this.state.suggestions = suggestions
      this.debSetState(this.state)
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

    this.updateSuggestions(n)

    this.debUpdateFilters()

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

    this.debUpdateFilters()

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
      if (this.config.isHierarchyLink(edge.Metadata)) {
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

    if (data.Edges) {
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
    }

    if (this.nextTag) {
      this.tc.activeNodeTag(this.nextTag)
      this.nextTag = ""
    } else {
      this.tc.activeNodeTag(this.config.defaultNodeTag())
    }

    this.state.nodeTagStates = this.tc.nodeTagStates
    this.debSetState(this.state)

    this.updateFilters()

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
        this.state.suggestions = []
        if (this.tc) {
          this.tc.resetTree()
          this.parseTopology(data.Obj)
        }
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
            this.state.linkTagStates = this.tc.linkTagStates
            this.debSetState(this.state)
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

    this.state.appVersion = ""
    this.setState(this.state)

    this.synced = false

    // check if still authenticated
    this.checkAuth()
  }

  checkAuth() {
    var conf = new Configuration({ basePath: this.props.session.endpoint + "/api", accessToken: this.props.session.token })
    var api = new StatusApi(conf)

    api.getStatus().catch(err => {
      if (err.status === 401) {
        this.logout()
      }
    })
  }

  getAppVersion() {
    var conf = new Configuration({ basePath: this.props.session.endpoint + "/api", accessToken: this.props.session.token })
    var api = new APIInfoApi(conf)

    api.getApi().then(data => {
      this.state.appVersion = data.Version || ""
      this.setState(this.state)
    })
  }

  sendMessage(data: any) {
    if (this.websocket) {
      this.websocket.sendMessage(JSON.stringify(data))
    }
  }

  setWSContext(context: WSContext) {
    this.state.wsContext = context
    this.setState(this.state)
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

    var obj = {}
    if (this.state.wsContext.GremlinFilter) {
      obj["GremlinFilter"]
    }
    if (this.state.wsContext.Time) {
      obj["Time"] = this.state.wsContext.Time
    }

    // then reset the topology view and re-sync
    var msg = { "Namespace": "Graph", "Type": "SyncRequest", "Obj": obj }
    this.sendMessage(msg)
  }

  onWebSocketOpen() {
    this.connected = true

    if (!this.tc) {
      return
    }

    this.notify("Connected", "info")
    if (!this.applyDefaultFilter()) {
      this.sync()
    }

    // set API configuration
    this.apiConf = new Configuration({ basePath: this.props.session.endpoint + "/api", accessToken: this.props.session.token })

    this.getAppVersion()
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
    this.state.isNavOpen = true
    this.setState(this.state)
  }

  closeDrawer() {
    this.state.isNavOpen = false
    this.setState(this.state)
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
    this.state.linkTagStates = tags
    this.debSetState(this.state)
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
    this.setState(this.state)
  }

  closeMenu(id) {
    this.state.anchorEl.set(id, null)
    this.setState(this.state)
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

    this.state.nodeTagStates = this.tc.nodeTagStates
    this.setState(this.state)

    this.tc.zoomFit()
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
    this.state.isSelectionOpen = false
    this.state.isTimetravelOpen = false
    this.setState(this.state)
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

    if (this.props.selection.length == 1) {
      this.state.isSelectionOpen = false
      this.setState(this.state)
    }
  }

  openSelection() {
    this.state.isSelectionOpen = true
    this.state.isTimetravelOpen = false
    this.setState(this.state)
  }

  unselectAll() {
    this.props.selection.forEach(el => {
      this.selectionClose(el)
    })
  }

  openTimetravel() {
    this.state.isTimetravelOpen = true
    this.setState(this.state)
  }

  resetTimetravel() {
    this.state.timeContext = null
    this.state.wsContext.Time = null
    this.setState(this.state)
    this.sync()
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
        <GremlinButton el={el} onClick={() => {
          this.state.isGremlinPanelOpen = !this.state.isGremlinPanelOpen
          this.setState(this.state)
        }} />
        <CaptureButton el={el} onClick={() => {
          this.state.isCapturePanelOpen = !this.state.isCapturePanelOpen
          this.setState(this.state)
        }} />
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

  handleAddFilterOpen() {
    this.state.addFilterOpened = true
    this.state.addFilterValue.label = ""
    this.setState(this.state)
  }

  handleAddFilterClose() {
    this.state.addFilterOpened = false
    this.setState(this.state)
  }

  setAddFilterDialogLabel(label: string) {
    this.state.addFilterValue.label = label
    this.setState(this.state)
  }

  setAddFilterDialogGremlin(gremlin: string) {
    this.state.addFilterValue.gremlinFilter = gremlin
    this.setState(this.state)
  }

  updateFilterInput(value: string) {
    this.filterInput = value
  }

  handleAddFilterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    var filter = {
      id: this.state.addFilterValue.label,
      label: this.state.addFilterValue.label,
      category: "User defined",
      callback: () => {
        this.setGremlinFilter(this.state.addFilterValue.gremlinFilter + ".SubGraph()")
      }
    }

    this.customFilters.push(filter)
    this.updateFilters()

    this.handleAddFilterClose()
  }

  renderFilters(classes: any) {
    return (
      <Container className={classes.filtersPanel}>
        <Autocomplete
          options={this.state.filters}
          value={this.state.activeFilter}
          onChange={(event: any, newValue: any) => {
            if (typeof newValue === 'string') {
              // timeout to avoid instant validation of the dialog's form.
              setTimeout(() => {
                this.handleAddFilterOpen()
                this.setAddFilterDialogGremlin(newValue)
              })
            } else if (newValue && newValue.label && !newValue.id) {
              this.handleAddFilterOpen()
              this.setAddFilterDialogGremlin(newValue.gremlinFilter)
            } else {
              this.applyFilter(newValue)
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              this.setGremlinFilter(this.filterInput)
            }
          }}
          filterOptions={(options, params) => {
            const filtered = addFilterValue(options, params) as AddFilterValue[]

            if (params.inputValue !== '') {
              filtered.push({
                label: `Add "${params.inputValue}"`,
                gremlinFilter: params.inputValue
              })
            }

            return filtered
          }}
          getOptionLabel={(filter: Filter) => filter.label}
          groupBy={(filter: Filter) => filter.category}
          style={{ width: 300 }}
          size="small"
          renderInput={(params) => <TextField {...params} label="Filter" variant="outlined" onChange={(event) => {
            let fnc = this.updateFilterInput.bind(this)
            fnc(event.target.value + ".SubGraph()")
          }} />}
        />
        <Dialog open={this.state.addFilterOpened} onClose={this.handleAddFilterClose.bind(this)} aria-labelledby="form-dialog-title">
          <form onSubmit={this.handleAddFilterSubmit.bind(this)}>
            <DialogTitle id="form-dialog-title">Add a new filter</DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                id="label"
                value={this.state.addFilterValue.label}
                onChange={(event) => {
                  let fnc = this.setAddFilterDialogLabel.bind(this)
                  fnc(event.target.value)
                }}
                label="Label"
                type="text"
              />
              <TextField
                margin="dense"
                id="name"
                value={this.state.addFilterValue.gremlinFilter}
                onChange={(event) => {
                  let fnc = this.setAddFilterDialogGremlin.bind(this)
                  fnc(event.target.value)
                }}
                label="Gremlin Filter"
                type="text"
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={this.handleAddFilterClose.bind(this)} color="primary">
                Cancel
            </Button>
              <Button type="submit" color="primary">
                Add
            </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Container>
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
        {this.state.timeContext &&
          <Chip
            icon={<RestoreIcon />}
            label={this.state.timeContext.toString().split(" (")[0]}
            color="primary"
            onClick={() => this.openTimetravel()}
            onDelete={() => this.resetTimetravel()}
          />
        }
        {!this.state.timeContext &&
          <IconButton
            aria-controls="menu-time"
            aria-haspopup="true"
            onClick={() => this.openTimetravel()}
            color="inherit">
            <Badge color="secondary">
              <RestoreIcon />
            </Badge>
          </IconButton>
        }
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
        {/* <IconButton
          aria-label="account of current user"
          aria-controls="menu-profile"
          aria-haspopup="true"
          onClick={this.openMenu.bind(this, "profile")}
          color="inherit">
          <AccountCircle />
        </IconButton> */}
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

  closeAboutDialog() {
    this.state.isAboutOpen = false
    this.setState(this.state)
  }

  openAboutDialog() {
    this.state.isNavOpen = false
    this.state.isAboutOpen = true
    this.setState(this.state)
  }

  onNavigate(date: Date) {
    this.state.isTimetravelOpen = false
    this.state.timeContext = date
    this.state.wsContext.Time = date.getTime()
    this.setState(this.state)
    this.sync()
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
          <List><MenuListItems /></List>
          {/* <Divider /> */}
          <List><HelpListItems onClick={this.openAboutDialog.bind(this)} /></List>
        </Drawer>
        <AboutDialog open={this.state.isAboutOpen} onClose={this.closeAboutDialog.bind(this)}
          appName="ABLESTACK SKYDIVE" appVersion="1.00" uiVersion="1.00"/>
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
            <Paper className={clsx(classes.rightPanelPaper, (!this.state.isSelectionOpen && !this.state.isTimetravelOpen) && classes.rightPanelPaperClose)}
              square={true}>
              {!this.state.isTimetravelOpen &&
                <SelectionPanel onLocation={this.onSelectionLocation.bind(this)} onClose={this.onSelectionClose.bind(this)} config={this.config}
                  buttonsContent={this.actionButtons.bind(this)} panelsContent={this.dataPanels.bind(this)} />
              }
              {this.state.isTimetravelOpen &&
                <TimetravelPanel config={this.config} onNavigate={this.onNavigate.bind(this)} />
              }
            </Paper>
          </Container>
          {this.renderNodeTagButtons(classes)}
          {this.renderFilters(classes)}
          {this.renderLinkTagButtons(classes)}
        </main>
      </div>
    )
  }
}

export const mapStateToProps = (state: AppState) => ({
  selection: state.selection,
  session: state.session,
})

export const mapDispatchToProps = ({
  selectElement,
  unselectElement,
  bumpRevision,
  closeSession,
})

export default withStyles(styles)(connect(mapStateToProps, mapDispatchToProps)(withSnackbar(withRouter(App))))
