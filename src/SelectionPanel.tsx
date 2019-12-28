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
import Tabs from '@material-ui/core/Tabs'
import Tab from '@material-ui/core/Tab'
import { connect } from 'react-redux'
import IconButton from '@material-ui/core/IconButton'
import LocationOnIcon from '@material-ui/icons/LocationOn'
import CodeIcon from '@material-ui/icons/Code'
import Collapse from '@material-ui/core/Collapse'
import Highlight from 'react-highlight'
import CancelIcon from '@material-ui/icons/Cancel'
import Tooltip from '@material-ui/core/Tooltip'
import VideocamIcon from '@material-ui/icons/Videocam'
import CaptureForm from "./CaptureForm"
import { withStyles } from '@material-ui/core/styles'

import { Node, Link } from './Topology'
import DataPanel from './DataPanel'
import { a11yProps, TabPanel } from './Tabs'
import { AppState } from './Store'
import { styles } from './SelectionPanelStyles'
import ActionPanel from './ActionPanel'

import DefaultConfig from './Config'

interface Props {
  classes: any
  selection: Array<Node | Link>
  revision: number
  onLocation?: (node: Node | Link) => void
  onClose?: (node: Node | Link) => void
  config: typeof DefaultConfig
}

interface State {
  tab: number
  gremlin: string
  captureForm: boolean
}

class SelectionPanel extends React.Component<Props, State> {

  state: State

  constructor(props) {
    super(props)

    this.state = {
      tab: 0,
      gremlin: "",
      captureForm: false
    }
  }

  static getDerivedStateFromProps(props, state) {
    var tab = state.tab
    if (tab >= props.selection.length) {
      tab = props.selection.length - 1
    }
    if (tab < 0) {
      tab = 0
    }
    return {
      tab: tab
    }
  }

  private renderTabs(classes: any) {
    return this.props.selection.map((el: Node | Link, i: number) => {
      var className = classes.tabIconFree

      if (el.type === 'node') {
        let attrs = this.props.config.nodeAttrs(el)
        var icon: string = attrs.icon
        var href: string = attrs.href

        if (attrs.iconClass === "font-brands") {
          className = classes.tabIconBrands
        }

        var title = this.props.config.nodeTabTitle(el)
      } else {
        let attrs = this.props.config.linkAttrs(el)
        var icon: string = attrs.icon
        var href: string = attrs.href

        if (attrs.iconClass === "font-brands") {
          className = classes.tabIconBrands
        }

        var title = this.props.config.linkTabTitle(el)
      }

      const iconRender = () => {
        if (href) {
          return (
            <img src={href} className={classes.iconImg} />
          )
        }
        return icon
      }

      return (
        <Tab className="tab" icon={<span className={className}>{iconRender()}</span>}
          key={"tab-" + i} label={<span className={classes.tabTitle}>{title}</span>} {...a11yProps(i)} />
      )
    })
  }

  private toggleGremlinExpr(el: Node | Link) {
    if (this.state.gremlin) {
      this.setState({ gremlin: "" })
    } else {
      if (el.type === 'node') {
        this.setState({ gremlin: `G.V('${el.id}')` })
      } else {
        this.setState({ gremlin: `G.E('${el.id}')` })
      }
    }
  }

  private toggleCaptureForm(node: Node) {
    this.setState({ captureForm: !this.state.captureForm })
  }

  private dataFields(el: Node | Link): Array<any> {
    if (el.type === 'node') {
      return this.props.config.nodeDataFields
    } else {
      return this.props.config.linkDataFields
    }
  }

  private dataAttrs(el: Node | Link): any {
    if (el.type === 'node') {
      return this.props.config.nodeAttrs(el)
    } else {
      return this.props.config.linkAttrs(el)
    }
  }

