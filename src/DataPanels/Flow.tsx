/*
 * Copyright (C) 2020 Sylvain Afchain
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
import Collapse from '@material-ui/core/Collapse'
import { Node, Link, DataViewerPanel, AppState, Session } from 'graffiti-ui'

import { Configuration } from '../api/configuration'
import { TopologyApi } from '../api'
import Tools from '../Tools'
import { styles } from './FlowStyles'

interface Props {
    classes: any
    el: Node | Link
    expanded: boolean

    session: Session
}

interface State {
    data: any
}

class FlowPanel extends React.Component<Props, State> {

    state: State
    gremlin: string

    constructor(props: Props) {
        super(props)

        this.state = {
            data: []
        }

        this.gremlin = `G.V('${this.props.el.id}').Flows()`
    }

    componentDidMount() {
        this.fetchData()
    }

    normalizer(data: Array<any>): any {
        return data.map(flow => {

            // TODO(safchain) add more
            var result: any = {
                "Application": flow.Application,
                "LayersPath": flow.LayersPath,

                "L3TrackingID": flow.L3TrackingID,
                "ParentUUID": flow.ParentUUID,
                "RawPacketsCaptured": flow.RawPacketsCaptured,
                "NodeTID": flow.NodeTID,

                "Total ABPackets": flow.Metric.ABPackets,
                "Total BAPackets": flow.Metric.BAPackets,
                "Total ABBytes": Tools.prettyBytes(flow.Metric.ABBytes),
                "Total BABytes": Tools.prettyBytes(flow.Metric.BABytes),

                "Total Packets": flow.Metric.ABPackets + flow.Metric.BAPackets,
                "Total Bytes": Tools.prettyBytes(flow.Metric.ABBytes + flow.Metric.BABytes),

                "Start": flow.Start,
                "Last": flow.Last
            }

            if (flow.LastUpdateMetric) {
                result["Last ABPackets"] = flow.LastUpdateMetric.ABPAckets
                result["Last BAPackets"] = flow.LastUpdateMetric.BAPAckets
                result["Last ABBytes"] = Tools.prettyBytes(flow.LastUpdateMetric.ABBytes)
                result["Last BABytes"] = Tools.prettyBytes(flow.LastUpdateMetric.BABytes)
                result["Last RTT"] = (flow.LastUpdateMetric.RTT / 1000000) + " ms"
            }

            if (flow.Link) {
                result["Link ID"] = flow.Link.ID
                result["Link Protocol"] = flow.Link.Protocol
                result["Link A"] = flow.Link.A
                result["Link B"] = flow.Link.B
            }

            if (flow.Network) {
                result["Network ID"] = flow.Network.ID
                result["Network Protocol"] = flow.Network.Protocol
                result["Network A"] = flow.Network.A
                result["Network B"] = flow.Network.B
            }

            if (flow.Transport) {
                result["Transport ID"] = flow.Transport.ID
                result["Transport Protocol"] = flow.Transport.Protocol
                result["Port A"] = flow.Transport.A
                result["Port B"] = flow.Transport.B
            }

            return result
        })
    }

    fetchData(): any {
        var conf = new Configuration({ accessToken: this.props.session.token })
        var api = new TopologyApi(conf)

        api.searchTopology({ GremlinQuery: this.gremlin }).then(result => {
            this.setState({ data: result })
        })
    }

    render() {
        var classes = this.props.classes

        const defaultColumns = ["Application", "Network B", "Port B", "Total Bytes", "Total Packets"]

        return (
            <Collapse in={this.props.expanded} timeout="auto" unmountOnExit className={classes.panel}>
                <DataViewerPanel title="Flow table"
                    defaultExpanded={true} data={this.state.data} defaultColumns={defaultColumns}
                    icon={"\uf0ce"} normalizer={this.normalizer.bind(this)} />
            </Collapse>
        )
    }
}

export const mapStateToProps = (state: AppState) => ({
    session: state.session
})

export const mapDispatchToProps = ({
})

export default connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(FlowPanel))