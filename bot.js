// Require the necessary discord.js classes
const { Client, Collection, Events, GatewayIntentBits, SlashCommandBuilder, ActivityType } = require('discord.js');
const path = require('path');
const fs = require('fs');
const json = require('jsonfile');


class DiscordBot {
	constructor() {
		this.code = json.readFileSync('config.json').token;

		const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
		client.commands = new Collection();

		const commandsPath = path.join(__dirname, 'commands');
		const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
		
		for (const file of commandFiles) {
			const filePath = path.join(commandsPath, file);
			const command = require(filePath);
			// Set a new item in the Collection with the key as the command name and the value as the exported module
			if ('data' in command && 'execute' in command) {
				client.commands.set(command.data.name, command);
			} else {
				console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
			}
		}

		client.once(Events.ClientReady, async client => {
			console.log(`[Discord] Ready! Logged in as ${client.user.tag}`);
		});

		client.on(Events.InteractionCreate, async interaction => {
			if (!interaction.isChatInputCommand()) return;
		
			const command = interaction.client.commands.get(interaction.commandName);
		
			if (!command) {
				console.error(`[Discord] No command matching ${interaction.commandName} was found.`);
				return;
			}
		
			try {
				await command.execute(interaction);
			} catch (error) {
				console.error(error);
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp({ content: ':( There was an error while executing this command!', ephemeral: true });
				} else {
					await interaction.reply({ content: ':( There was an error while executing this command!', ephemeral: true });
				}
			}
		});

		client.login(this.code);
		this.client = client;
	}
}





var bot = new DiscordBot();
