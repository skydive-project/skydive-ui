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

import { createStore } from 'redux'

import { Node, Link } from './Topology'

export const SELECT_NODE = 'SELECT_NODE'
export const UNSELECT_NODE = 'UNSELECT_NODE'
export const BUMP_REVISION = 'BUMP_REVISION'
export const REGISTER_SESSION = 'REGISTER_SESSION'

interface selectNodeAction {
    type: typeof SELECT_NODE
    payload: Node
}

interface unselectNodeAction {
    type: typeof UNSELECT_NODE
    payload: Node
}

interface bumpRevisionAction {
    type: typeof BUMP_REVISION
    payload: string
}

export interface session {
    endpoint: string
    username: string
    token: string
    permissions: any
}

interface registerSessionAction {
    type: typeof REGISTER_SESSION
    payload: session
}

export function selectNode(node: Node): selectNodeAction {
    return {
        type: SELECT_NODE,
        payload: node
    }
}

export function unselectNode(node: Node): unselectNodeAction {
    return {
        type: UNSELECT_NODE,
        payload: node
    }
}

export function bumpRevision(id: string): bumpRevisionAction {
    return {
        type: BUMP_REVISION,
        payload: id
    }
}

export function registerSession(endpoint: string, username: string, token: string, permissions: any): registerSessionAction {
    return {
        type: REGISTER_SESSION,
        payload: {
            endpoint: endpoint,
            username: username,
            token: token,
            permissions: permissions
        }
    }
}

export type ActionTypes = selectNodeAction | unselectNodeAction | bumpRevisionAction | registerSessionAction

const initialState = {
    selection: new Array<Node | Link>(),
    selectionRevision: 0,
    session: { token: "", permissions: null }
}

function appReducer(state = initialState, action: ActionTypes) {
    switch (action.type) {
        case SELECT_NODE:
            var selection = state.selection.filter(d => action.payload.id !== d.id)
            selection.push(action.payload)
            return {
                ...state,
                selection: selection
            }
        case UNSELECT_NODE:
            var selection = state.selection.filter(d => action.payload.id !== d.id)
            return {
                ...state,
                selection: selection
            }
        case BUMP_REVISION:
            if (state.selection.some(el => el.id === action.payload)) {
                return {
                    ...state,
                    selectionRevision: state.selectionRevision + 1
                }
            }
            return state
        case REGISTER_SESSION:
            return {
                ...state,
                session: action.payload
            }
        default:
            return state
    }
}

export type AppState = ReturnType<typeof appReducer>

export const store = createStore(appReducer)