  renderTabPanels(classes: any) {
    const dataByPath = (data: any, path: string): any => {
      for (let key of path.split(".")) {
        data = data[key]
        if (!data) {
          break
        }
      }

      return data
    }

    return this.props.selection.map((el: Node | Link, i: number) => {
      if (this.state.tab !== i) {
        return null
      }

      return (
        <React.Fragment key={el.id}>
          <div className={classes.tabActions}>
            <Tooltip title="Remove from selection" aria-label="Remove from selection">
              <IconButton
                onClick={() => this.props.onClose && this.props.onClose(el)}
                color="inherit">
                <CancelIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Pin node" aria-label="pin node">
              <IconButton
                onClick={() => this.props.onLocation && this.props.onLocation(el)}
                color="inherit">
                <LocationOnIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Gremlin expression" aria-label="Gremlin expression">
              <IconButton
                aria-label="Show gremlin expression"
                onClick={() => this.toggleGremlinExpr(el)}
                color="inherit">
                <CodeIcon />
              </IconButton>
            </Tooltip>
            {el.type === 'node' &&
              <Tooltip title="Packet capture" aria-label="Packet capture">
                <IconButton
                  aria-label="Packet capture"
                  onClick={() => this.toggleCaptureForm(el)}
                  color="inherit">
                  <VideocamIcon />
                </IconButton>
              </Tooltip>
            }
          </div>
          <Collapse in={this.state.gremlin !== ""} timeout="auto" unmountOnExit className={classes.actionPanel}>
            <ActionPanel icon={<CodeIcon />} title="Gremlin expression" content={
              <div className={classes.gremlinExpr}>
                <Highlight language="bash">
                  {this.state.gremlin}
                </Highlight>
              </div>
            } />
          </Collapse>
          <Collapse in={this.state.captureForm} timeout="auto" unmountOnExit className={classes.actionPanel}>
            <CaptureForm defaultName={this.dataAttrs(el).name} gremlinExpr={`G.V().Has('TID', '${el.data.TID}')`} />
          </Collapse>
          <TabPanel key={"tabpanel-" + el.id} value={this.state.tab} index={i}>
            {this.dataFields(el).map(entry => {
              var data = el.data
              var exclude = new Array<any>()

              if (entry.field) {
                data = dataByPath(el.data, entry.field)
              } else if (entry.data) {
                data = entry.data(el)
              }

              exclude = this.dataFields(el).filter(cfg => cfg.field).map(cfg => {
                if (entry.field) {
                  return cfg.field.replace(entry.field + ".", "")
                } else {
                  return cfg.field
                }
              })

              if (data) {
                var title = entry.title || entry.field || "General"
                var sortKeys = entry.sortKeys ? entry.sortKeys(data) : null
                var filterKeys = entry.filterKeys ? entry.filterKeys(data) : null

                var suffix = title.toLowerCase().replace(" ", "-")
                return (
                  <DataPanel key={"dataviewer-" + el.id + "-" + suffix} title={title}
                    defaultExpanded={entry.expanded} data={data} exclude={exclude} sortKeys={sortKeys} filterKeys={filterKeys}
                    normalizer={entry.normalizer} graph={entry.graph} icon={entry.icon} iconClass={entry.iconClass} />
                )
              }
            })
            }
          </TabPanel>
        </React.Fragment>
      )
    })
  }

  onTabChange(event: React.ChangeEvent<{}>, value: number) {
    this.setState({ tab: value, gremlin: "" })
  }

  render() {
    const { classes } = this.props

    return (
      <div className={classes.tabs}>
        <Tabs
          orientation="horizontal"
          variant="scrollable"
          value={this.state.tab}
          onChange={this.onTabChange.bind(this)}
          aria-label="Metadata"
          indicatorColor="primary">
          {this.renderTabs(classes)}
        </Tabs>
        <div className={classes.rightPanelPaperContent} style={{ overflow: "auto" }}>
          {this.renderTabPanels(classes)}
        </div>
      </div>
    )
  }
}

export const mapStateToProps = (state: AppState) => ({
  selection: state.selection,
  revision: state.selectionRevision,
  config: state.config
})

export const mapDispatchToProps = ({
})

export default withStyles(styles)(connect(mapStateToProps, mapDispatchToProps)(SelectionPanel))
