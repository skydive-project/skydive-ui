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

import DataPanel from '../StdDataPanel'
import '../StdDataPanel.css'
import { AppState, session } from '../Store'
import { Configuration } from '../api/configuration'
import { TopologyApi } from '../api'
import Tools from '../Tools'
import { Node, Link } from '../Topology'
import { styles } from './FlowStyles'

interface Props {
    classes: any
    el: Node | Link
    session: session
}

interface State {
    data: any
}

class FlowPanel extends React.Component<Props, State> {

    state: State
    gremlin: string

    constructor(props) {
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
            var result = {
                "Application": flow.Application,
                "LayersPath": flow.LayersPath,

                "L3TrackingID": flow.L3TrackingID,
                "ParentUUID": flow.ParentUUID,
                "RawPacketsCaptured": flow.RawPacketsCaptured,
                "NodeTID": flow.NodeTID,

                "Total.ABPackets": flow.Metric.ABPAckets,
                "Total.BAPackets": flow.Metric.BAPAckets,
                "Total.ABBytes": Tools.prettyBytes(flow.Metric.ABBytes),
                "Total.BABytes": Tools.prettyBytes(flow.Metric.BABytes),

                "Start": flow.Start,
                "Last": flow.Last
            }

            if (flow.LastUpdateMetric) {
                result["Last.ABPackets"] = flow.LastUpdateMetric.ABPAckets
                result["Last.BAPackets"] = flow.LastUpdateMetric.BAPAckets
                result["Last.ABBytes"] = Tools.prettyBytes(flow.LastUpdateMetric.ABBytes)
                result["Last.BABytes"] = Tools.prettyBytes(flow.LastUpdateMetric.BABytes)
                result["Last.RTT"] = (flow.LastUpdateMetric.RTT / 1000000) + " ms"
            }

            if (flow.Link) {
                result["Link.ID"] = flow.Link.ID
                result["Link.Protocol"] = flow.Link.Protocol
                result["Link.A"] = flow.Link.A
                result["Link.B"] = flow.Link.B
            }

            if (flow.Network) {
                result["Network.ID"] = flow.Network.ID
                result["Network.Protocol"] = flow.Network.Protocol
                result["Network.A"] = flow.Network.A
                result["Networl.B"] = flow.Network.B
            }

            if (flow.Transport) {
                result["Transport.ID"] = flow.Transport.ID
                result["Transport.Protocol"] = flow.Transport.Protocol
                result["Transport.A"] = flow.Transport.A
                result["Transport.B"] = flow.Transport.B
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

        const defaultColumns = ["Application", "Network.A", "Network.B", "Transport.A", "Transport.B", "Total.ABBytes", "Total.BAPackets"]

        return (
            <div className={classes.panel}>
                <DataPanel title="Flow table"
                    defaultExpanded={false} data={this.state.data} defaultColumns={defaultColumns}
                    icon={"\uf0ce"} normalizer={this.normalizer.bind(this)} />
            </div>
        )
    }
}

export const mapStateToProps = (state: AppState) => ({
    session: state.session
})

export const mapDispatchToProps = ({
})

export default connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(FlowPanel))