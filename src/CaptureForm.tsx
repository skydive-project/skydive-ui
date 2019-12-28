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

import { Configuration } from './api/configuration'
import ActionPanel from './ActionPanel'
import { CapturesApi } from './api'
import { styles } from './CaptureFormStyles'
import { AppState, session } from './Store'
import { connect } from 'react-redux'

interface Props {
    classes: any
    defaultName: string
    gremlinExpr: string
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

        api.createCapture({ GremlinQuery: this.props.gremlinExpr }).then(result => {
            console.log(result)
        })
    }

    render() {
        const { classes } = this.props

        return (
            <ActionPanel icon={<VideocamIcon />} title="Packet capture" content={
                <React.Fragment>
                    <TextField
                        id="standard-basic"
                        className={classes.textField}
                        label="Name"
                        margin="normal"
                        fullWidth
                        value={this.props.defaultName}
                    />
                    <TextField
                        id="standard-basic"
                        className={classes.textField}
                        label="Description"
                        margin="normal"
                        multiline
                        fullWidth
                    />
                    <TextField
                        id="standard-basic"
                        className={classes.textField}
                        label="Filter (BPF)"
                        margin="normal"
                        fullWidth
                    />
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