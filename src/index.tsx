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
import * as ReactDOM from 'react-dom'
import 'roboto-fontface/css/roboto/roboto-fontface.css'
import { SnackbarProvider } from 'notistack'
import '@fortawesome/fontawesome-free/css/all.css'
import { Provider, connect } from 'react-redux'
import { createBrowserHistory } from 'history'
import { BrowserRouter, Route, Redirect, Switch, withRouter } from 'react-router-dom'

import './index.css'
import { AppState, store } from './Store'
import Login from './Login'
import App from './App'
//import Logo from '../assets/Logo.png'
import Logo from '../assets/ablestack-logo.png'

const queryString = require('query-string')

// from index.html
declare var baseURL: string

const history = createBrowserHistory()

export const mapStateToProps = (state: AppState) => ({
  session: state.session
})

export const mapDispatchToProps = ({
})

const PrivateRoute = connect(mapStateToProps, mapDispatchToProps)(({ component, session, ...props }: any) => {
  const routeComponent = (props: any) => (
    session.endpoint
      ? React.createElement(component, props)
      : <Redirect to={{ pathname: '/login' }} />
  )
  return <Route {...props} render={routeComponent} />
})

interface Props {
  location: any
}

class SkydiveApp extends React.Component<Props> {

  constructor(props) {
    super(props)
  }

  render() {
    const parsed = queryString.parse(this.props.location.search)
    return <App configURL={parsed.config} dataURL={parsed.data} logo={<img src={Logo} alt="logo" />} />
  }
}

ReactDOM.render(
  <Provider store={store}>
    <SnackbarProvider>
      <BrowserRouter history={history} basename={baseURL}>
        <Switch>
          <PrivateRoute path="/" component={withRouter(SkydiveApp)} exact />
          <Route path="/login" component={Login} />
        </Switch>
      </BrowserRouter>
    </SnackbarProvider>
  </Provider>,
  document.getElementById('index')
)