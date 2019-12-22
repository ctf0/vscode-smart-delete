const vscode = require('vscode')

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

    // count for indentation
    // if not then get the doc text from/to current position
    // and regex replace
    //

    // delete
    context.subscriptions.push(
        vscode.commands.registerCommand('smart-delete.right', () => {
            let editor = vscode.window.activeTextEditor
            let { document, selections } = editor

            for (const item of selections) {
                let txt = document.lineAt(item.active.line).text
                let search = document.getText(
                    new vscode.Range(
                        item.active.line,
                        item.active.character,
                        item.end.line,
                        txt.length
                    )
                )

                if (/^\s+/.test(search)) {
                    vscode.commands.executeCommand('deleteWordRight')
                } else {
                    vscode.commands.executeCommand('deleteRight')
                }
            }
        })
    )

    // backspace
    context.subscriptions.push(
        vscode.commands.registerCommand('smart-delete.left', () => {
            let editor = vscode.window.activeTextEditor
            let { document, selections } = editor

            for (const item of selections) {
                let search = document.getText(
                    new vscode.Range(
                        item.active.line,
                        0,
                        item.end.line,
                        item.end.character
                    )
                )

                if (/\s+$/.test(search)) {
                    vscode.commands.executeCommand('deleteWordLeft')
                } else {
                    vscode.commands.executeCommand('deleteLeft')
                }
            }
        })
    )

    // del
    // txt = txt.replace(/((\s{2,})\S)|\S/m, (match) => {
    //     return match[match.length - 1]
    // })

    // backspace
    // txt = txt.replace(/(?!\S)(\s{2,})/m, (match) => {
    //     return match[match.length - 1]
    // })
}
exports.activate = activate

function deactivate() { }

module.exports = {
    activate,
    deactivate
}
