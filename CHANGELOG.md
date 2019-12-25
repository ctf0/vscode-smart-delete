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
