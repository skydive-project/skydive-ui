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

import './TableDataViewer.css'

interface Props {
    title?: string
    columns: Array<string>
    data: Array<Array<any>>
}

export class TableDataViewer extends React.Component<Props, {}> {
    
    constructor(props) {
        super(props)
    }

    render() {
        const options = {
            filterType: 'checkbox',
            selectableRows: 'none',
            responsive: 'stacked',
            print: false,
            download: false
        };

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