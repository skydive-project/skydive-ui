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

import { createStyles, Theme } from '@material-ui/core/styles'

export const styles = (theme: Theme) => createStyles({
    textField: {
        marginLeft: theme.spacing(1),
        marginRight: theme.spacing(1)
    },
    button: {
        margin: theme.spacing(1),
    },
    control: {
        display: "flex",
        "& .MuiInputBase-root": {
            display: "block !important"
        },
        marginTop: 36,
        marginLeft: theme.spacing(1),
        marginRight: theme.spacing(1)
    },
    advanced: {
        boxShadow: "unset !important",
        '&::before': {
            top: 0,
            height: 0
        }
    },
    advancedSummary: {
        padding: 0,
        marginLeft: 8,
        marginRight: 8,
        color: "#061775",
        backgroundColor: "unset !important",
        borderColor: "unset",
        '& .MuiExpansionPanelSummary-content': {
            backgroundColor: "unset",
        }
    }
})