const { PermissionFlagsBits } = require('discord.js');
const { resolveMember } = require('../../utils/resolve');
const { canMod, checkAdmin } = require('../../utils/permission');

module.exports = {
	name: 'kick',
	async execute(message, args) {
		if (!checkAdmin(message)) return;
		const target = await resolveMember(message, args[0]);
		if (!target) return message.reply("w-who...? i-i can't find who you're talking about...");
		
		const check = canMod(message, target, "Kick Members", PermissionFlagsBits.KickMembers);
		if (!check.allowed) return message.reply(check.reason);

		const reason = args.slice(1).join(' ') || "No reason provided";
		try {
			await target.kick(reason);
			await message.reply(`u-uh... i-i kicked ${target.user.username}... t-they're gone now...`);
		} catch (err) {
			console.error(err);
			await message.reply("s-something went wrong... i c-cant kick them...");
		}
	},
};
