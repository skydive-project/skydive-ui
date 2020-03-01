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
    header: {
        display: 'flex',
        minHeight: 64,
        backgroundColor: '#a2a2a2 !important',
        padding: '0 24px 0 24px',
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
        color: 'white'
    },
    headerContent: {
        alignItems: 'center',
        margin: '20px 0',
        display: 'flex',
        flexGrow: 1,
        verticalAlign: 'middle'
    },
    icon: {
        paddingRight: 8,
        lineHeight: 0
    },
    paper: {
        display: 'block',
        flexWrap: 'wrap',
        padding: theme.spacing(2),
        marginLeft: 1,
        marginRight: 1
    }
})