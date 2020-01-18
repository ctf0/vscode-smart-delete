const { EOL } = require('os')
const vscode = require('vscode')

let config = {}
let charPairs = []

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
    await readConfig()

    vscode.workspace.onDidChangeConfiguration(async (e) => {
        if (e.affectsConfiguration('smart-delete')) {
            await readConfig()
        }
    })

    // backspace
    // word............<|
    context.subscriptions.push(
        vscode.commands.registerCommand('smart-delete.left', async () => {
            let editor = vscode.window.activeTextEditor
            let maxLine = 0
            let ranges = getRanges(sortSelections(editor.selections), 'left', maxLine).reverse()

            for (const item of ranges) {
                if (!item.range.isEmpty) {
                    await leftOps(editor, item)
                }
            }
        })
    )

    // delete
    // |>............word
    context.subscriptions.push(
        vscode.commands.registerCommand('smart-delete.right', async () => {
            let editor = vscode.window.activeTextEditor
            let maxLine = editor.document.lineCount
            let ranges = getRanges(sortSelections(editor.selections).reverse(), 'right', maxLine)

            for (const item of ranges) {
                if (!item.range.isEmpty) {
                    await rightOps(editor, item)
                }
            }
        })
    )
}

async function rightOps(editor, item) {
    const { document } = editor
    const { selection, range } = item

    // selected text
    if (!selection.isSingleLine || !selection.active.isEqual(selection.anchor)) {
        return removeAll(editor, selection)
    }

    // current line
    // SOL|>
    if (await currentLineCheck(editor, selection, 'right')) {
        return
    }

    let search = await document.getText(range)

    // multiline
    if (/^\s{2,}/.test(search)) {
        // nothing but empty lines
        if (!search.trim()) {
            return changeDoc(editor, range, replaceTxt(search, /\s+/g, 'right'))
        }
        // normal
        else {
            await changeDoc(editor, range, replaceTxt(search, /\s{2,}\S/m, 'right'))

            return formatIndent()
        }
    }
    // end of line
    else if (new RegExp(`^${EOL}`).test(search)) {
        return changeDoc(editor, range, replaceTxt(search, new RegExp(EOL, 'm'), 'right'))
    } else {
        return removeOneChar(editor, range, 'right')
    }
}

async function leftOps(editor, item) {
    const { document } = editor
    const { selection, range } = item

    // selected text
    if (!selection.isSingleLine || !selection.active.isEqual(selection.anchor)) {
        return removeAll(editor, selection)
    }

    // current line
    // <|EOL
    if (await currentLineCheck(editor, selection, 'left')) {
        return
    }

    let search = await document.getText(range)

    if (/\s{2,}$/.test(search)) {
        // nothing but empty lines
        if (!search.trim()) {
            return changeDoc(editor, range, replaceTxt(search, /\s+/g, 'left'))
        }
        // normal
        else {
            await changeDoc(editor, range, replaceTxt(search, /\S\s{2,}$/g, 'left'))

            return formatIndent()
        }
    } else {
        if (await checkForCharPairs(editor, selection)) {
            return
        }

        return removeOneChar(editor, range, 'left')
    }
}

async function checkForCharPairs(editor, selection) {
    let check = false

    try {
        let range = new vscode.Range(
            selection.start.line,
            selection.start.character - 1,
            selection.end.line,
            selection.end.character + 1
        )

        if (range.isSingleLine) {
            let txt = editor.document.getText(range)

            if (charPairs.includes(txt)) {
                await changeDoc(editor, range, '')
                check = true
            }
        }
    } catch (error) {
        return check
    }

    return check
}

function removeAll(editor, selection) {
    let range = new vscode.Range(selection.start, selection.end)

    return changeDoc(editor, range, '')
}

async function removeOneChar(editor, selection, dir) {
    let isLeft = dir == 'left'
    let endChar = selection.end.character

    let range = new vscode.Range(
        isLeft ? selection.end.line : selection.start.line,
        isLeft ? endChar : selection.start.character,
        isLeft ? selection.end.line : selection.start.line,
        isLeft
            ? endChar == 0
                ? 0
                : endChar - 1
            : selection.start.character + 1
    )

    // direct prev line word
    // <|word
    if (range.isEmpty) {
        range = new vscode.Range(
            range.start.line - 1,
            range.start.character,
            range.end.line,
            range.end.character
        )
        let search = await editor.document.getText(range)
        await changeDoc(editor, range, replaceTxt(search, /\s+$/, 'left'))

        return formatIndent()
    }

    return changeDoc(editor, range, '')
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
                    el.end.line,
                    el.end.character
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
async function currentLineCheck(editor, cursor, dir) {
    const { document } = editor
    let check = false
    let isLeft = dir == 'left'
    let start = cursor.start
    let end = cursor.end

    try { // remove next char
        let next_char_range = document.getWordRangeAtPosition(start, isLeft ? /(\S(\s)?)$/ : /^(\S(\s)?)/)
        let next_char_pos = isLeft
            ? next_char_range.end.character
            : next_char_range.start.character

        if (next_char_pos == start.character) {
            await removeOneChar(editor, next_char_range, dir)
            check = true
        } else {
            throw new Error()
        }
    } catch (error) {  // remove spaces
        let regex = isLeft ? /\S\s{2,}$/ : /^\s{2,}\S/
        let range = new vscode.Range(
            start.line,
            isLeft ? 0 : start.character,
            end.line,
            isLeft ? end.character : await document.lineAt(start.line).text.length
        )
        let search = await document.getText(range)
        check = regex.test(search)

        if (check) {
            await changeDoc(editor, range, replaceTxt(search, regex, dir))
        }
    }

    return check
}

// utils
function sortSelections(arr) {
    return arr.sort((a, b) => {
        if (a.start.line > b.start.line) return 1
        if (b.start.line > a.start.line) return -1

        return 0
    })
}

async function formatIndent() {
    if (config.keepOneLine && config.formatAfterNewLine) {
        return vscode.commands.executeCommand('editor.action.formatDocument')
    }
}

async function changeDoc(editor, range, replacement) {
    return editor.edit(
        (edit) => edit.replace(range, replacement),
        { undoStopBefore: false, undoStopAfter: false }
    )
}

function replaceTxt(txt, regex, dir) {
    let isLeft = dir == 'left'
    let space = config.keepOneLine
        ? EOL
        : config.keepOneSpace
            ? ' '
            : ''

    return txt.replace(regex, (match) => {
        let data = match.trim()

        return isLeft ? `${data}${space}` : `${space}${data}`
    })
}

async function readConfig() {
    config = await vscode.workspace.getConfiguration('smart-delete')
    charPairs = config.charPairs
}

exports.activate = activate

function deactivate() { }

module.exports = {
    activate,
    deactivate
}
