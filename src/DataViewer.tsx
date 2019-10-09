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

interface Props {
    title: string
    data: Array<Array<any>>
    classes: any
    defaultExpanded?: boolean
}

export class DataViewer extends React.Component<Props, {}> {

    constructor(props) {
        super(props)
    }

    private extractTableData(data: any): { columns: Array<string>, data: Array<Array<any>> } {
        var result = {
            columns: new Array<string>(),
            data: new Array<Array<any>>()
        }

        if (Array.isArray(data)) {
            result.columns = ["Value"]
        } else if (typeof data === "object") {
            result.columns = ["Key", "Value"]
        }

        for (let attr in data) {
            let value = data[attr]

            let entry = new Array<any>()
            switch (typeof value) {
                case "object":
                    break
                case "boolean":
                    entry.push(value ? "true" : "false")
                    break
                case "string":
                    if (value != "") {
                        entry.push(value)
                    }
                    break
                default:
                    entry.push(value)
                    break
            }

            if (entry.length) {
                if (!Array.isArray(data)) {
                    entry.unshift(attr)
                }
            
                result.data.push(entry)
            }
        }

        return result
    }

    render() {
        const { classes } = this.props

        var data = this.extractTableData(this.props.data)
        if (data.data.length) {
            return (
                <ExpansionPanel defaultExpanded={this.props.defaultExpanded}>
                    <ExpansionPanelSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls="panel1a-content"
                        id="panel1a-header">
                        <Typography className={classes.heading}>{this.props.title}</Typography>
                    </ExpansionPanelSummary>
                    <ExpansionPanelDetails>
                        <TableDataViewer columns={data.columns} data={data.data} />
                    </ExpansionPanelDetails>
                </ExpansionPanel>
            )
        }
        return null
    }
}