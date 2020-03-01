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
import Paper from '@material-ui/core/Paper'
import { withStyles } from '@material-ui/core/styles'
import { Typography } from '@material-ui/core'

import { styles } from './PanelStyles'

interface Props {
    classes: any
    icon: any
    title: string
    content: any
}

interface State {
}

class Panel extends React.Component<Props, State> {

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
                    <div className={classes.headerContent}>
                        <Typography className={classes.icon}>
                            {this.props.icon}
                        </Typography>
                        <Typography>
                            {this.props.title}
                        </Typography>
                    </div>
                </div>
                <Paper className={classes.paper}>
                    {this.props.content}
                </Paper>
            </div>
        )
    }
}

export default withStyles(styles)(Panel)