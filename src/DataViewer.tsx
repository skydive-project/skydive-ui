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
import ExpansionPanel from '@material-ui/core/ExpansionPanel'
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails'
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary'
import ExpandMoreIcon from '@material-ui/icons/ExpandMore'
import Typography from '@material-ui/core/Typography'
import { TableDataViewer } from './TableDataViewer'
import { DataNormalizer } from './DataNormalizer'

interface Props {
    title: string
    data: Array<Array<any>>
    classes: any
    defaultExpanded?: boolean
    normalizer?: (data: any) => any
    flatten?: boolean
}

interface State {
    isExpanded: boolean
}

export class DataViewer extends React.Component<Props, State> {

    state: State
    dataNormalizer: DataNormalizer

    constructor(props) {
        super(props)

        this.state = {
            isExpanded: props.defaultExpanded
        }

        this.dataNormalizer = new DataNormalizer(props.normalizer)
    }

    onChange(event: object, expanded: boolean) {
        this.setState({ isExpanded: expanded })
    }

    render() {
        const { classes } = this.props

        const Table = (props) => {
            // copy so that we can normalize without altering the original data
            var data = JSON.parse(JSON.stringify(this.props.data))

            data = this.dataNormalizer.normalize(data)
            if (this.state.isExpanded && data.rows.length) {
                return <TableDataViewer columns={data.columns} data={data.rows} />
            }

            return null
        }

        if (this.props.data) {
            return (
                <ExpansionPanel defaultExpanded={this.props.defaultExpanded} onChange={this.onChange.bind(this)}>
                    <ExpansionPanelSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls="panel1a-content"
                        id="panel1a-header">
                        <Typography className={classes.heading}>{this.props.title}</Typography>
                    </ExpansionPanelSummary>
                    <ExpansionPanelDetails>
                        <Table />
                    </ExpansionPanelDetails>
                </ExpansionPanel>
            )
        }
        return null
    }
}