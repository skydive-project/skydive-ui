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
import { AppState } from './Store'
import { connect } from 'react-redux'
import { Node, Link } from './Topology'
import { DataPanel } from './DataPanel'
import { a11yProps, TabPanel } from './Tabs'
import IconButton from '@material-ui/core/IconButton'
import LocationOnIcon from '@material-ui/icons/LocationOn'
import CodeIcon from '@material-ui/icons/Code'
import CardContent from '@material-ui/core/CardContent'
import Collapse from '@material-ui/core/Collapse'
import Highlight from 'react-highlight'
import CancelIcon from '@material-ui/icons/Cancel'
import Tooltip from '@material-ui/core/Tooltip'

declare var config: any

interface Props {
  classes: any
  selection: Array<Node | Link>
  revision: number
  onLocation?: (node: Node | Link) => void
  onClose?: (node: Node | Link) => void
}

interface State {
  tab: number
  gremlin: string
}

class SelectionPanel extends React.Component<Props, State> {

  state: State

  constructor(props) {
    super(props)

    this.state = {
      tab: 0,
      gremlin: ""
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
    return this.props.selection.map((d: Node | Link, i: number) => {
      var className = classes.tabIconFree

      if (d.type === 'node') {
        if (config.nodeAttrs(d).iconClass === "font-brands") {
          className = classes.tabIconBrands
        }

        var icon = config.nodeAttrs(d).icon
        var title = config.nodeTabTitle(d)
      } else {
        if (config.linkAttrs(d).iconClass === "font-brands") {
          className = classes.tabIconBrands
        }

        var icon = config.linkAttrs(d).icon
        var title = config.linkTabTitle(d)
      }

      return (
        <Tab className="tab" icon={<span className={className}>{icon}</span>}
          key={"tab-" + i} label={<span className={classes.tabTitle}>{title}</span>} {...a11yProps(i)} />
      )
    })
  }

  private showGremlin(el: Node | Link) {
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

  private dataFields(el: Node | Link): Array<any> {
    if (el.type === 'node') {
      return config.nodeDataFields
    } else {
      return config.linkDataFields
    }
  }

  renderTabPanels(classes: any) {
    return this.props.selection.map((el: Node | Link, i: number) => {
      if (this.state.tab !== i) {
        return null
      }

      return (
        <React.Fragment key={el.id}>
          <div className={classes.tabActions}>
            <Tooltip title="remove from selection" aria-label="remove from selection">
              <IconButton
                onClick={() => this.props.onClose && this.props.onClose(el)}
                color="inherit">
                <CancelIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="pin node" aria-label="pin node">
              <IconButton
                onClick={() => this.props.onLocation && this.props.onLocation(el)}
                color="inherit">
                <LocationOnIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="gremlin expression" aria-label="gremlin expression">
              <IconButton
                aria-label="show gremlin request"
                onClick={() => this.showGremlin(el)}
                color="inherit">
                <CodeIcon />
              </IconButton>
            </Tooltip>
          </div>
          <Collapse in={this.state.gremlin !== ""} timeout="auto" unmountOnExit>
            <CardContent className={classes.gremlinCardContent}>
              <Highlight language="bash">
                {this.state.gremlin}
                </Highlight>
            </CardContent>
          </Collapse>
          <TabPanel key={"tabpanel-" + el.id} value={this.state.tab} index={i}>
            {this.dataFields(el).map(entry => {
              var data = el.data
              var exclude = new Array<any>()

              if (entry.field) {
                data = el.data[entry.field]
              } else {
                exclude = this.dataFields(el).filter(cfg => cfg.field).map(cfg => cfg.field)
              }

              if (data) {
                var title = entry.title || entry.field || "General"
                var sortKeys = entry.sortKeys ? entry.sortKeys(data) : null
                var filterKeys = entry.filterKeys ? entry.filterKeys(data) : null

                return (
                  <DataPanel key={"dataviewer-" + (entry.field || "general") + "-" + el.id} classes={classes} title={title}
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
  revision: state.selectionRevision
})

export const mapDispatchToProps = ({
})

export default connect(mapStateToProps, mapDispatchToProps)(SelectionPanel)