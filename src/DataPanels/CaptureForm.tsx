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
import TextField from '@material-ui/core/TextField'
import Button from '@material-ui/core/Button'
import { withStyles } from '@material-ui/core/styles'
import VideocamIcon from '@material-ui/icons/Videocam'
import ExpansionPanel from '@material-ui/core/ExpansionPanel'
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary'
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails'
import ExpandMoreIcon from '@material-ui/icons/ExpandMore'
import InputLabel from '@material-ui/core/InputLabel'
import Select from '@material-ui/core/Select'
import MenuItem from '@material-ui/core/MenuItem'
import FormControl from '@material-ui/core/FormControl'
import Typography from '@material-ui/core/Typography'
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox'
import { DataPanel, AppState, Session } from 'graffiti-ui'
import { connect } from 'react-redux'

import { Configuration } from '../api/configuration'
import { CapturesApi } from '../api'
import { styles } from './CaptureFormStyles'

interface Props {
    classes: any
    name: string
    gremlin: string
    type: string

    session: Session
}

interface State {
    name: string
    description: string
    bpf: string
    headerSize: number
    rawPacketLimit: number
    captureType: string
    layerKey: string
    reassemble: boolean
    defragment: boolean
    extraTCP: boolean
}

class CaptureForm extends React.Component<Props, State> {

    state: State

    constructor(props: Props) {
        super(props)

        this.state = {
            name: "",
            description: "",
            bpf: "",
            headerSize: 0,
            rawPacketLimit: 0,
            captureType: "",
            layerKey: "",
            reassemble: false,
            defragment: false,
            extraTCP: false
        }
    }

    static getDerivedStateFromProps(props: Props, state: State) {
        state.name = props.name
        return state
    }

    onClick() {
        var conf = new Configuration({ accessToken: this.props.session.token })
        var api = new CapturesApi(conf)

        api.createCapture({ GremlinQuery: this.props.gremlin }).then(result => {
            console.log(result)
        })
    }

    renderCaptureTypes(): Array<JSX.Element> {
        const pcapSocket = <MenuItem key="pcapsocket" value="pcapsocket">PCAP Socket - Socket reading PCAP format data</MenuItem>

        var result = new Array<JSX.Element>()
        switch (this.props.type) {
            case "ovsbridge":
                result.push(<MenuItem key="ovsnetflow" value="ovsnetflow">PCAP - Packet Capture library based probe</MenuItem>)
                result.push(<MenuItem key="ovssflow" value="ovssflow">AFPacket - MMap'd AF_PACKET socket reading</MenuItem>)
                result.push(pcapSocket)
            case "ovsport":
                result.push(<MenuItem key="ovsmirror" value="ovsmirror">OVS Mirror - Leverages mirroring to capture</MenuItem>)
            case "dpdkport":
                result.push(<MenuItem key="dpdk" value="dpdk">DPDK - DPDK based probe</MenuItem>)
            default:
                result.push(<MenuItem key="pcap" value="pcap">PCAP - Packet Capture library based probe</MenuItem>)
                result.push(<MenuItem key="afpacket" value="afpacket">AFPacket - MMap'd AF_PACKET socket reading</MenuItem>)
                result.push(<MenuItem key="sflow" value="sflow">sFlow - Socket reading sFlow frames</MenuItem>)
                result.push(<MenuItem key="ebpf" value="ebpf">eBPF - low capture within kernel</MenuItem>)
                result.push(pcapSocket)
        }

        return result
    }

    render() {
        const { classes } = this.props

        return (
            <DataPanel icon={<VideocamIcon />} title="Packet capture" content={
                <React.Fragment>
                    <Typography>{this.state.captureType}</Typography>
                    <TextField
                        id="standard-basic"
                        className={classes.textField}
                        label="Name"
                        margin="normal"
                        fullWidth
                        value={this.state.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => this.setState({ name: e.target.value })}
                    />
                    <TextField
                        id="standard-basic"
                        className={classes.textField}
                        label="Description"
                        margin="normal"
                        multiline
                        fullWidth
                        value={this.state.description}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => this.setState({ description: e.target.value })}
                    />
                    <TextField
                        id="standard-basic"
                        className={classes.textField}
                        label="Filter (BPF)"
                        margin="normal"
                        fullWidth
                        value={this.state.bpf}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => this.setState({ bpf: e.target.value })}
                    />
                    <ExpansionPanel className={classes.advanced}>
                        <ExpansionPanelSummary
                            expandIcon={<ExpandMoreIcon />}
                            aria-controls="panel1a-content"
                            id="panel1a-header"
                            className={classes.advancedSummary}
                        >
                            <Typography className={classes.heading}>Advanced options</Typography>
                        </ExpansionPanelSummary>
                        <ExpansionPanelDetails>
                            <FormControl className={classes.control}>
                                <InputLabel id="capture-type-label"
                                    className={classes.selectField}>Capture Type</InputLabel>
                                <Select
                                    id="capture-type"
                                    labelId="capture-type-label"
                                    value={this.state.captureType}
                                    onChange={(e: React.ChangeEvent<{ value: unknown }>) => this.setState({ captureType: e.target.value as string })}
                                >
                                    <MenuItem value=""><em>Default</em></MenuItem>
                                    {this.renderCaptureTypes()}
                                </Select>
                            </FormControl>
                            <FormControl className={classes.control}>
                                <InputLabel id="layer-key-label"
                                    className={classes.selectField}>Layers used for Flow Key</InputLabel>
                                <Select
                                    id="layer-key"
                                    labelId="layer-key-label"
                                    value={this.state.layerKey}
                                    onChange={(e: React.ChangeEvent<{ value: unknown }>) => this.setState({ layerKey: e.target.value as string })}
                                >
                                    <MenuItem value=""><em>Default</em></MenuItem>
                                    <MenuItem value="L2">L2 (uses Layer 2 and beyond)</MenuItem>
                                    <MenuItem value="L3">L3 (uses layer 3 and beyond)</MenuItem>
                                </Select>
                            </FormControl>
                            <TextField
                                id="standard-basic"
                                className={classes.textField}
                                label="Header size"
                                margin="normal"
                                fullWidth
                                value={this.state.headerSize}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => this.setState({ headerSize: parseInt(e.target.value) })}
                            />
                            <FormControl className={classes.control}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            value=""
                                            color="primary"
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => this.setState({ extraTCP: e.target.checked })}
                                        />
                                    }
                                    label="Extra TCP metric"
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            value=""
                                            color="primary"
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => this.setState({ defragment: e.target.checked })}
                                        />
                                    }
                                    label="Defragment IPv4 packets"
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            value=""
                                            color="primary"
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => this.setState({ reassemble: e.target.checked })}
                                        />
                                    }
                                    label="Reassemble TCP packets"
                                />
                            </FormControl>
                            <TextField
                                id="standard-basic"
                                className={classes.textField}
                                label="Raw packet limit"
                                margin="normal"
                                fullWidth
                                value={this.state.rawPacketLimit}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => this.setState({ rawPacketLimit: parseInt(e.target.value) })}
                            />
                        </ExpansionPanelDetails>
                    </ExpansionPanel>
                    <Button variant="contained" className={classes.button} color="primary" onClick={this.onClick.bind(this)}>
                        Start
                    </Button>
                </React.Fragment>
            } />
        )
    }
}

export const mapStateToProps = (state: AppState) => ({
    session: state.session
})

export const mapDispatchToProps = ({
})

export default withStyles(styles)(connect(mapStateToProps, mapDispatchToProps)(CaptureForm))