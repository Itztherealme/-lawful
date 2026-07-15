const { Events } = require('discord.js');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		console.log(`[READY] Logged in as ${client.user.tag} fr. Time to get bullied... i mean, time to work.`);
	},
};
