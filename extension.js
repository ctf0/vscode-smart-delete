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

            if (selections.length > 1) {
                vscode.commands.executeCommand('deleteRight')
            } else {
                let range = new vscode.Range(
                    selections[0].active.line, // cursor line
                    selections[0].active.character, // cursor position
                    document.lineCount, // doc end line
                    document.positionAt(document.getText().length - 1).character // doc end char
                )
                let search = await document.getText(range)

                if (/^\s{2,}/.test(search)) { // multiline
                    await editor.edit((edit) => edit.replace(range, replace(search, /\s{2,}\S/m, 'right')))
                } else if (/^\n/.test(search)) { // end of line
                    await editor.edit((edit) => edit.replace(range, replace(search, /\n/m, 'right')))
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

            if (selections.length > 1) {
                vscode.commands.executeCommand('deleteLeft')
            } else {
                let range = new vscode.Range(
                    0, // doc start line
                    0, // doc start char
                    selections[0].end.line, // cursor line
                    selections[0].end.character // cursor position
                )
                let search = await document.getText(range)

                if (/\s{2,}$/.test(search)) {
                    await editor.edit((edit) => edit.replace(range, replace(search, /\S\s{2,}$/g, 'left')))
                } else {
                    vscode.commands.executeCommand('deleteLeft')
                }
            }
        })
    )
}

function replace(txt, regex, dir) {
    let isLeft = dir == 'left'
    let space = config.keepOneSpace ? ' ' : ''

    return txt.replace(regex, (match) => {
        let data = match.trim()

        return isLeft ? `${data}${space}` : `${space}${data}`
    })
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
