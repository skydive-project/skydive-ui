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

import { GoogleChartWrapperChartType } from 'react-google-charts/dist/types'

export interface Graph {
    type: GoogleChartWrapperChartType
    data: Array<Array<any>>
}

export interface Column {
    name: string
    options: {
        sortDirection: string
        filterList: Array<any>
        display: string
    }
}

interface Row {
    entries: Map<string, any>
    details: any
}

export class Result {
    private _columns: Array<Column>
    private _rows: Array<Row>
    graph?: Graph

    private colIndexes: Map<string, number>

    constructor() {
        this._columns = new Array<Column>()
        this._rows = new Array<Row>()

        this.colIndexes = new Map<string, number>()
    }

    addColumn(name: string) {
        let index = this.colIndexes.get(name)
        if (index === undefined) {
            this.colIndexes.set(name, this._columns.length)

            let dir = this._columns.length === 0 ? 'none' : 'none'

            this._columns.push({ "name": name, options: { sortDirection: dir, filterList: new Array<any>(), display: 'true' } })
        }
    }

    columnIndex(name: string): number | undefined {
        return this.colIndexes.get(name)
    }

    newRow(): Row {
        return { entries: new Map<string, any>(), details: null }
    }

    addRow(row: Row) {
        if (row.entries.size) {
            for (let key of row.entries.keys()) {
                this.addColumn(key)
            }

            this._rows.push(row)
        }
    }

    // sort only if the format in key-value
    sortRowsByKeys(keys: Array<string>) {
        if (this._columns.length === 2 && this._columns[0].name === "Key") {
            this._rows = this._rows.sort((a, b) => {
                var ka = a.entries.get("Key"), kb = b.entries.get("Key")
                var ia = keys.indexOf(ka), ib = keys.indexOf(kb)

                if (ia === ib) return ka.localeCompare(kb) // -1 == -1
                if (ia === -1) return 1
                if (ib === -1) return -1
                return ia - ib
            })
        }
    }

    get rows(): Array<Array<any>> {
        var rows = new Array<Array<any>>()
        for (let row of this._rows) {
            let plain = new Array<any>()
            for (let i = 0; i != this.colIndexes.size; i++) {
                plain[i] = ""
            }

            row.entries.forEach((value, key) => {
                var index = this.columnIndex(key)
                if (index === undefined) {
                    return
                }
                plain[index] = value
            })

            rows.push(plain)
        }

        return rows
    }

    get details(): Map<number, any> {
        var details = new Map<number, any>()

        this._rows.forEach((row, index) => {
            if (row.details) {
                details.set(index, row.details)
            }
        })

        return details
    }

    get columns(): Array<Column> {
        return this._columns
    }
}

export class DataNormalizer {

    normalizer: ((any) => any) | null
    graph: ((any) => Graph) | null
    exclude: Array<string> | null
    sortKeys: Array<string> | null

    constructor(normalizer?: (any) => any, graph?: ((any) => Graph), exclude?: Array<string>, sortKeys?: Array<string>) {
        this.normalizer = normalizer || null
        this.graph = graph || null
        this.exclude = exclude || []
        this.sortKeys = sortKeys || []
    }

    private normalizeMap(data: any, result: Result) {
        for (let attr in data) {
            if (this.exclude && this.exclude.includes(attr)) {
                continue
            }

            let row = result.newRow()

            let value = data[attr]
            switch (typeof value) {
                case "object":
                    row.entries.set("Key", attr)
                    row.entries.set("Value", "")
                    row.details = value
                    break
                case "boolean":
                    row.entries.set("Key", attr)
                    row.entries.set("Value", value ? "true" : "false")
                    break
                default:
                    row.entries.set("Key", attr)
                    row.entries.set("Value", value)
                    break
            }

            result.addRow(row)
        }

        return result
    }

    private normalizeScalarArray(data: any, result: Result) {
        for (let value of data) {
            let row = result.newRow()

            if (typeof value === "boolean") {
                row.entries.set("Value", value ? "true" : "false")
            } else {
                row.entries.set("Value", value)
            }
            result.addRow(row)
        }

        return result
    }

    private normalizeObjectArray(data: any, result: Result) {
        for (let value of data) {
            let row = result.newRow()

            for (let attr in value) {
                var type = typeof value[attr]
                if (type === "boolean") {
                    row.entries.set(attr, value ? "true" : "false")
                } if (type === "string" || type === "number") {
                    row.entries.set(attr, value[attr] === null ? "" : value[attr])
                }
            }

            result.addRow(row)
        }

        return result
    }

    private normalizeArray(data: any, result: Result) {
        if ((data as Array<any>).some(value => typeof value === "object")) {
            return this.normalizeObjectArray(data, result)
        }

        this.normalizeScalarArray(data, result)
    }

    private normalizeData(data: any, result: Result) {
        if (Array.isArray(data)) {
            this.normalizeArray(data, result)
        } else if (typeof data === "object") {
            this.normalizeMap(data, result)
        }
    }

    normalize(data: any): Result {
        var result = new Result()

        if (this.graph) {
            result.graph = this.graph(data)
        }

        if (this.normalizer) {
            data = this.normalizer(data)
        }

        this.normalizeData(data, result)

        if (this.sortKeys) {
            result.sortRowsByKeys(this.sortKeys)
        }

        return result
    }
}