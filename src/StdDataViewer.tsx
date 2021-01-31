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
import MUIDataTable from 'mui-datatables'
import TableRow from "@material-ui/core/TableRow"
import TableCell from "@material-ui/core/TableCell"
import { Chart } from 'react-google-charts'
import JSONTree from 'react-json-tree'
import FilterNoneIcon from '@material-ui/icons/FilterNone'
import IconButton from '@material-ui/core/IconButton'
import Tooltip from '@material-ui/core/Tooltip'

import { Column, Graph } from './StdDataNormalizer'
import './StdDataViewer.css'

interface Props {
    title?: string
    columns: Array<Column>
    data: Array<Array<any>>
    graph?: Graph
    details: Map<number, any>
    filterKeys?: Array<string>
    onFilterReset?: () => void
    defaultColumns?: Array<string>
}

interface State {
    sortOrder: Map<any, any>
    sortField: string
    filterList: Map<string, Array<any>>
    graph?: Graph
    rowsExpanded: Array<number>
}

export class DataViewer extends React.Component<Props, State> {

    state: State
    applyDefaultColumns: boolean

    constructor(props) {
        super(props)

        this.applyDefaultColumns = true

        this.state = {
            sortOrder: new Map<any, any>(),
            sortField: "",
            filterList: new Map<string, Array<any>>(),
            rowsExpanded: new Array<number>()
        }
    }

    static getDerivedStateFromProps(props, state) {
        if (props.defaultColumns) {
            state.defaultColumns = props.defaultColumns
        }

        if (props.graph) {
            if (state.graph) {
                state.graph.data = state.graph.data.concat(props.graph.data.slice(1))
            } else {
                state.graph = props.graph
            }
        }

        return state
    }

    private resetFilter() {
        this.setState({ filterList: new Map<string, Array<any>>() })

        if (this.props.onFilterReset) {
            this.props.onFilterReset()
        }
    }

    render() {
        const options = {
            filterType: 'multiselect',
            selectableRows: 'none',
            responsive: 'vertical',
            print: false,
            download: false,
            customToolbar: () => {
                return (
                    <Tooltip title="Apply default filters" aria-label="Apply default filters">
                        <IconButton onClick={this.resetFilter.bind(this)}>
                            <FilterNoneIcon />
                        </IconButton>
                    </Tooltip>
                )
            },
            setRowProps: (row, dataIndex) => {
                if (!this.props.details.get(dataIndex)) {
                    return { "className": "not-expandable" }
                }
                return {}
            },
            expandableRows: true,
            expandableRowsHeader: false,
            expandableRowsOnClick: true,
            isRowExpandable: (dataIndex, expandedRows) => {
                if (this.props.details.get(dataIndex)) {
                    return true
                }
                return false
            },
            renderExpandableRow: (rowData, rowMeta) => {
                const colSpan = rowData.length
                return (
                    <TableRow>
                        <TableCell />
                        <TableCell colSpan={colSpan}>
                            <JSONTree data={this.props.details.get(rowMeta.dataIndex)} theme="bright"
                                invertTheme={true} sortObjectKeys={true} hideRoot={true} />
                        </TableCell>
                    </TableRow>
                )
            },
            rowsExpanded: this.state.rowsExpanded,
            onRowExpansionChange: (currentRowsExpanded, allRowsExpanded) => {
                this.setState({ rowsExpanded: allRowsExpanded.map(entry => entry.dataIndex) })
            },
            onColumnSortChange: (field: string, direction: string) => {
                this.setState({ sortField: field })
            },
            onColumnViewChange: (column: string, action: string) => {
            },
            onFilterChange: (field: string, filterList: Array<any>) => {
                var newList = new Array<any>()

                filterList.forEach((a: Array<any>) => {
                    if (a.length) {
                        newList = newList.concat(a)
                    }
                })

                this.state.filterList.set(field, newList)
                this.setState({ filterList: this.state.filterList })
            },
            sortOrder: this.state.sortOrder
        }

        // re-apply sort and filter if need
        for (let column of this.props.columns) {
            if (this.applyDefaultColumns && this.props.defaultColumns) {
                if (!this.props.defaultColumns.includes(column.name)) {
                    column.options.display = 'false'
                }
            }

            // use value from config first
            if (column.name === "Key" && this.props.filterKeys) {
                column.options.filterList = this.props.filterKeys
            }

            let filterList = this.state.filterList.get(column.name)
            if (filterList) {
                column.options.filterList = filterList
            }
        }
        this.applyDefaultColumns = false

        return (
            <React.Fragment>
                <MUIDataTable
                    title={this.props.title}
                    data={this.props.data}
                    columns={this.props.columns}
                    options={options} />
                {
                    this.state.graph &&
                    <Chart
                        height={300}
                        chartType={this.state.graph.type}
                        loader={<div>Loading Chart</div>}
                        data={this.state.graph.data}
                        options={{
                            chart: {
                            },
                        }}
                    />
                }
            </React.Fragment>
        )
    }
}