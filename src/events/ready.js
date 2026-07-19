const { Events, ActivityType } = require('discord.js');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		console.log(`[READY] Logged in as ${client.user.tag} fr. Time to get bullied... i mean, time to work.`);
		client.user.setPresence({
			activities: [{ 
				name: 'custom_status', 
				type: ActivityType.Custom, 
				state: '/lawful ok join' 
			}],
			status: 'online'
		});
	},
};
