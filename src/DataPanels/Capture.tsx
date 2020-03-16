/*
 * Copyright (C) 2020 Sylvain Afchain
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
import { withStyles } from '@material-ui/core/styles'
import Collapse from '@material-ui/core/Collapse'
import { Node, Link, ConfigReducer } from 'graffiti-ui'

import CaptureForm from "./CaptureForm"
import { styles } from './CaptureStyles'

interface Props {
    classes: any
    el: Node | Link
    expanded: boolean
    config: ConfigReducer
}

export class CapturePanel extends React.Component<Props> {

    constructor(props: Props) {
        super(props)
    }

    private dataAttrs(el: Node | Link): any {
        if (el.type === 'node') {
            return this.props.config.nodeAttrs(el)
        } else {
            return this.props.config.linkAttrs(el)
        }
    }

    render() {
        var classes = this.props.classes

        return (
            <Collapse in={this.props.expanded} timeout="auto" unmountOnExit className={classes.panel}>
                <CaptureForm
                    name={this.dataAttrs(this.props.el).name}
                    gremlin={`G.V().Has('TID', '${this.props.el.data.TID}')`}
                    type={this.dataAttrs(this.props.el).type}
                />
            </Collapse>
        )
    }
}

export default withStyles(styles)(CapturePanel)