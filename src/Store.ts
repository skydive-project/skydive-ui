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

import { Node } from './Topology'

export const SELECT_NODE = 'SELECT_NODE'
export const UNSELECT_NODE = 'UNSELECT_NODE'

interface selectNodeAction {
    type: typeof SELECT_NODE
    payload: Node
}

interface unselectNodeAction {
    type: typeof UNSELECT_NODE
    payload: Node
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

export type ActionTypes = selectNodeAction | unselectNodeAction

const initialState = {
    nodeSelection: new Array<Node>()
}

function appReducer(state = initialState, action: ActionTypes) {
    switch (action.type) {
        case SELECT_NODE:
            var nodes = state.nodeSelection.filter(d => action.payload.id !== d.id)
            nodes.push(action.payload)
            return {
                ...state,
                nodeSelection: nodes
            }
        case UNSELECT_NODE:
            var nodes = state.nodeSelection.filter(d => action.payload.id !== d.id)
            return {
                ...state,
                nodeSelection: nodes
            }
        default:
            return state
    }
}

export type AppState = ReturnType<typeof appReducer>

export const store = createStore(appReducer)