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
import Accordion from '@material-ui/core/Accordion'
import AccordionSummary from '@material-ui/core/AccordionSummary'
import AccordionDetails from '@material-ui/core/AccordionDetails'
import ExpandMoreIcon from '@material-ui/icons/ExpandMore'
import InputLabel from '@material-ui/core/InputLabel'
import Select from '@material-ui/core/Select'
import MenuItem from '@material-ui/core/MenuItem'
import FormControl from '@material-ui/core/FormControl'
import Typography from '@material-ui/core/Typography'
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox'

import { Configuration } from '../api/configuration'
import Panel from './Panel'
import { CapturesApi } from '../api'
import { styles } from './CaptureFormStyles'
import { AppState, session } from '../Store'
import { connect } from 'react-redux'

interface Props {
    classes: any
    defaultName: string
    gremlin: string
    session: session
}

interface State {
    name: string
    description: string
    bpf: string
}

class CaptureForm extends React.Component<Props, State> {

    state: State

    constructor(props) {
        super(props)

        this.state = {
            name: "",
            description: "",
            bpf: ""
        }
    }

    onClick() {
        var conf = new Configuration({ accessToken: this.props.session.token })
        var api = new CapturesApi(conf)

        api.createCapture({ GremlinQuery: this.props.gremlin }).then(result => {
            console.log(result)
        })
    }

    render() {
        const { classes } = this.props

        return (
            <Panel icon={<VideocamIcon />} title="Packet capture" content={
                <React.Fragment>
                    <TextField
                        className={classes.textField}
                        label="Name"
                        margin="normal"
                        fullWidth
                        value={this.props.defaultName}
                    />
                    <TextField
                        className={classes.textField}
                        label="Description"
                        margin="normal"
                        multiline
                        fullWidth
                    />
                    <TextField
                        className={classes.textField}
                        label="Filter (BPF)"
                        margin="normal"
                        fullWidth
                    />
                    <Accordion className={classes.advanced}>
                        <AccordionSummary
                            expandIcon={<ExpandMoreIcon />}
                            aria-controls="panel1a-content"
                            id="panel1a-header"
                            className={classes.advancedSummary}
                        >
                            <Typography className={classes.heading}>Advanced options</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <FormControl className={classes.control}>
                                <InputLabel id="capture-type-label"
                                    className={classes.selectField}>Capture Type</InputLabel>
                                <Select
                                    id="capture-type"
                                    value="Default"
                                    labelId="capture-type-label"
                                >
                                    <MenuItem>Default</MenuItem>
                                    <MenuItem>PCAP (Packet Capture library based probe)</MenuItem>
                                    <MenuItem>AFPacket (MMap'd AF_PACKET socket reading)</MenuItem>
                                    <MenuItem>sFlow  (Socket reading sFlow frames)</MenuItem>
                                    <MenuItem>DPDK</MenuItem>
                                    <MenuItem>OVS Mirror  (Leverages mirroring to capture - experimental)</MenuItem>
                                    <MenuItem>eBPF (Flow capture within kernel - experimental)</MenuItem>
                                </Select>
                            </FormControl>
                            <FormControl className={classes.control}>
                                <InputLabel id="layer-key-label"
                                    className={classes.selectField}>Layers used for Flow Key</InputLabel>
                                <Select
                                    id="layer-key"
                                    value="Default"
                                    labelId="layer-key-label"
                                >
                                    <MenuItem>L2 (uses Layer 2 and beyond)</MenuItem>
                                    <MenuItem>L3 (uses layer 3 and beyond)</MenuItem>
                                </Select>
                            </FormControl>
                            <TextField
                                className={classes.textField}
                                label="Header size"
                                margin="normal"
                                fullWidth
                            />
                            <FormControl className={classes.control}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            value=""
                                            color="primary"
                                        />
                                    }
                                    label="Extra TCP metric"
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            value=""
                                            color="primary"
                                        />
                                    }
                                    label="Defragment IPv4 packets"
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            value=""
                                            color="primary"
                                        />
                                    }
                                    label="Reassemble TCP packets"
                                />
                            </FormControl>
                            <TextField
                                    className={classes.textField}
                                    label="Raw packet limit"
                                    margin="normal"
                                    fullWidth
                                    value="0"
                                />
                        </AccordionDetails>
                    </Accordion>
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