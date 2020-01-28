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
import DataPanel from './DataPanel'
import './DataPanel.css'
import { AppState, session } from './Store'
import { connect } from 'react-redux'
import { Configuration } from './api/configuration'
import { TopologyApi } from './api'
import Tools from './Tools'

interface Props {
    classes?: any
    title: string
    gremlinExpr: string
    session: session
}

interface State {
    data: any
}

class FlowPanel extends React.Component<Props, State> {

    state: State

    constructor(props) {
        super(props)

        this.state = {
            data: []
        }
    }

    componentDidMount() {
        this.fetchData()
    }

    normalizer(data: Array<any>): any {
        return data.map(flow => {

            console.log(flow)

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

                "Last.ABPackets": flow.LastUpdateMetric.ABPAckets,
                "Last.BAPackets": flow.LastUpdateMetric.BAPAckets,
                "Last.ABBytes": Tools.prettyBytes(flow.LastUpdateMetric.ABBytes),
                "Last.BABytes": Tools.prettyBytes(flow.LastUpdateMetric.BABytes),
                "Last.RTT": (flow.LastUpdateMetric.RTT / 1000000) + " ms",

                "Start": flow.Start,
                "Last": flow.Last
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

        api.searchTopology({ GremlinQuery: this.props.gremlinExpr }).then(result => {
            this.setState({ data: result })
        })
    }

    render() {
        const defaultColumns = ["Application", "Network.A", "Network.B", "Transport.A", "Transport.B", "Total.ABBytes", "Total.BAPackets"]

        return (
            <DataPanel title={this.props.title}
                defaultExpanded={false} data={this.state.data} defaultColumns={defaultColumns}
                icon={"\uf0ce"} normalizer={this.normalizer.bind(this)} />
        )
    }
}

export const mapStateToProps = (state: AppState) => ({
    session: state.session
})

export const mapDispatchToProps = ({
})

export default connect(mapStateToProps, mapDispatchToProps)(FlowPanel)
