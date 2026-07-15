require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { logMessage } = require('./utils/db');

// HTTP Server for health checks
const app = express();
const port = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('Bot is alive fr'));
app.listen(port, () => console.log(`[HTTP] Server running on port ${port}`));

// Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildBans
  ]
});

// Command Collection
client.commands = new Collection();

// Load Commands Dynamically
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('execute' in command) {
			client.commands.set(command.name, command);
		} else {
			console.warn(`[WARNING] The command at ${filePath} is missing a required "execute" property.`);
		}
	}
}

// Load Events Dynamically
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

// Global Error Handling
process.on('unhandledRejection', error => {
	console.error('[FATAL] Unhandled promise rejection:', error);
});

client.login(process.env.DISCORD_TOKEN);
