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
            let maxLine = document.lineCount

            if (selections.length > 1) {
                let ranges = getRanges(sortSelections(selections).reverse(), 'right', maxLine)

                for (const item of ranges) {
                    await rightOps(editor, item)
                }
            } else {
                let selection = selections[0]

                await rightOps(
                    editor,
                    {
                        selection: selection,
                        range: new vscode.Range(
                            selection.start.line,
                            selection.start.character,
                            maxLine,
                            0
                        )
                    }
                )
            }
        })
    )

    // backspace
    // word............<|
    context.subscriptions.push(
        vscode.commands.registerCommand('smart-delete.left', async () => {
            let editor = vscode.window.activeTextEditor
            let { selections } = editor
            let maxLine = 0

            if (selections.length > 1) {
                let ranges = getRanges(sortSelections(selections), 'left', maxLine)

                for (const item of ranges) {
                    await leftOps(editor, item)
                }
            } else {
                let selection = selections[0]

                await leftOps(
                    editor,
                    {
                        selection: selection,
                        range: new vscode.Range(
                            maxLine,
                            0,
                            selection.start.line,
                            selection.start.character
                        )
                    }
                )
            }
        })
    )
}

async function rightOps(editor, item) {
    const { document } = editor
    const { selection, range } = item

    // multi line selection
    if (!selection.isSingleLine) {
        return removeAll(editor, selection)
    }

    // current line
    if (await currentLineCheck(editor, selection, 'right')) {
        return
    }

    let search = await document.getText(range)

    if (/^\s{2,}/.test(search)) { // multiline
        if (!search.trim()) { // nothing but empty lines
            await editor.edit(
                (edit) => edit.replace(range, replace(search, /\s+/g, 'right')),
                { undoStopBefore: false, undoStopAfter: false }
            )
        } else { // normal
            await editor.edit(
                (edit) => edit.replace(range, replace(search, /\s{2,}\S/m, 'right')),
                { undoStopBefore: false, undoStopAfter: false }
            )

            // |>............direct next line
            // if (!await otherLineCheck(editor, selection, 'right')) {
            //     insertNewLine()
            // }
        }
    } else if (new RegExp(`^${EOL}`).test(search)) { // end of line
        await editor.edit(
            (edit) => edit.replace(range, replace(search, new RegExp(EOL, 'm'), 'right')),
            { undoStopBefore: false, undoStopAfter: false }
        )
    } else {
        return removeOneChar(editor, range, 'right')
    }
}

async function leftOps(editor, item) {
    const { document } = editor
    const { selection, range } = item

    // multi line selection
    if (!selection.isSingleLine) {
        return removeAll(editor, selection)
    }

    // current line
    if (await currentLineCheck(editor, selection, 'left')) {
        return
    }

    let search = await document.getText(range)

    if (/\s{2,}$/.test(search)) {
        if (!search.trim()) { // nothing but empty lines
            await editor.edit(
                (edit) => edit.replace(range, replace(search, /\s+/g, 'left')),
                { undoStopBefore: false, undoStopAfter: false }
            )
        } else { // normal
            await editor.edit(
                (edit) => edit.replace(range, replace(search, /\S\s{2,}$/g, 'left')),
                { undoStopBefore: false, undoStopAfter: false }
            )

            // direct prev line............<|
            // if (!await otherLineCheck(editor, selection, 'left')) {
            //     insertNewLine()
            // }
        }
    } else {
        return removeOneChar(editor, range, 'left')
    }
}

async function removeAll(editor, selection) {
    await editor.edit(
        (edit) => edit.replace(
            new vscode.Range(selection.start, selection.end),
            ''
        ),
        { undoStopBefore: false, undoStopAfter: false }
    )
}

async function removeOneChar(editor, range, dir) {
    let isLeft = dir == 'left'

    await editor.edit(
        (edit) => edit.replace(
            new vscode.Range(
                isLeft ? range.end.line : range.start.line,
                isLeft ? range.end.character : range.start.character,
                isLeft ? range.end.line : range.start.line,
                isLeft ? range.end.character - 1 : range.start.character + 1
            ),
            ''
        ),
        { undoStopBefore: false, undoStopAfter: false }
    )
}

// get ranges distance for multi cursors
function getRanges(arr, dir, maxLine) {
    let isLeft = dir == 'left'
    let dis = []
    let prevPoint
    let distance

    for (let i = 0; i < arr.length; i++) {
        const el = arr[i]
        let range = new vscode.Range(
            el.start,
            el.end
        )

        if (i == 0) {
            distance = isLeft
                ? new vscode.Range(
                    maxLine,
                    0,
                    el.start.line,
                    el.start.character
                )
                : new vscode.Range(
                    el.start.line,
                    el.start.character,
                    maxLine,
                    0
                )
        } else {
            distance = prevPoint.union(range)
        }

        prevPoint = range

        dis.push({
            range: distance,
            selection: el
        })
    }

    return dis
}

// current line
async function currentLineCheck(editor, cursor, dir, remove = true) {
    const { document } = editor

    let start = cursor.start
    let end = cursor.end
    let isLeft = dir == 'left'
    let regex = isLeft ? /\S\s{2,}/ : /\s{2,}\S/
    let range = new vscode.Range(
        start.line,
        isLeft ? 0 : start.character,
        end.line,
        isLeft ? end.character : await document.lineAt(start.line).text.length
    )
    let search = await document.getText(range)
    let check = regex.test(search)

    if (check && remove) {
        await editor.edit(
            (edit) => edit.replace(range, replace(search, regex, dir)),
            { undoStopBefore: false, undoStopAfter: false }
        )
    }

    return check
}

// prev/next line
async function otherLineCheck(editor, cursor, dir) {
    if (config.keepOneLine) {
        const { document } = editor

        // check for cursor current location
        // ............<|word
        // word|>............
        if (!await currentLineCheck(editor, cursor, dir, false)) {
            let start = cursor.start.line
            let isLeft = dir == 'left'
            let line = isLeft
                ? start == 0
                    ? 0
                    : start - 1
                : start + 1
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

// utils
function sortSelections(arr) {
    return arr.sort((a, b) => { // make sure its sorted correctly
        if (a.start.line > b.start.line) return 1
        if (b.start.line > a.start.line) return -1

        return 0
    })
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
