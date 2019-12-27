const { EOL } = require('os')
const vscode = require('vscode')
let config

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

    readConfig()

    vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('smart-delete')) {
            readConfig()
        }
    })

    // delete
    // |>............word
    context.subscriptions.push(
        vscode.commands.registerCommand('smart-delete.right', async () => {
            let editor = vscode.window.activeTextEditor
            let { document, selections } = editor
            let currentSelection = selections[0]

            // multi line selection or multi cursors
            if (selections.length > 1 || !currentSelection.isSingleLine) {
                return vscode.commands.executeCommand('deleteRight')
            }

            // current line
            if (await currentLineCheck(document, currentSelection, 'right')) {
                return vscode.commands.executeCommand('deleteWordRight')
            }

            // |>............direct next line
            let prevLineHasText = await otherLineCheck(document, currentSelection, 'right')

            let range = new vscode.Range(
                currentSelection.active.line, // cursor line
                currentSelection.active.character, // cursor position
                document.lineCount, // doc end line
                document.positionAt(document.getText().length - 1).character // doc end char
            )
            let search = await document.getText(range)

            if (/^\s{2,}/.test(search)) { // multiline
                if (!search.trim()) { // nothing but empty lines
                    await editor.edit((edit) => edit.replace(range, replace(search, /\s+/g, 'right')))
                } else { // normal
                    await editor.edit((edit) => edit.replace(range, replace(search, /\s{2,}\S/m, 'right')))

                    if (!prevLineHasText) {
                        insertNewLine()
                    }
                }
            } else if (new RegExp(`^${EOL}`).test(search)) { // end of line
                await editor.edit((edit) => edit.replace(range, replace(search, new RegExp(EOL, 'm'), 'right')))
            } else {
                vscode.commands.executeCommand('deleteRight')
            }
        })
    )

    // backspace
    // word............<|
    context.subscriptions.push(
        vscode.commands.registerCommand('smart-delete.left', async () => {
            let editor = vscode.window.activeTextEditor
            let { document, selections } = editor
            let currentSelection = selections[0]

            // multi line selection or multi cursors
            if (selections.length > 1 || !currentSelection.isSingleLine) {
                return vscode.commands.executeCommand('deleteLeft')
            }

            // current line
            if (await currentLineCheck(document, currentSelection, 'left')) {
                return vscode.commands.executeCommand('deleteWordLeft')
            }

            // direct prev line............<|
            let prevLineHasText = await otherLineCheck(document, currentSelection, 'left')

            let range = new vscode.Range(
                0, // doc start line
                0, // doc start char
                currentSelection.end.line, // cursor line
                currentSelection.end.character // cursor position
            )
            let search = await document.getText(range)

            if (/\s{2,}$/.test(search)) {
                if (!search.trim()) { // nothing but empty lines
                    await editor.edit((edit) => edit.replace(range, replace(search, /\s+/g, 'left')))
                } else { // normal
                    await editor.edit((edit) => edit.replace(range, replace(search, /\S\s{2,}$/g, 'left')))

                    if (!prevLineHasText) {
                        insertNewLine()
                    }
                }
            } else {
                vscode.commands.executeCommand('deleteLeft')
            }
        })
    )
}

async function currentLineCheck(document, cursor, dir) {
    if (config.keepOneLine) {
        let active = cursor.active
        let end = cursor.end
        let isLeft = dir == 'left'
        let regex = isLeft ? /\S\s{2,}/ : /\s{2,}\S/
        let txt = await document.lineAt(active.line).text
        let search = await document.getText(
            new vscode.Range(
                active.line,
                isLeft ? 0 : active.character,
                end.line,
                isLeft ? end.character : txt.length
            )
        )

        return regex.test(search)
    }

    return false
}

// prev or next
async function otherLineCheck(document, cursor, dir) {
    if (config.keepOneLine) {
        // check for cursor current location
        // ............<|word
        // word|>............
        if (!await currentLineCheck(document, cursor, dir)) {
            let active = cursor.active.line
            let isLeft = dir == 'left'
            let line = isLeft
                ? active == 0
                    ? 0
                    : active - 1
                : active + 1
            let txt

            try {
                txt = await document.lineAt(line).text
            } catch (err) {
                txt = await document.lineAt(line - 1).text
            }

            return txt.trim()
        }
    }

    return false
}

function replace(txt, regex, dir) {
    let isLeft = dir == 'left'
    let space = config.keepOneLine
        ? ''
        : config.keepOneSpace
            ? ' '
            : ''

    return txt.replace(regex, (match) => {
        let data = match.trim()

        return isLeft ? `${data}${space}` : `${space}${data}`
    })
}

function insertNewLine() {
    config.keepOneLine
        ? vscode.commands.executeCommand('type', { text: EOL })
        : false
}

function readConfig() {
    config = vscode.workspace.getConfiguration('smart-delete')
}

exports.activate = activate

function deactivate() { }

module.exports = {
    activate,
    deactivate
}
