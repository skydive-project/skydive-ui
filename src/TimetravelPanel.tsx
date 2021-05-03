/*
 * Copyright (C) 2021 Sylvain Afchain
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
import { connect } from 'react-redux'
import { withStyles } from '@material-ui/core/styles'
import { AppState, session } from './Store'
import { styles } from './TimetravelPanelStyles'
import Timeline from '@material-ui/lab/Timeline'
import TimelineItem from '@material-ui/lab/TimelineItem'
import TimelineSeparator from '@material-ui/lab/TimelineSeparator'
import TimelineConnector from '@material-ui/lab/TimelineConnector'
import TimelineContent from '@material-ui/lab/TimelineContent';
import TimelineOppositeContent from '@material-ui/lab/TimelineOppositeContent'
import TimelineDot from '@material-ui/lab/TimelineDot'
import Paper from '@material-ui/core/Paper'
import TextField from '@material-ui/core/TextField'
import Autocomplete from '@material-ui/lab/Autocomplete'
import { Typography } from '@material-ui/core'
import Chip from '@material-ui/core/Chip'
import Grid from '@material-ui/core/Grid'

import { Node } from './Topology'
import ConfigReducer from './Config'
import { Configuration } from './api/configuration'
import { TopologyApi } from './api'

const moment = require('moment')

interface Props {
  classes: any
  session: session
  config: ConfigReducer
  onNavigate: (date: Date) => void
}

interface State {
  data: Array<any>
  nodeType: string
  timeContext: Date
}

class TimetravelPanel extends React.Component<Props, State> {

  state: State
  nodeType: string
  timeContext: Date

  constructor(props) {
    super(props)

    const localeIso = () => {
      const date = new Date()
      const offsetMs = date.getTimezoneOffset() * 60 * 1000
      const msLocal = date.getTime() - offsetMs
      return new Date(msLocal)
    }

    this.timeContext = new Date()

    this.state = {
      data: new Array<any>(),
      nodeType: "",
      timeContext: localeIso()
    }
    this.refreshData()
  }

  refreshData() {
    var conf = new Configuration({ basePath: this.props.session.endpoint + "/api", accessToken: this.props.session.token })
    var api = new TopologyApi(conf)

    var nodes = "G"

    if (this.timeContext) {
      nodes += ".At(" + this.timeContext.getTime() + ", 300)"
    }

    nodes += ".V().HasNot('@DeleteAt')"

    if (this.nodeType) {
      nodes += ".Has('Type', '" + this.nodeType + "')"
    }

    api.searchTopology({ GremlinQuery: nodes + `.Dedup().Valuemap('Name', 'Type', '@CreatedAt')` }).then((result: Array<any>) => {
      if (result) {
        this.setState({
          data: result.sort((a, b) => {
            let n = b['@CreatedAt'] - a['@CreatedAt']
            if (n) return n
            return b['Name'].localeCompare(a['Name'])
          })
        })
      } else {
        this.setState({ data: [] })
      }
    })
  }

  render() {
    const { classes } = this.props

    const dateRender = (data: any) => {
      var createdAt = moment(data["@CreatedAt"]).format("L LTS")
      return (
        <React.Fragment>
          <Typography variant="body2" color="textSecondary">Navigate to:</Typography>
          <Chip size="small" color="primary" variant="outlined" label={createdAt}
            onClick={() => {
              let date = moment(createdAt).toDate()
              if (this.props.onNavigate) {
                this.props.onNavigate(date)
              }
            }
            } />
        </React.Fragment>
      )
    }

    const iconRender = (data: any) => {
      var className = classes.tabIconFree

      var id = data["@ID"]

      delete data['@ID']
      delete data['@CreateAt']

      var node = new Node(id, [], data)

      var attrs = this.props.config.nodeAttrs(node)
      var icon: string = attrs.icon
      var href: string = attrs.href

      if (attrs.iconClass === "font-brands") {
        className = classes.tabIconBrands
      }

      if (href) {
        return (
          <span className={attrs.classes.join(" ")}>
            <TimelineDot className="node-hexagon">
              <span className={className} style={{ cursor: "pointer" }}>
                <img src={href} className={classes.iconImg} />
              </span>
            </TimelineDot>
          </span>
        )
      }
      return (
        <span className={attrs.classes.join(" ")}>
          <TimelineDot className="node-hexagon">
            <span className={className} style={{ cursor: "pointer" }}>
              {icon}
            </span>
          </TimelineDot>
        </span>
      )
    }

    const uniq = (value: any, index: number, self) => {
      return self.indexOf(value) === index;
    }

    return (
      <div className={classes.panel}>
        <div className={classes.rightPanelPaperContent}>
          <Grid container spacing={3} direction="row" alignItems="flex-end">
            <Grid item xs={6}>
              <Autocomplete
                id="free-solo-demo"
                freeSolo
                value={this.state.nodeType}
                onChange={(event: any, newValue: any) => {
                  this.nodeType = newValue
                  this.setState({ nodeType: this.nodeType })

                  this.refreshData()
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()

                    this.refreshData()
                  }
                }}
                options={this.state.data.map((node: any) => node.Type).filter(uniq)}
                renderInput={(params) => (
                  <TextField {...params} label="Node type" margin="normal" />
                )}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                id="datetime-local"
                label="Time context"
                type="datetime-local"
                defaultValue={this.state.timeContext.toISOString().split(".")[0]}
                onChange={event => {
                  const { value } = event.target

                  this.timeContext = moment(value).toDate()
                  this.setState({ timeContext: this.timeContext })

                  this.refreshData()
                }}
                margin="normal"
                className={classes.textField}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
          </Grid>
          <div className={classes.content}>
            <Timeline align="alternate" className={classes.root}>
              {this.state.data.map((node: any, i: number) =>
                <TimelineItem key={i}>
                  <TimelineOppositeContent>
                    {dateRender(node)}
                  </TimelineOppositeContent>
                  <TimelineSeparator>
                    {iconRender(node)}
                    {(i < this.state.data.length - 1) &&
                      <TimelineConnector className={classes.connector} />
                    }
                  </TimelineSeparator>
                  <TimelineContent>
                    <Paper elevation={3} className={classes.paper}>
                      <Typography className={classes.title} variant="h6" component="h2"
                        style={{ cursor: "pointer" }}>
                        {node["Name"]}
                      </Typography>
                      <Typography className={classes.title}>{node["Type"]}</Typography>
                    </Paper>
                  </TimelineContent>
                </TimelineItem>
              )}
            </Timeline>
          </div>
        </div>
      </div>
    )
  }
}

export const mapStateToProps = (state: AppState) => ({
  session: state.session
})

export const mapDispatchToProps = ({})

export default withStyles(styles)(connect(mapStateToProps, mapDispatchToProps)(TimetravelPanel))
