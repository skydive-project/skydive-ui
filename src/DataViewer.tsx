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

interface State {
    isExpanded: boolean
}

export class DataViewer extends React.Component<Props, State> {

    state: State

    constructor(props) {
        super(props)

        this.state = {
            isExpanded: props.defaultExpanded
        }
    }

    private extractMap(data: any): { columns: Array<string>, data: Array<Array<any>> } {
        var result = {
            columns: new Array<string>(),
            data: new Array<Array<any>>()
        }

        result.columns = ["Key", "Value"]

        for (let attr in data) {
            let value = data[attr]
            switch (typeof value) {
                case "object":
                    break
                case "boolean":
                    result.data.push([attr, value ? "true" : "false"])
                    break
                default:
                    result.data.push([attr, value])
                    break
            }
        }

        return result
    }

    private extractScalarArray(data: any): { columns: Array<string>, data: Array<Array<any>> } {
        var result = {
            columns: new Array<string>(),
            data: new Array<Array<any>>()
        }

        result.columns = ["Value"]

        for (let value of data) {
            if (typeof value === "boolean") {
                result.data.push([value ? "true" : "false"])
            } else {
                result.data.push([value])
            }
        }

        return result
    }

    private extractObjectArray(data: any): { columns: Array<string>, data: Array<Array<any>> } {
        var result = {
            columns: new Array<string>(),
            data: new Array<Array<any>>()
        }

        var colIndex = new Map<string, number>()
        for (let value of data) {
            // get columns
            for (let attr in value) {
                let index = colIndex.get(attr)
                if (index === undefined) {
                    colIndex.set(attr, result.columns.length)

                    result.columns.push(attr)
                }
            }

            // fill with empty values
            var entry = new Array<any>()
            for (let i = 0; i !== result.columns.length; i++) {
                entry.push("")
            }

            var hasValue = false
            for (let attr in value) {
                let index = colIndex.get(attr)
                if (index === undefined) {
                    continue
                }

                var type = typeof value[attr]
                if (type === "boolean") {
                    entry[index] = value[attr] ? "true" : "false"
                } if (type === "string" || type === "number") {
                    entry[index] = value[attr] === null ? "" : value[attr]
                } else {
                    continue
                }
                hasValue = true
            }

            if (hasValue) {
                result.data.push(entry)
            }
        }

        return result
    }

    private extractArray(data: any): { columns: Array<string>, data: Array<Array<any>> } {
        if ((data as Array<any>).some(value => typeof value === "object")) {
            return this.extractObjectArray(data)
        }

        return this.extractScalarArray(data)
    }

    private extractTableData(data: any): { columns: Array<string>, data: Array<Array<any>> } {
        var result = {
            columns: new Array<string>(),
            data: new Array<Array<any>>()
        }

        if (Array.isArray(data)) {
            return this.extractArray(data)
        }

        if (typeof data === "object") {
            return this.extractMap(data)
        }

        return result
    }

    onChange(event: object, expanded: boolean) {
        this.setState({ isExpanded: expanded })
    }

    render() {
        const { classes } = this.props

        const Table = (props) => {
            var data = this.extractTableData(this.props.data)
            if (this.state.isExpanded && data.data.length) {
                return <TableDataViewer columns={data.columns} data={data.data} />
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