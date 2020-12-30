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
import CodeIcon from '@material-ui/icons/Code'
import SyntaxHighlighter from 'react-syntax-highlighter'

import Panel from './Panel'
import { styles } from './GremlinStyles'

import { Node, Link } from '../Topology'

interface Props {
    classes: any
    el: Node | Link
    expanded: boolean
}

export class GremlinPanel extends React.Component<Props> {

    constructor(props: Props) {
        super(props)
    }

    render() {
        var classes = this.props.classes

        var gremlin: string
        if (this.props.el.type === 'node') {
            gremlin = `G.V('${this.props.el.id}')`
        } else {
            gremlin = `G.E('${this.props.el.id}')`
        }

        return (
            <Collapse in={this.props.expanded} timeout="auto" unmountOnExit className={classes.panel}>
                <Panel icon={<CodeIcon />} title="Gremlin expression" content={
                    <div className={classes.gremlinExpr}>
                        <SyntaxHighlighter language="bash">
                            {gremlin}
                        </SyntaxHighlighter>
                    </div>
                } />
            </Collapse>
        )
    }
}

export default withStyles(styles)(GremlinPanel)