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
import Tooltip from '@material-ui/core/Tooltip'
import IconButton from '@material-ui/core/IconButton'
import VideocamIcon from '@material-ui/icons/Videocam'
import { Node, Link } from 'graffiti-ui'

interface Props {
    el: Node | Link
    onClick: (el: Node | Link) => void
}

export default class CaptureButton extends React.Component<Props> {

    constructor(props: Props) {
        super(props)
    }

    render() {
        return (
            <React.Fragment>
                {
                    this.props.el.type === 'node' &&
                    <Tooltip title="Packet capture" aria-label="Packet capture">
                        <IconButton
                            aria-label="Packet capture"
                            onClick={() => this.props.onClick(this.props.el)}
                            color="inherit">
                            <VideocamIcon />
                        </IconButton>
                    </Tooltip>
                }
            </React.Fragment>
        )
    }
}