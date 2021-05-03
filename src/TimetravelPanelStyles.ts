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

import { createStyles, Theme } from '@material-ui/core'

export const styles = (theme: Theme) => createStyles({
  rightPanelPaperContent: {
    padding: theme.spacing(2),
    width: `100%`,
    height: `100%`,
    maxHeight: 'calc(100% - 60px)'
  },
  panel: {
    height: `100%`
  },
  title: {
    marginLeft: 5,
    marginRight: 5
  },
  connector: {
    height: 25
  },
  root: {
    paddingLeft: 0,
    paddingRight: 0,
  },
  tabIconFree: {
    fontFamily: `"Font Awesome 5 Free" !important`,
    fontWeight: 900,
    fontSize: 24,
    marginBottom: `0 !important`,
    minWidth: 34,
    textAlign: 'center'
  },
  tabIconBrands: {
    fontFamily: `"Font Awesome 5 Brands" !important`,
    fontWeight: 900,
    fontSize: 24,
    marginBottom: `0 !important`,
    minWidth: 34,
    textAlign: 'center'
  },
  textField: {
    "& .MuiInputBase-root": {
      display: "grid"
    }
  },
  content: {
    overflow: "auto",
    height: "100%"
  }
})