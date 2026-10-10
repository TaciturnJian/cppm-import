import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

let moduleList: string[] = [];

function loadCppmi(): void {
	moduleList = [];
	const folder = vscode.workspace.workspaceFolders?.[0];
	if (!folder) {
		stopAuto();
		return;
	}
	const cppmiPath = path.join(folder.uri.fsPath, '.vscode', 'cppmi.json');
	if (!fs.existsSync(cppmiPath)) {
		stopAuto();
		return;
	}

	try {
		const data = JSON.parse(fs.readFileSync(cppmiPath, 'utf-8')) as unknown;
		if (Array.isArray(data) && data.every((e) => typeof e === 'string')) {
			moduleList = data;
		}
	} catch (e) {
		stopAuto();
		vscode.window.showErrorMessage(`Failed to parse cppmi.json: ${e instanceof Error ? e.message : String(e)}`);
		moduleList = [];
	}
}

function isImportContext(lineBeforeCursor: string): string | null {
	const match = lineBeforeCursor.match(/\bimport\s+([\w.]*)$/);
	return match ? match[1] : null;
}

function provideCompletion(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] {
	const lineBeforeCursor = document.lineAt(position.line).text.slice(0, position.character);
	const typed = isImportContext(lineBeforeCursor);
	if (typed === null) {
		return [];
	}

	const typedLower = typed.toLowerCase();
	const range = new vscode.Range(position.line, position.character - typed.length, position.line, position.character);
	const items: vscode.CompletionItem[] = [];
	for (const module of moduleList) {
		if (module.toLowerCase().startsWith(typedLower)) {
			const item = new vscode.CompletionItem(module, vscode.CompletionItemKind.Module);
			item.range = range;
			item.insertText = module;
			items.push(item);
		}
	}
	return items;
}

const moduleFileRegex = /([^/\\]+)\.cppm(?:\+.*)?$/;

function moduleNameFromFile(file: string): string | null {
	const match = file.match(moduleFileRegex);
	return match ? match[1] : null;
}

async function generateCppmi(): Promise<void> {
	const folder = vscode.workspace.workspaceFolders?.[0];
	if (!folder) {
		return;
	}
	const root = folder.uri.fsPath;
	const ccPath = path.join(root, 'compile_commands.json');
	if (!fs.existsSync(ccPath)) {
		stopAuto();
		vscode.window.showErrorMessage(`compile_commands.json not found at ${ccPath}.`);
		return;
	}

	let entries: unknown;
	try {
		entries = JSON.parse(fs.readFileSync(ccPath, 'utf-8'));
	} catch (e) {
		stopAuto();
		vscode.window.showErrorMessage(`Failed to parse ${ccPath}: ${e instanceof Error ? e.message : String(e)}`);
		return;
	}
	if (!Array.isArray(entries)) {
		stopAuto();
		vscode.window.showErrorMessage('compile_commands.json is not an array of string.');
		return;
	}

	const names = new Set<string>();
	for (const entry of entries) {
		if (typeof entry !== 'object' || entry === null) {
			continue;
		}
		const file = (entry as Record<string, unknown>).file;
		const name = typeof file === 'string' ? moduleNameFromFile(file) : null;
		if (name) {
			names.add(name);
		}
	}

	const sorted = [...names].sort();
	const cppmiPath = path.join(root, '.vscode', 'cppmi.json');
	fs.writeFileSync(cppmiPath, JSON.stringify(sorted, null, 4) + '\n');
	loadCppmi();
}

let autoEnabled = false;
let autoTimer: NodeJS.Timeout | undefined;
let autoWatcher: vscode.FileSystemWatcher | undefined;

function scheduleGenerate(): void {
	if (autoTimer) {
		clearTimeout(autoTimer);
	}

	autoTimer = setTimeout(() => {
		autoTimer = undefined;
		void generateCppmi();
	}, 500);
}

function stopAuto(): void {
	autoEnabled = false;
	if (autoTimer) {
		clearTimeout(autoTimer);
		autoTimer = undefined;
	}
	if (autoWatcher) {
		autoWatcher.dispose();
		autoWatcher = undefined;
	}
}

function startAuto(): void {
	if (autoWatcher) {
		return;
	}
	autoWatcher = vscode.workspace.createFileSystemWatcher('compile_commands.json');
	autoWatcher.onDidChange(scheduleGenerate);
}

function toggleAuto(): void {
	if (autoEnabled) {
		stopAuto();
		vscode.window.showInformationMessage('cppm-import: auto mode disabled.');
	} else {
		autoEnabled = true;
		startAuto();
		vscode.window.showInformationMessage('cppm-import: auto mode enabled.');
	}
}

export function activate(context: vscode.ExtensionContext) {
	loadCppmi();
	startAuto();
	context.subscriptions.push(vscode.workspace.createFileSystemWatcher('.vscode/cppmi.json').onDidChange(loadCppmi));

	context.subscriptions.push(vscode.languages.registerCompletionItemProvider('cpp', {
		provideCompletionItems: provideCompletion,
	}));

	context.subscriptions.push(vscode.commands.registerCommand('cppm-import.gen', generateCppmi));
	context.subscriptions.push(vscode.commands.registerCommand('cppm-import.auto', toggleAuto));
}

export function deactivate() {
	stopAuto();
}
