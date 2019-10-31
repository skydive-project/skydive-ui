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

declare var config: any

interface Props {
  classes: any
  selection: Array<Node | Link>
  revision: number
  onLocation?: (node: Node) => any
}

interface State {
  tab: number
  gremlinID: string
}

class SelectionPanel extends React.Component<Props, State> {

  state: State

  constructor(props) {
    super(props)

    this.state = {
      tab: 0,
      gremlinID: ""
    }
  }

  renderTabs(classes: any) {
    return this.props.selection.map((d: Node, i: number) => {
      var className = classes.tabIconFree
      if (config.nodeAttrs(d).iconClass === "font-brands") {
        className = classes.tabIconBrands
      }
      return (
        <Tab className="tab" icon={<span className={className}>{config.nodeAttrs(d).icon}</span>}
          key={"tab-" + i} label={<span className={classes.tabTitle}>{config.nodeTabTitle(d)}</span>} {...a11yProps(i)} />
      )
    })
  }

  showGremlin(node: Node) {
    if (this.state.gremlinID) {
      this.setState({ gremlinID: "" })
    } else {
      this.setState({ gremlinID: node.id })
    }
  }

  renderTabPanels(classes: any) {
    return this.props.selection.map((node: Node, i: number) => {
      if (this.state.tab !== i) {
        return null
      }

      return (
        <React.Fragment key={node.id}>
          <div className={classes.tabActions}>
            <IconButton
              aria-label="show node"
              aria-haspopup="true"
              onClick={() => this.props.onLocation && this.props.onLocation(node)}
              color="inherit">
              <LocationOnIcon />
            </IconButton>
            <IconButton
              aria-label="show gremlin request"
              aria-haspopup="true"
              onClick={() => this.showGremlin(node)}
              color="inherit">
              <CodeIcon />
            </IconButton>
          </div>
          <Collapse in={this.state.gremlinID !== ""} timeout="auto" unmountOnExit>
            <CardContent className={classes.gremlinCardContent}>
              <Highlight language="bash">
                G.V('{this.state.gremlinID}')
                </Highlight>
            </CardContent>
          </Collapse>
          <TabPanel key={"tabpanel-" + node.id} value={this.state.tab} index={i}>
            {config.nodeDataFields.map(cfg => {
              var data = node.data
              var exclude = []

              if (cfg.field) {
                data = node.data[cfg.field]
              } else {
                exclude = config.nodeDataFields.filter(cfg => cfg.field).map(cfg => cfg.field)
              }

              if (data) {
                var title = cfg.title || cfg.field || "General"
                var sortKeys = cfg.sortKeys ? cfg.sortKeys(data) : null
                var filterKeys = cfg.filterKeys ? cfg.filterKeys(data) : null

                return (
                  <DataPanel key={"dataviewer-" + (cfg.field || "general") + "-" + node.id} classes={classes} title={title}
                    defaultExpanded={cfg.expanded} data={data} exclude={exclude} sortKeys={sortKeys} filterKeys={filterKeys}
                    normalizer={cfg.normalizer} graph={cfg.graph} icon={cfg.icon} iconClass={cfg.iconClass} />
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
    this.setState({ tab: value, gremlinID: "" })
  }

  render() {
    const { classes } = this.props

    var tab = this.state.tab
    if (tab >= this.props.selection.length) {
      tab = this.props.selection.length - 1
    }
    if (tab < 0) {
      tab = 0
    }

    return (
      <div className={classes.tabs}>
        <Tabs
          orientation="horizontal"
          variant="scrollable"
          value={tab}
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