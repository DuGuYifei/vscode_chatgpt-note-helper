const vscode = require('vscode');
const fetch = require("node-fetch");
const fs = require('fs');
const path = require('path');


const chatgptFileName = 'chatgpt.json';
const chatgptFolderName = "_chat_history_";


/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	let bodyData = {};

	let apikey = vscode.workspace.getConfiguration().get('chatgpt-note-helper.apikey');
	if (!apikey)
		apikey = undefined;

	let maxToken = vscode.workspace.getConfiguration().get('chatgpt-note-helper.maxToken');
	if (!maxToken)
		maxToken = 3000;

	let temperature = vscode.workspace.getConfiguration().get('chatgpt-note-helper.temperature');
	if (!temperature)
		temperature = 0.1;

	let isLongConversationMode = vscode.workspace.getConfiguration().get('chatgpt-note-helper.isLongConversationMode');
	if (!isLongConversationMode)
		isLongConversationMode = false;


	//---------command--------------
	const enterApiKey = vscode.commands.registerCommand('chatgpt-note-helper.enterApiKey', () => {
		vscode.window.showInputBox({
			prompt: "Enter your API Key got from https://platform.openai.com/account/api-keys",
			placeHolder: "Get it in https://platform.openai.com/account/api-keys"
		}).then(value => {
			if (value) {
				apikey = value;
				vscode.workspace.getConfiguration().update('chatgpt-note-helper.apikey', apikey, true);
				vscode.window.showInformationMessage('Successafully get API Key!');
			} else {
				vscode.window.showWarningMessage('Error to input API Key!');
			}
		})
	});

	const adjustMaxToken = vscode.commands.registerCommand('chatgpt-note-helper.adjustMaxToken', () => {
		vscode.window.showInputBox({
			prompt: "Input max token which decide the max length of reply.",
			placeHolder: "default is 3000, maximum is 4096"
		}).then(value => {
			if (value) {
				maxToken = Number(value);
				if (isLongConversationMode)
					vscode.window.showErrorMessage(`You are in long conversation mode, please change it in ${chatgptFolderName}/${chatgptFileName}`);
				else {
					vscode.workspace.getConfiguration().update('chatgpt-note-helper.maxToken', maxToken, true);
					vscode.window.showInformationMessage('Set maxToken as ' + maxToken);
				}
			} else {
				vscode.window.showWarningMessage('Error to input maxToken!');
			}
		})
	})

	const adjustTemperature = vscode.commands.registerCommand('chatgpt-note-helper.adjustTemperature', () => {
		vscode.window.showInputBox({
			prompt: "Input temperature which decide the model's divergence of idea",
			placeHolder: "default is 0.1"
		}).then(value => {
			if (value) {
				temperature = Number(value);
				vscode.workspace.getConfiguration().update('chatgpt-note-helper.maxToken', temperature, true);
				if (isLongConversationMode) {
					vscode.window.showErrorMessage(`You are in long conversation mode, please change it in ${chatgptFolderName}/${chatgptFileName}`);
				}
				else {
					vscode.workspace.getConfiguration().update('chatgpt-note-helper.maxToken', temperature, true);
					vscode.window.showInformationMessage('Set temperature as ' + temperature);
				}
			} else {
				vscode.window.showWarningMessage('Error to input temperature!');
			}
		})
	})

	const switchJsonMode = vscode.commands.registerCommand('chatgpt-note-helper.switchJsonMode', () => {
		vscode.window.showInputBox({
			prompt: "Input 0 or 1 to close or open long conversation by read write json",
			placeHolder: "default is 0 which means close this mode"
		}).then(value => {
			if (value) {
				isLongConversationMode = Boolean(Number(value));
				vscode.workspace.getConfiguration().update('chatgpt-note-helper.isLongConversationMode', isLongConversationMode, true);
				if (isLongConversationMode) {
					createConversaitonJsonFile();
					vscode.window.showInformationMessage('Open long conversation mode');
				}
				else
					vscode.window.showInformationMessage('Close long conversation mode');
			} else {
				vscode.window.showWarningMessage('Error to set mode!');
			}
		})
	})

	const ask = vscode.commands.registerCommand("chatgpt-note-helper.ask", () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showInformationMessage('No text is chosen');
			return;
		}
		if (apikey === undefined) {
			vscode.window.showInformationMessage('Please give a valid api key firstly by ctrl+shift+p ChatGPT: Enter API Key');
			return;
		}

		const selectedText = editor.document.getText(editor.selection);

		const url = 'https://api.openai.com/v1/chat/completions';

		isLongConversationMode = vscode.workspace.getConfiguration().get('chatgpt-note-helper.isLongConversationMode');
		
		if (isLongConversationMode) {
			bodyData = readJsonFile();
			bodyData.messages.push({
				'role': 'user',
				'content': selectedText
			});
		} else {
			bodyData = {
				model: "gpt-3.5-turbo",
				messages: [{
					'role': 'user',
					'content': selectedText
				}],
				max_tokens: maxToken,
				temperature: temperature
			};
		}

		const headers = {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apikey}`,
		};

		fetch(url, {
			method: 'POST',
			headers: headers,
			body: JSON.stringify(bodyData),
		}).then(res => res.json())
			.then(data => {
				if (data.error) {
					//console.log(data);
					vscode.window.showErrorMessage(data.error.code);
					if (data.error.code == "context_length_exceeded")
						vscode.window.showErrorMessage("Try to use command - ChatGPT: adjust parameter max_token - to shorter the completion message or delete sth in the json file");
				}
				editor.edit(editBuilder => {
					editBuilder.insert(editor.selection.end, '\n');
					editBuilder.insert(editor.selection.end, data.choices[0].message.content + '\n');
					if (isLongConversationMode) {
						bodyData.messages.push(data.choices[0].message);
						createConversaitonJsonFile(bodyData);
					}
				});
			})
			.catch(err => {
				//console.error(err);
				vscode.window.showErrorMessage(err);
			});
	})


	//---------others-----------------
	const createConversaitonJsonFile = (data = undefined) => {
		const fileContent = data === undefined ? {
			model: "gpt-3.5-turbo",
			messages: [
				{ "role": "system", "content": "You are a helpful assistant." },
			],
			max_tokens: maxToken,
			temperature: temperature
		} : data;

		const currentPath = getCurrentPath();
		const filePath = path.join(currentPath, chatgptFileName);
		vscode.workspace.fs.createDirectory(vscode.Uri.file(currentPath)).then(() => {
			fs.writeFile(filePath, JSON.stringify(fileContent, null, 4), (err) => {
				if (err) {
					//console.error(err);
					vscode.window.showErrorMessage('Fail to create Json file');
					return;
				}
				vscode.window.showInformationMessage(`json file - ${chatgptFileName} - create successfully`);
			});
		});
	}

	const readJsonFile = () => {

		const filePath = path.join(getCurrentPath(), chatgptFileName);

		const data = fs.readFileSync(filePath);
		const obj = JSON.parse(data.toString());

		return obj;
	}

	const getCurrentPath = () => {
		const currentWorkSpace = vscode.window.activeTextEditor.document.uri.fsPath.replace(/\\[^\\]*$/, '');
		return path.join(currentWorkSpace, chatgptFolderName);
	}

	context.subscriptions.push(enterApiKey, ask, adjustMaxToken, adjustTemperature, switchJsonMode);
}


function deactivate() {
	let apikey = vscode.workspace.getConfiguration().get('chatgpt-note-helper.apikey');
	if (!apikey)
		apikey = undefined;

	let maxToken = vscode.workspace.getConfiguration().get('chatgpt-note-helper.maxToken');
	if (!maxToken)
		maxToken = 3000;

	let temperature = vscode.workspace.getConfiguration().get('chatgpt-note-helper.temperature');
	if (!temperature)
		temperature = 0.1;

	let isLongConversationMode = vscode.workspace.getConfiguration().get('chatgpt-note-helper.isLongConversationMode');
	if (!isLongConversationMode)
		isLongConversationMode = false;

	if (apikey !== undefined) {
		vscode.workspace.getConfiguration().update('chatgpt-note-helper.apikey', apikey, true);
		vscode.workspace.getConfiguration().update('chatgpt-note-helper.maxToken', maxToken, true);
		vscode.workspace.getConfiguration().update('chatgpt-note-helper.temperature', temperature, true);
		vscode.workspace.getConfiguration().update('chatgpt-note-helper.isLongConversationMode', false, true);
	}
}



//---------exports----------------
module.exports = {
	activate,
	deactivate
}
