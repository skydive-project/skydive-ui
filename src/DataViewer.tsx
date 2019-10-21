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
import { Chart } from 'react-google-charts'
import { Column, Graph } from './DataNormalizer'

import './DataViewer.css'

interface Props {
    title?: string
    columns: Array<Column>
    data: Array<Array<any>>
    graph?: Graph
}

interface State {
    sortField: string
    sortDirection: string
    filterList: Map<string, Array<any>>
    graph?: Graph
}

export class DataViewer extends React.Component<Props, State> {

    state: State

    constructor(props) {
        super(props)

        this.state = {
            sortField: "",
            sortDirection: "none",
            filterList: new Map<string, Array<any>>()
        }
    }

    static getDerivedStateFromProps(props, state) {
        if (props.graph) {
            var graph = props.graph
            if (state.graph) {
                graph.data = state.graph.data.concat(graph.data.slice(1))
            }
            return {
                graph: graph
            }
        }
        return null
    }

    render() {
        const options = {
            filterType: 'multiselect',
            selectableRows: 'none',
            responsive: 'stacked',
            print: false,
            download: false,


            /*expandableRows: true,
            expandableRowsOnClick: true,
            isRowExpandable: (dataIndex, expandedRows) => {
              return true;
            },
            rowsExpanded: [0, 1],
            renderExpandableRow: (rowData, rowMeta) => {
              const colSpan = rowData.length + 1
              return (
                <div>caca</div>
              )
            },
            onRowsExpand: (curExpanded, allExpanded) => console.log(curExpanded, allExpanded),*/

            onColumnSortChange: (field: string, direction: string) => {
                this.setState({ sortField: field, sortDirection: direction })
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
            }
        };

        // re-apply sort and filter if need
        for (let column of this.props.columns) {
            if (column.name === this.state.sortField && this.state.sortDirection) {
                switch (this.state.sortDirection) {
                    case "ascending":
                        column.options.sortDirection = "asc"
                        break
                    case "descending":
                        column.options.sortDirection = "desc"
                        break
                    default:
                        column.options.sortDirection = "none"
                        break
                }
            }
            let filterList = this.state.filterList.get(column.name)
            if (filterList) {
                column.options.filterList = filterList
            }
        }

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