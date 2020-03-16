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
import { Login, App, AppState, Link, Node, GremlinPanel, GremlinButton } from 'graffiti-ui'

import { store } from './Store'
import Tools from './Tools'
import Config from './Config'
import CaptureButton from './ActionButtons/Capture'
import CapturePanel from './DataPanels/Capture'
import FlowButton from './ActionButtons/Flow'
import FlowPanel from './DataPanels/Flow'

import './Index.css'
import Logo from '../assets/logo.png'
import LogoLarge from '../assets/logo-large.png'

const queryString = require('query-string')

// from options
declare var baseURL: string

// expose app ouside
declare global {
  interface Window {
    Tools: Tools
  }
}
window.Tools = Tools

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

interface LoginProps {
  location: any
  history: any
}

class SkydiveLogin extends React.Component<LoginProps> {

  constructor(props: LoginProps) {
    super(props)
  }

  onLogged() {
    var from = "/"
    if (this.props.location.state && this.props.location.state.from !== "/login") {
      from = this.props.location.state.from
    }
    this.props.history.push(from)
  }

  render() {
    return (
      <Login logo={<img src={LogoLarge} alt="Skydive" />} onLogged={this.onLogged.bind(this)} />
    )
  }
}


interface Props {
  location: any
  history: any
}

interface State {
  isGremlinPanelOpen: boolean
  isCapturePanelOpen: boolean
  isFlowPanelOpen: boolean
}

class SkydiveApp extends React.Component<Props, State> {

  config: Config
  app: App

  constructor(props: Props) {
    super(props)

    this.config = new Config()
    this.app = React.createRef();

    this.state = {
      isGremlinPanelOpen: false,
      isCapturePanelOpen: false,
      isFlowPanelOpen: false
    }
  }

  actionButtons(el: Node | Link): JSX.Element {
    return (
      <React.Fragment>
        <GremlinButton el={el} onClick={() => { this.setState({ isGremlinPanelOpen: !this.state.isGremlinPanelOpen }) }} />
        <CaptureButton el={el} onClick={() => { this.setState({ isCapturePanelOpen: !this.state.isCapturePanelOpen }) }} />
        {el.data.Captures !== undefined &&
          <FlowButton el={el} onClick={() => { this.setState({ isFlowPanelOpen: !this.state.isFlowPanelOpen }) }} />
        }
      </React.Fragment>
    )
  }

  dataPanels(el: Node | Link): JSX.Element {
    return (
      <React.Fragment>
        <GremlinPanel el={el} expanded={this.state.isGremlinPanelOpen} />
        <CapturePanel el={el} expanded={this.state.isCapturePanelOpen} config={this.app.config} />
        {el.data.Captures !== undefined &&
          <FlowPanel el={el} expanded={this.state.isFlowPanelOpen} />
        }
      </React.Fragment>
    )
  }

  onLogout() {
    this.props.history.push("/login")
  }

  render() {
    const parsed = queryString.parse(this.props.location.search)
    return <App onRef={(app: App) => this.app = app}
      config={this.config}
      configURL={parsed.config}
      dataURL={parsed.data}
      logo={<img src={Logo} alt="graffiti" />}
      dataPanels={this.dataPanels.bind(this)}
      actionButtons={this.actionButtons.bind(this)}
      onLogout={this.onLogout.bind(this)} />
  }
}

ReactDOM.render(
  <Provider store={store}>
    <SnackbarProvider>
      <BrowserRouter history={history} basename={baseURL || ""}>
        <Switch>
          <PrivateRoute path="/" component={withRouter(SkydiveApp)} exact />
          <Route path="/login" component={withRouter(SkydiveLogin)} />
          <Redirect from="*" to={(baseURL || "/") + history.location.search} />
        </Switch>
      </BrowserRouter>
    </SnackbarProvider>
  </Provider>,
  document.getElementById('index')
)