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
import Button from '@material-ui/core/Button'
import Dialog from '@material-ui/core/Dialog'
import DialogActions from '@material-ui/core/DialogActions'
import DialogContent from '@material-ui/core/DialogContent'
import DialogContentText from '@material-ui/core/DialogContentText'
import DialogTitle from '@material-ui/core/DialogTitle'
import { Typography } from '@material-ui/core'

export interface AboutProps {
    open: boolean
    onClose: () => void
    appName: string
    appVersion: string
    uiVersion: string
}

export default function AboutDialog(props: AboutProps) {
    const { open, onClose, appName, appVersion, uiVersion, ...other } = props

    return (
        <Dialog
            open={open}
            onClose={onClose}
        >
            <DialogTitle> {appName} </DialogTitle>
            <DialogContent>
                <div style={{ minWidth: 400 }}>
                    {appVersion &&
                        <DialogContentText>
                            {appName} version : {appVersion}
                        </DialogContentText>
                    }
                    {/* <DialogContentText>
                        UI version : {uiVersion}
                    </DialogContentText> */}
                    <DialogContentText>
                    Copyright (c) 2021, ABLECLOUD.Co.Ltd
                    </DialogContentText>
                </div>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="primary" autoFocus>
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    )
}