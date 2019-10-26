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

declare var config: any

interface Props {
  classes: any
  selection: Array<Node | Link>
  revision: number
}

interface State {
  tab: number
}

class SelectionPanel extends React.Component<Props, State> {

  state: State

  constructor(props) {
    super(props)

    this.state = {
      tab: 0
    }
  }

  renderTabs(classes: any) {
    return this.props.selection.map((d: Node, i: number) => {
      var className = classes.tabIconFree
      if (config.nodeAttrs(d).classes.includes("font-brands")) {
        className = classes.tabIconBrands
      }
      return (
        <Tab className="tab" icon={<span className={className}>{config.nodeAttrs(d).icon}</span>}
          key={"tab-" + i} label={<span className={classes.tabTitle}>{config.nodeTabTitle(d)}</span>} {...a11yProps(i)} />
      )
    })
  }

  renderTabPanels(classes: any) {
    return this.props.selection.map((node: Node, i: number) => {
      if (this.state.tab !== i) {
        return null
      }

      return (
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
              var filterKeys = cfg.filterKeys ? cfg.filterKeys(data) : null

              return (
                <DataPanel key={"dataviewer-" + (cfg.field || "general") + "-" + node.id} classes={classes} title={title}
                  defaultExpanded={cfg.expanded} data={data} exclude={exclude} sort={cfg.sort} filterKeys={filterKeys}
                  normalizer={cfg.normalizer} graph={cfg.graph} icon={cfg.icon} />
              )
            }
          })
          }
        </TabPanel>
      )
    })
  }

  onTabChange(event: React.ChangeEvent<{}>, value: number) {
    this.setState({ tab: value })
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