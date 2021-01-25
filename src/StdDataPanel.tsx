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
import Accordion from '@material-ui/core/Accordion'
import AccordionSummary from '@material-ui/core/AccordionSummary'
import AccordionDetails from '@material-ui/core/AccordionDetails'
import ExpandMoreIcon from '@material-ui/icons/ExpandMore'
import Typography from '@material-ui/core/Typography'
import { withStyles } from '@material-ui/core/styles'

import { DataViewer } from './StdDataViewer'
import { DataNormalizer, Result, Graph } from './StdDataNormalizer'
import { styles } from './StdDataPanelStyles'
import './StdDataPanel.css'

interface Props {
    title: string
    icon?: string
    iconClass?: string
    data?: any
    fetch?: () => Promise<any>
    classes: any
    defaultExpanded?: boolean
    normalizer?: (data: any) => any
    graph?: (data: any) => Graph
    exclude?: Array<string>
    sortKeys?: Array<string>
    filterKeys?: Array<string>
    defaultColumns?: Array<string>
}

interface State {
    data?: any
    result?: Result
    filterKeys?: Array<string>
    columns?: Array<string>
    error?: string
}

class DataPanel extends React.Component<Props, State> {

    state: State

    constructor(props) {
        super(props)

        this.state = {
            data: props.data,
            columns: props.columns,
        }
    }

    static normalizeData(data: any, normalizer?: (data: any) => any, graph?: (data: any) => Graph, exclude?: Array<string>, sortKeys?: Array<string>): Result {
        var dataNormalizer = new DataNormalizer(normalizer, graph, exclude, sortKeys)
        return dataNormalizer.normalize(data)
    }

    static normalizeFilterKeys(data: any, filterKeys: Array<string> | undefined): Array<string> | undefined {
        if (!filterKeys) {
            return
        }
        return filterKeys.filter(key => Boolean(data[key]))
    }

    static getDerivedStateFromProps(props, state) {
        return {
            data: props.data,
            columns: props.columns,
        }
    }

    componentDidMount() {
        this.refreshData()
    }

    private refreshData() {
        if (this.state.data) {
            this.setState({
                result: DataPanel.normalizeData(this.state.data, this.props.normalizer, this.props.graph, this.props.exclude, this.props.sortKeys),
                filterKeys: DataPanel.normalizeFilterKeys(this.state.data, this.props.filterKeys),
            })
        } else if (this.props.fetch) {
            this.props.fetch().then(data => {
                this.setState({
                    result: DataPanel.normalizeData(data, this.props.normalizer, this.props.graph, this.props.exclude, this.props.sortKeys),
                    filterKeys: DataPanel.normalizeFilterKeys(data, this.props.filterKeys),
                    error: undefined
                })
            }).catch(err => {
                this.setState({ error: err.message })
            })
        }
    }

    private onExpandChange(event: object, expanded: boolean) {
        if (expanded) {
            this.refreshData()
        }
    }

    private onFilterReset() {
        this.refreshData()
    }

    render() {
        const { classes } = this.props

        const iconClass = this.props.iconClass === "font-brands" ? classes.panelIconBrands : classes.panelIconFree

        var details = <Typography>No data available</Typography>
        if (this.state.error) {
            details = <Typography>{this.state.error}</Typography>
        } else if (this.state.result && this.state.result.rows.length) {
            details = <DataViewer columns={this.state.result.columns} data={this.state.result.rows} filterKeys={this.state.filterKeys}
                graph={this.state.result.graph} details={this.state.result.details} onFilterReset={this.onFilterReset.bind(this)}
                defaultColumns={this.props.defaultColumns} />
        }

        return (
            <Accordion defaultExpanded={this.props.defaultExpanded} onChange={this.onExpandChange.bind(this)} TransitionProps={{ unmountOnExit: true }}>
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls="panel1a-content"
                    id="panel1a-header">
                    <Typography className={iconClass}>{this.props.icon}</Typography>
                    <Typography>{this.props.title}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    {details}
                </AccordionDetails>
            </Accordion>
        )
    }
}

export default withStyles(styles)(DataPanel)