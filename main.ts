import clipboardModifications from "clipboardModification";
import { App, Editor, htmlToMarkdown, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

// cehck out https://github.com/swar8080/obsidian-plugin-update-tracker/blob/master/src/state/actionProducers/fetchReleases.ts for how to search for installed plugins so this doesn't tread on existing Paste As URL plugins

// Remember to rename these classes and interfaces!

interface PasteFunction {
	(this: HTMLElement, ev: ClipboardEvent): void;
}

interface SmartPasteSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: SmartPasteSettings = {
	mySetting: 'default'
}


export default class SmartPastePlugin extends Plugin {
	pasteFunction: PasteFunction;
	settings: SmartPasteSettings;

	async onload() {
		await this.loadSettings();

		// // This creates an icon in the left ribbon.
		// const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
		// 	// Called when the user clicks the icon.
		// 	new Notice('This is a notice!');
		// });
		// // Perform additional things with the ribbon
		// ribbonIconEl.addClass('my-plugin-ribbon-class');

		// // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		// const statusBarItemEl = this.addStatusBarItem();
		// statusBarItemEl.setText('Status Bar Text');

		// // This adds a simple command that can be triggered anywhere
		// this.addCommand({
		// 	id: 'open-sample-modal-simple',
		// 	name: 'Open sample modal (simple)',
		// 	callback: () => {
		// 		new SampleModal(this.app).open();
		// 	}
		// });
		// // This adds an editor command that can perform some operation on the current editor instance
		// this.addCommand({
		// 	id: 'sample-editor-command',
		// 	name: 'Sample editor command',
		// 	editorCallback: (editor: Editor, view: MarkdownView) => {
		// 		console.log(editor.getSelection());
		// 		editor.replaceSelection('Sample Editor Command');
		// 	}
		// });
		// // This adds a complex command that can check whether the current state of the app allows execution of the command
		// this.addCommand({
		// 	id: 'open-sample-modal-complex',
		// 	name: 'Open sample modal (complex)',
		// 	checkCallback: (checking: boolean) => {
		// 		// Conditions to check
		// 		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		// 		if (markdownView) {
		// 			// If checking is true, we're simply "checking" if the command can be run.
		// 			// If checking is false, then we want to actually perform the operation.
		// 			if (!checking) {
		// 				new SampleModal(this.app).open();
		// 			}

		// 			// This command will only show up in Command Palette when the check function returns true
		// 			return true;
		// 		}
		// 	}
		// });

		// // This adds a settings tab so the user can configure various aspects of the plugin
		// this.addSettingTab(new SampleSettingTab(this.app, this));

		// // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// // Using this function will automatically remove the event listener when this plugin is disabled.
		// this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
		// 	console.log('click', evt);
		// });

		// // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

		this.app.workspace.onLayoutReady( () => {
			this.app.plugins.getPlugin();
			// check for any plugins you need, then
			//      display a notice and exit if not found
	
			// do all your actual setup work, and use
			//      this.register(()=>stuff); to do stuff on unload
		});

		this.registerEvent(
			this.app.workspace.on("editor-paste", this.pasteFunction)
		);
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private getEditor(): Editor {
		const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeLeaf) return;
		return activeLeaf.editor;
	}

	// INFO: to inspect clipboard content types, use https://evercoder.github.io/clipboard-inspector/
	async modifyPasteEvent (clipboardEv: ClipboardEvent): Promise<void> {

		// abort when pane isn't markdown editor
		const editor = this.getEditor();
		if (!editor) return;

		// abort when clipboard contains an image (or is empty)
		// check for plain text, since 'getData("text/html")' ignores plain-text
		const plainClipboard = clipboardEv.clipboardData.getData("text/plain");
		if (!plainClipboard) return;

		// Abort when clipboard has URL, to prevent conflict with the plugins
		// Auto Title Link & Paste URL into Selection
		// has to search the entire clipboard (not surrounding the regex with ^$),
		// because otherwise having 2 URLs cause Obsidian-breaking conflict
		const urlRegex = /((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()[\]{};:'".,<>?«»“”‘’]))/i;
		if (urlRegex.test(plainClipboard.trim())) {
			console.log("Pasta Copinara aborted due as the clipboard is a link to avoid conflict with other plugins that modify pasting.");
			return;
		}

		// prevent default pasting & abort when not successful
		clipboardEv.stopPropagation();
		clipboardEv.preventDefault();
		if (!clipboardEv.defaultPrevented) return;

		// use Turndown via Obsidian API to emulate "Auto Convert HTML" setting
		const convertHtmlEnabled = this.app.vault.getConfig("autoConvertHtml");
		const htmlClipb = clipboardEv.clipboardData.getData("text/html");
		const clipboardText = htmlClipb && convertHtmlEnabled ? htmlToMarkdown(htmlClipb) : plainClipboard;

		// if everything went well, run clipboard modifications (also passing
		// editor is necessary so clipboard text can be modified based on cursor
		// position)
		clipboardModifications(editor, clipboardText);
	}

	async pasteAsPlainText (editor: Editor): Promise<void> {
		const clipboardContent = await navigator.clipboard.readText();
		if (!clipboardContent) {
			new Notice ("There is no clipboard content.");
			return;
		}
		editor.replaceSelection(clipboardContent);
	}
	
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: SmartPastePlugin;

	constructor(app: App, plugin: SmartPastePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					console.log('Secret: ' + value);
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
