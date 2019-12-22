const { EOL } = require('os')
const vscode = require('vscode')

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

    // delete
    // |>............word
    context.subscriptions.push(
        vscode.commands.registerCommand('smart-delete.right', async () => {
            let editor = vscode.window.activeTextEditor
            let { document, selections } = editor

            for (const item of invertSelections(selections)) {
                let range = new vscode.Range(
                    item.active.line, // cursor line
                    item.active.character, // cursor position
                    document.lineCount, // end line of doc
                    document.positionAt(document.getText().length - 1).character // end char of doc
                )
                let search = await document.getText(range)

                if (/^\s{2,}/.test(search)) {
                    await editor.edit((edit) => edit.replace(range, replace(search, /\s{2,}\S/m)))
                } else {
                    vscode.commands.executeCommand('deleteRight')
                }
            }

            // reset cursor
            resetCursor(selections, 'right')
        })
    )

    // backspace
    // word............<|
    context.subscriptions.push(
        vscode.commands.registerCommand('smart-delete.left', async () => {
            let editor = vscode.window.activeTextEditor
            let { document, selections } = editor

            for (const item of invertSelections(selections)) {
                let range = new vscode.Range(
                    0, // start line of doc
                    0, // start char of doc
                    item.end.line, // cursor line
                    item.end.character // cursor position
                )
                let search = await document.getText(range)

                if (/\s{2,}$/.test(search)) {
                    await editor.edit((edit) => edit.replace(range, replace(search, /\S\s{2,}$/g)))
                } else {
                    vscode.commands.executeCommand('deleteLeft')
                }
            }

            // reset cursor
            resetCursor(selections, 'left')
        })
    )
}

function replace(txt, regex) {
    return txt.replace(regex, (match) => match.trim())
}

function invertSelections(arr) {
    return arr.sort((a, b) => { // make sure its sorted correctly
        if (a.start.line > b.start.line) return 1
        if (b.start.line > a.start.line) return -1

        return 0
    }).reverse()
}

function resetCursor(selections, dir) {
    vscode.commands.executeCommand('removeSecondaryCursors')
}

exports.activate = activate

function deactivate() { }

module.exports = {
    activate,
    deactivate
}
