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
import Tooltip from '@material-ui/core/Tooltip'
import IconButton from '@material-ui/core/IconButton'
import CodeIcon from '@material-ui/icons/Code'

import { styles } from '../DataPanels/PanelStyles'
import { Node, Link } from '../Topology'

interface Props {
    el: Node | Link
    onClick: (el: Node | Link) => void
}

export class GremlinButton extends React.Component<Props> {

    constructor(props) {
        super(props)
    }

    render() {
        return (
            <Tooltip title="Gremlin expression" aria-label="Gremlin expression">
                <IconButton
                    aria-label="Show gremlin expression"
                    onClick={() => this.props.onClick(this.props.el)}
                    color="inherit">
                    <CodeIcon />
                </IconButton>
            </Tooltip>
        )
    }
}

export default withStyles(styles)(GremlinButton)