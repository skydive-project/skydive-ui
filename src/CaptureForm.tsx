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
import Paper from '@material-ui/core/Paper'
import Button from '@material-ui/core/Button'
import { withStyles } from '@material-ui/core/styles'
import { styles } from './CaptureFormStyles'

interface Props {
    classes: any
}

interface State {
}

class CaptureForm extends React.Component<Props, State> {

    state: State

    constructor(props) {
        super(props)

        this.state = {
        }
    }

    render() {
        const { classes } = this.props

        return (
            <div className={classes.container}>
                <div className={classes.header}>

                </div>
                <Paper className={classes.paper}>
                    <TextField
                        id="standard-basic"
                        className={classes.textField}
                        label="Name"
                        margin="normal"
                        fullWidth
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
                    <Button variant="contained" className={classes.button} color="primary">
                        Start
                </Button>
                </Paper>
            </div>
        )
    }
}

export default withStyles(styles)(CaptureForm)