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

import React, { Component } from 'react'
import SlidingPane from 'react-sliding-pane'
import 'react-sliding-pane/dist/react-sliding-pane.css'

import './Menu.css'

export class Menu extends Component {

    render() {
        return (
            <SlidingPane
                closeIcon={<div className="menu-header"><i className="fa fa-angle-left" aria-hidden="true"></i>Skydive ver. 0.24</div>}
                isOpen={this.props.isOpen}
                from='left'
                width='300px'
                onRequestClose={this.props.onRequestClose}>
                <div>
                    <div className="menu-item"><i className="fa fa-angle-right" aria-hidden="true"></i>Settings</div>
                    <div className="menu-item"><i className="fa fa-angle-right" aria-hidden="true"></i>Documentation</div>
                    <div className="menu-item"><i className="fa fa-angle-right" aria-hidden="true"></i>About</div>
                </div>
            </SlidingPane>
        )
    }
}