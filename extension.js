const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const CACHE_NAMES = ['.pytest_cache', '__pycache__', '.cache'];

function activate(context) {
    const commandId = 'python-cache-cleaner.cleanCache';
    // 2. Register Command
    let disposable = vscode.commands.registerCommand(commandId, function (uri) {
        let targets = [];

        if (uri && uri.fsPath) {
            targets.push(uri.fsPath);
        } else {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                vscode.window.showWarningMessage('No workspace folder open!');
                return;
            }
            targets = workspaceFolders.map(folder => folder.uri.fsPath);
        }

        let totalDeleted = 0;
        for (const targetPath of targets) {
            totalDeleted += cleanCache(targetPath);
        }

        if (totalDeleted > 0) {
            vscode.window.showInformationMessage(`Python cache cleaned successfully! Removed ${totalDeleted} folders.`);
        } else {
            vscode.window.showInformationMessage('No Python cache directories found.');
        }
    });

    context.subscriptions.push(disposable);
}

function cleanCache(currentPath) {
    let count = 0;
    if (!fs.existsSync(currentPath)) return count;

    let files;
    try {
        files = fs.readdirSync(currentPath);
    } catch {
        return count;
    }

    for (const file of files) {
        const filePath = path.join(currentPath, file);
        let stat;
        
        try {
            stat = fs.lstatSync(filePath);
        } catch {
            continue; 
        }

        if (stat.isDirectory()) {
            if (CACHE_NAMES.includes(file)) {
                try {
                    fs.rmSync(filePath, { recursive: true, force: true });
                    count++;
                } catch (err) {
                    console.error(`Error occurred while deleting ${filePath}: ${err.message}`);
                }
            } else {
                if (file !== 'node_modules' && file !== '.git' && file !== '.venv' && file !== 'env_pytest') {
                    count += cleanCache(filePath);
                }
            }
        }
    }
    return count;
}

function deactivate() {}

module.exports = { activate, deactivate };