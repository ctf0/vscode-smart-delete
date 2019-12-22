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

            // work top > bottom
            for (const item of invertSelections(selections)) {
                if (await currentLineCheck(document, item, 'right')) {
                    let range = new vscode.Range(
                        item.active.line, // cursor line
                        item.active.character, // cursor position
                        document.lineCount, // end line of doc
                        document.positionAt(document.getText().length - 1).character // end char of doc
                    )
                    let search = await document.getText(range)

                    await editor.edit((edit) => edit.replace(range, rightReplace(search)))
                    await sleep(1000)
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

            // work bottom > top
            for (const item of invertSelections(selections)) {
                if (await currentLineCheck(document, item, 'left')) {
                    let range = new vscode.Range(
                        0, // start line of doc
                        0, // start char of doc
                        item.end.line, // cursor line
                        item.end.character // cursor position
                    )
                    let search = await document.getText(range)

                    await editor.edit((edit) => edit.replace(range, leftReplace(search)))
                } else {
                    vscode.commands.executeCommand('deleteLeft')
                }
            }
        })
    )
}

async function currentLineCheck(document, item, dir) {
    let active = item.active
    let end = item.end
    let isLeft = dir == 'left'
    let regex = isLeft ? /\s{2,}$/ : /^\s{2,}/
    let txt = await document.lineAt(active.line).text
    let search = await document.getText(
        new vscode.Range(
            active.line,
            isLeft ? 0 : active.character,
            end.line,
            isLeft ? end.character : txt.length
        )
    )

    if (search.length == 0) {
        // ............word
        // <|............word
        if (active.character == 0 && isLeft && txt.match(/^\s+/)) {
            vscode.commands.executeCommand('deleteWordRight')

            return false
        }

        // EOL|>
        // ............word
        // or
        // ............word
        // <|SOF
        return true
    }

    return regex.test(search)
}

function rightReplace(txt) {
    return txt.replace(/\s{2,}\S/m, (match) => {
        return match.trim()
    })
}

function leftReplace(txt) {
    return txt.replace(/\S\s{2,}$/g, (match) => {
        return match.trim()
    })
}

function invertSelections(arr) {
    return arr.sort((a, b) => { // make sure its sorted correctly
        if (a.start.line > b.start.line) return 1
        if (b.start.line > a.start.line) return -1

        return 0
    }).reverse()
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

exports.activate = activate

function deactivate() { }

module.exports = {
    activate,
    deactivate
}
