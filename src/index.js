import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'
import './index.css'
import 'roboto-fontface/css/roboto/roboto-fontface.css'
import { SnackbarProvider } from 'notistack'
import '@fortawesome/fontawesome-free/css/all.css'
import { Provider } from 'react-redux'
import { store } from './Store'

ReactDOM.render(
  <Provider store={store}>
    <SnackbarProvider>
      <App />
    </SnackbarProvider>
  </Provider>,
  document.getElementById('index')
);
