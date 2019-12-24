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
                vscode.commands.executeCommand('deleteRight')
            } else {
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
                    }

                    insertNewLine()
                } else if (new RegExp(`^${EOL}`).test(search)) { // end of line
                    await editor.edit((edit) => edit.replace(range, replace(search, new RegExp(EOL, 'm'), 'right')))

                    insertNewLine()
                } else {
                    vscode.commands.executeCommand('deleteRight')
                }
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

            if (selections.length > 1 || !currentSelection.isSingleLine) {
                vscode.commands.executeCommand('deleteLeft')
            } else {
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
                    }

                    insertNewLine()
                } else {
                    vscode.commands.executeCommand('deleteLeft')
                }
            }
        })
    )
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
