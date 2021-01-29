# Change Log

## 0.0.1

- Initial release

## 0.0.2

- fix multi line selection not following native usage

## 0.0.3

- fix cant remove empty consecutive lines

## 0.0.5

- new flow if `keepOneLine: true` "now its even smarter"
    - if in the current line has text and u press del/backspace, it will remove the empty spaces as expected "no more jumping around"
    - if the previous line have text, and u press del/backspace, it will ignore the newline rule ex.`}\n) => })` again as expected "no more jumping around"

## 0.0.6

- correct right deletion removeing 2 chars
- fix `Illegal value for line`

## 0.0.7

- multi cursor support
- undo now will undo all the extension last operations as a single step instead of multiple
- now the extension replaces all the native operations for `backspace & delete`, anything else is handled by vscode like normal
- add new option `formatAfterNewLine`

## 0.0.8

- fix cant remove direct next character when there is multi empty spaces on the same line

## 0.0.9

- support auto removing consecutive char pairs ex.`{}`

## 0.1.0

- fix negative line error

## 0.1.2

- fix package settings name

## 0.1.3

- reveal position after delete
