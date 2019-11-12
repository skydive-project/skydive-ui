import { minWidth, borderRadius } from "@material-ui/system";

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

import { createStyles, Theme } from '@material-ui/core';

export const styles = (theme: Theme) => createStyles({
  rightPanelPaperContent: {
    padding: theme.spacing(2),
    width: `100%`,
    height: `100%`
  },
  jsonTree: {
    backgroundColor: 'unset'
  },
  tabs: {
    height: `100%`
  },
  tabIconFree: {
    fontFamily: `"Font Awesome 5 Free" !important`,
    fontWeight: 900,
    fontSize: 24,
    marginBottom: `0 !important`
  },
  tabIconBrands: {
    fontFamily: `"Font Awesome 5 Brands" !important`,
    fontWeight: 900,
    fontSize: 24,
    marginBottom: `0 !important`
  },
  tabTitle: {
    fontSize: 18
  },
  tabActions: {
    display: 'flex',
    flexDirection: 'row-reverse',
    marginBottom: theme.spacing(1)
  },
  gremlinExpr: {
    fontSize: '16px',
    padding: 0
  },
  actionPanel: {
    marginBottom: 16
  },
  iconImg: {
    maxWidth: 32,
    maxHeight: 32,
    verticalAlign: 'middle'
  }
})