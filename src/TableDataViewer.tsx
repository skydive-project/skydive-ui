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
import MUIDataTable from "mui-datatables"
import { Column } from "./TableDataNormalizer"

import "./TableDataViewer.css"
import { filter } from "minimatch";

interface Props {
    title?: string
    columns: Array<Column>
    data: Array<Array<any>>
}

interface State {
    sortField: string
    sortDirection: string
    filterList: Map<string, Array<any>>
}

export class TableDataViewer extends React.Component<Props, State> {

    state: State

    constructor(props) {
        super(props)

        this.state = {
            sortField: "",
            sortDirection: "none",
            filterList: new Map<string, Array<any>>()
        }
    }

    render() {
        const options = {
            filterType: 'multiselect',
            selectableRows: 'none',
            responsive: 'stacked',
            print: false,
            download: false,
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
            <MUIDataTable
                title={this.props.title}
                data={this.props.data}
                columns={this.props.columns}
                options={options}
            />
        )
    }
}