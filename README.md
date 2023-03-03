# chatgpt-note-helper README

This plugins inspired by helping to make notes in markdown. 
But it can also be used in finishing your text homework, chatting with GPT-3.5 (ChatGPT based), helping you code.

这个插件最开始是为了帮助做笔记。但是它也可以被用于写文本作业，和GPT-3.5聊天（ChatGPT用的模型），帮助你写代码。

## Features

1. long/short conversation
   1. long: remember previous messages by json file
   2. short: each time one message

2. adjust param by command or `setting->extension->ChatGPT Note Helper`
   1. `max_token`: decide the lenth of messages
   2. `temperature`: decide the model to give you how many its own ideas

3. Using
   1. right click
   2. ctrl + shift + P: search the command start with `ChatGPT:`
      1. `chatgpt-note-helper.enterApiKey`: Enter you own api key. You can get it with free trials each month in `https://platform.openai.com/account/api-keys`.
      2. `chatgpt-note-helper.ask`: Ask the questions you have selected.
      3. `chatgpt-note-helper.adjustTemperature`: change the temperature. But in long conversation, you need change in json file where the plugin will tell you.
      4. `chatgpt-note-helper.switchJsonMode`: Change the mode of long/short conversation. Store json file in current folder. Because I hate store file in cache which make me feel uncomfortable.

4. Hot key:
   1. Win: `shift + a + s` ask
   2. Mac: `cmd + a + s` ask

## Requirements

You have your own OpenAI (ChatGPT) account or microsoft account.

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

## known issues
1. The api of openAI have the limit of max_tokens, so we can not have the history as long as the ChatGPT website. 
```
But when the plugins tell you that you should shorten the max_tokens for the long conversation mode, 
you can change the max_token in your json file which is in your current folder.
```

### 0.0.1

Initial release

### 1.0.0

1. Clear redundant code
2. Fix bug of change long conversation mode
