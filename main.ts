import { App, Notice, Plugin, PluginSettingTab, Setting, TFile, TAbstractFile, moment } from 'obsidian';

interface CustomNewFileNameSettings
{
	fileNameFormat: string;
}

const DEFAULT_SETTINGS: CustomNewFileNameSettings =
{
	fileNameFormat: 'Untitled {{datetime:YYYYMMDDHHmmss}}'
}

export default class CustomNewFileNamePlugin extends Plugin
{
	settings: CustomNewFileNameSettings;

	async onload()
	{
		await this.loadSettings();

		this.addSettingTab(new CustomNewFileNameSettingTab(this.app, this));
		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file) => {
				menu.addItem((item) => {
					item.setTitle('New note (with custom name)')
						.onClick(() => {
							this.createNewFile(file);
						});
				});
			})
		);
	}

	async loadSettings()
	{
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings()
	{
		await this.saveData(this.settings);
	}

	async createNewFile(menuFile: TAbstractFile)
	{
		const dir = menuFile instanceof TFile ? menuFile.parent : menuFile;
		if (dir == null)
		{
			return;
		}

		try
		{
			const dirPath = dir.parent == null ? '' : (dir.path + '/');
			const filename = this.createFileName();
			const filePath = this.getAvailableFilePath(dirPath + filename, '.md');
			const file = await this.app.vault.create(filePath, '');
			await this.app.workspace.getLeaf().openFile(file);
		}
		catch (e)
		{
			new Notice("Failed to create new file: " + e.toString());
		}
	}

	getFileNameFormat(): string
	{
		return this.settings.fileNameFormat || DEFAULT_SETTINGS.fileNameFormat;
	}

	createFileName(): string
	{
		const format = this.getFileNameFormat();
		const datetimePattern = /\{\{datetime:(.*?)\}\}/;
		const match = format.match(datetimePattern);
		if (!match)
		{
			return format;
		}

		const dateFormat = match[1];
		const formattedDatetime = moment().format(dateFormat);
		return format.replace(datetimePattern, formattedDatetime);
	}

	getAvailableFilePath(basePath: string, ext: string): string
	{
		let path = basePath + ext;
		let i = 1;
		while (this.app.vault.getAbstractFileByPath(path) != null)
		{
			path = basePath + " " + i + ext;
			i++;
		}
		return path;
	}
}

class CustomNewFileNameSettingTab extends PluginSettingTab
{
	plugin: CustomNewFileNamePlugin;

	constructor(app: App, plugin: CustomNewFileNamePlugin)
	{
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void
	{
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('New file name format')
			.setDesc('Define the format for new file names. You can use "{{datetime:YYYYMMDDHHmmss}}" to include the current date and time in your format.')
			.addText(text => text
				.setPlaceholder(DEFAULT_SETTINGS.fileNameFormat)
				.setValue(this.plugin.settings.fileNameFormat)
				.onChange(async (value) => {
					this.plugin.settings.fileNameFormat = value;
					await this.plugin.saveSettings();
				}));
	}
}
