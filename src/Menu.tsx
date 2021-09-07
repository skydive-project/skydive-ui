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
import ListItem from '@material-ui/core/ListItem'
import ListItemIcon from '@material-ui/core/ListItemIcon'
import ListItemText from '@material-ui/core/ListItemText'
import SettingsIcon from '@material-ui/icons/Settings'
import InfoIcon from '@material-ui/icons/Info'
import LibraryBooksIcon from '@material-ui/icons/LibraryBooks'

export function MenuListItems() {
    return (
        <React.Fragment>
            {/* <ListItem button={true}>
                <ListItemIcon>
                    <SettingsIcon />
                </ListItemIcon>
                <ListItemText primary="Settings" />
            </ListItem> */}
        </React.Fragment>
    )
}

export interface HelpListItemsProps {
    onClick: () => void
}

export function HelpListItems(props: HelpListItemsProps) {
    const { onClick, ...other } = props

    return (
        <React.Fragment>
            {/* <ListItem button={true}>
                <ListItemIcon>
                    <LibraryBooksIcon />
                </ListItemIcon>
                <ListItemText primary="Documentation" />
            </ListItem> */}
            <ListItem button={true}>
                <ListItemIcon>
                    <InfoIcon />
                </ListItemIcon>
                <ListItemText primary="About" onClick={onClick} />
            </ListItem>
        </React.Fragment>
    )
}