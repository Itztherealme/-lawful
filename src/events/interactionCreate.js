const { Events } = require('discord.js');
const { getDB, saveDB } = require('../utils/db');

// Item definitions (kept for shop interactions)
const items = {
  'ski_mask': { price: 5000, description: 'Required to run /rob' },
  'uno_reverse': { price: 12000, description: 'Counter-attack shield' },
  'golden_cuffs': { price: 8000, description: 'Moderation timing multiplier' }
};

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`[ERROR] Interaction command ${interaction.commandName} failed:`, error);
                await interaction.reply({ content: 'u-uh... i-i tripped and broke something... s-sorry...', ephemeral: true });
            }
		} else if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'shop_buy_menu') {
                const itemKey = interaction.values[0];
                const item = items[itemKey];
                let profile = await getDB(interaction.user.id);

                if (profile.wallet < item.price) {
                    return interaction.reply({ content: "u-uh... you don't have enough money for that... s-sorry...", ephemeral: true });
                }
                
                profile.wallet -= item.price;
                if (!profile.inventory) profile.inventory = [];
                profile.inventory.push(itemKey);
                
                await saveDB(interaction.user.id, profile);
                await interaction.reply({ content: `u-uh... here you go... I just put the ${itemKey.replace('_', ' ')} in your bag...`, ephemeral: true });
            }
        }
	},
};
