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
import deburr from 'lodash/deburr'
import Downshift from 'downshift'
import TextField, { StandardTextFieldProps } from '@material-ui/core/TextField'
import Paper from '@material-ui/core/Paper'
import MenuItem, { MenuItemProps } from '@material-ui/core/MenuItem'
import Chip from '@material-ui/core/Chip'
import InputAdornment from '@material-ui/core/InputAdornment'
import SearchIcon from '@material-ui/icons/Search'

import { styles } from './AutoCompleteStyles'

type RenderInputProps = StandardTextFieldProps & {
  classes: ReturnType<typeof styles>
  ref?: React.Ref<HTMLDivElement>
}

function renderInput(inputProps: RenderInputProps) {
  const { InputProps, classes, ref, ...other } = inputProps

  return (
    <TextField
      InputProps={{
        inputRef: ref,
        disableUnderline: true,
        classes: {
          root: classes.inputRoot,
          input: classes.inputInput
        },
        ...InputProps,
      }}
      {...other}
    />
  )
}

interface RenderSuggestionProps {
  highlightedIndex: number | null
  index: number
  itemProps: MenuItemProps<'div', { button?: never }>
  selectedItem: string
  suggestion: string
}

function renderSuggestion(suggestionProps: RenderSuggestionProps) {
  const { suggestion, index, itemProps, highlightedIndex, selectedItem } = suggestionProps
  const isHighlighted = highlightedIndex === index
  const isSelected = (selectedItem || '').indexOf(suggestion) > -1

  return (
    <MenuItem
      {...itemProps}
      key={suggestion}
      selected={isHighlighted}
      component="div"
      style={{
        fontWeight: isSelected ? 500 : 400,
      }}
    >
      {suggestion}
    </MenuItem>
  )
}

function getSuggestions(suggestions: Array<string>, value: string, { showEmpty = false } = {}) {
  const inputValue = deburr(value.trim()).toLowerCase()
  const inputLength = inputValue.length
  let count = 0

  return inputLength === 0 && !showEmpty
    ? []
    : suggestions.filter(suggestion => {
      const keep =
        count < 5 && suggestion.slice(0, inputLength).toLowerCase() === inputValue

      if (keep) {
        count += 1
      }

      return keep
    })
}

interface AutocompleteProps {
  placeholder: string
  suggestions: Array<string>
  onChange: (selected: Array<string>) => void
}

export default function Autocomplete(props: AutocompleteProps) {
  const { placeholder, suggestions, onChange } = props

  const classes = styles({})
  const [inputValue, setInputValue] = React.useState('')
  const [selectedItem, setSelectedItem] = React.useState<Array<string>>([])

  function handleKeyDown(event: React.KeyboardEvent) {
    if (selectedItem.length && !inputValue.length && event.key === 'Backspace') {
      setSelectedItem(selectedItem.slice(0, selectedItem.length - 1))
    }
  }

  function handleInputChange(event: React.ChangeEvent<{ value: string }>) {
    setInputValue(event.target.value)
  }

  function handleChange(item: string) {
    let newSelectedItem = [...selectedItem]
    if (item && newSelectedItem.indexOf(item) === -1) {
      newSelectedItem = [...newSelectedItem, item]
    }
    setInputValue('')
    setSelectedItem(newSelectedItem)

    onChange(newSelectedItem)
  }

  const handleDelete = (item: string) => () => {
    const newSelectedItem = [...selectedItem]
    newSelectedItem.splice(newSelectedItem.indexOf(item), 1)
    setSelectedItem(newSelectedItem)

    onChange(newSelectedItem)
  }

  return (
    <Downshift
      id="downshift-multiple"
      inputValue={inputValue}
      onChange={handleChange}
      selectedItem={selectedItem}>
      {({
        getInputProps,
        getItemProps,
        getLabelProps,
        isOpen,
        inputValue: inputValue2,
        selectedItem: selectedItem2,
        highlightedIndex,
      }) => {
        const { onChange, ...inputProps } = getInputProps({
          onKeyDown: handleKeyDown,
          placeholder: placeholder,
        })
        return (
          <div className={classes.container}>
            {renderInput({
              fullWidth: true,
              classes,
              InputLabelProps: getLabelProps(),
              InputProps: {
                disableUnderline: true,
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                    {
                      selectedItem.map(item => (
                        <Chip
                          key={item}
                          tabIndex={- 1}
                          label={item}
                          className={classes.chip}
                          onDelete={handleDelete(item)}
                        />))
                    }
                  </InputAdornment>
                ),
                onChange: event => {
                  handleInputChange(event)
                  onChange!(event as React.ChangeEvent<HTMLInputElement>)
                }
              },
              inputProps,
            })}
            {isOpen ? (
              <Paper className={classes.paper} square>
                {getSuggestions(suggestions, inputValue2!).map((suggestion, index) =>
                  renderSuggestion({
                    suggestion,
                    index,
                    itemProps: getItemProps({ item: suggestion }),
                    highlightedIndex,
                    selectedItem: selectedItem2,
                  }),
                )}
              </Paper>
            ) : null}
          </div>
        )
      }}
    </Downshift>
  )
}