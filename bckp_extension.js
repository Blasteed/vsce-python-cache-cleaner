const fs = require('fs');
const path = require('path');
const vscode = require('vscode');

// Nome delle cartelle di cache che vogliamo piallare
const CACHE_NAMES = ['.pytest_cache', '__pycache__', '.cache'];

function activate(context) {
    // 1. Crea il tasto nella Barra di Stato (in basso a destra)
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'proto_cache-cleaner.clean';
    statusBarItem.text = '$(trash) Clean Python Cache (WS)';
    statusBarItem.tooltip = 'Clean pytest and Python cache folders in the current workspace';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // 2. Registra l'azione al click del tasto
    let disposable = vscode.commands.registerCommand('proto_cache-cleaner.clean', function () {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        
        if (!workspaceFolders) {
            vscode.window.showWarningMessage('No workspace folders open!');
            return;
        }

        // Mostra una notifica di caricamento in basso a destra
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Cleaning pytest and Python cache folders...",
            cancellable: false
        }, async () => {
            let totalDeleted = 0;

            // Gira su tutte le cartelle aperte nel workspace
            for (const folder of workspaceFolders) {
                const rootPath = folder.uri.fsPath;
                totalDeleted += cleanCache(rootPath);
            }

            // Notifica finale con il risultato
            if (totalDeleted > 0) {
                vscode.window.showInformationMessage(`Cleaning completed! Deleted ${totalDeleted} cache folders.`);
            } else {
                vscode.window.showInformationMessage('No cache folders found.');
            }
        });
    });

    context.subscriptions.push(disposable);
}

// Funzione ricorsiva per scansionare e cancellare
function cleanCache(currentPath) {
    let count = 0;
    if (!fs.existsSync(currentPath)) return count;

    let files;
    try {
        files = fs.readdirSync(currentPath);
    } catch (e) {
        return count; // Salta cartelle senza permessi di lettura
    }

    for (const file of files) {
        const filePath = path.join(currentPath, file);
        let stat;
        
        try {
            stat = fs.lstatSync(filePath);
        } catch (e) {
            continue; 
        }

        if (stat.isDirectory()) {
            // Se la cartella è nella nostra blacklist, la pialliamo all'istante
            if (CACHE_NAMES.includes(file)) {
                try {
                    fs.rmSync(filePath, { recursive: true, force: true });
                    count++;
                } catch (err) {
                    console.error(`Error deleting ${filePath}: ${err.message}`);
                }
            } else {
                // Escludiamo le cartelle giganti per non rallentare il ciclo di scansione
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