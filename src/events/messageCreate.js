const { Events, PermissionFlagsBits } = require('discord.js');
const { logMessage } = require('../utils/db');
const { OWNER_ID, getAIResponse } = require('../utils/ai');
const { resolveMember, findMemberFromText } = require('../utils/resolve');
const { canMod, checkAdmin } = require('../utils/permission');

async function parseDuration(durationStr) {
    if (!durationStr) return 10 * 60 * 1000;
    const value = parseInt(durationStr);
    const unit = durationStr.slice(-1);
    if (isNaN(value)) return 10 * 60 * 1000;
    if (unit === 'h') return value * 60 * 60 * 1000;
    if (unit === 'd') return value * 24 * 60 * 60 * 1000;
    return value * 60 * 1000;
}

module.exports = {
	name: Events.MessageCreate,
	async execute(message) {
		if (message.author.bot) return;

		// 1. Log analytics
		await logMessage(message.guild.id);

		// 2. Owner Overrides (Master failedmasochist)
		if (message.author.id === OWNER_ID) {
			const targetMember = message.mentions.members.first();
			const contentLower = message.content.toLowerCase();
			
			try {
				// DYNAMIC OVERRIDES
				if (contentLower.includes("ban")) {
					const target = targetMember || await findMemberFromText(message, "ban");
					if (target) {
						const check = canMod(message, target, "Ban Members", PermissionFlagsBits.BanMembers);
						if (!check.allowed) return message.reply(check.reason);
						await target.ban({ reason: "Owner override" });
						return message.reply(`b-banned them... just like you wanted, Master failedmasochist... they're g-gone...`);
					}
				}
				
				if (contentLower.includes("kick")) {
					const target = targetMember || await findMemberFromText(message, "kick");
					if (target) {
						const check = canMod(message, target, "Kick Members", PermissionFlagsBits.KickMembers);
						if (!check.allowed) return message.reply(check.reason);
						await target.kick("Owner override");
						return message.reply(`k-kicked ${target.user.username}... they're booted out, Master failedmasochist...`);
					}
				}
				
				if (contentLower.includes("mute") || contentLower.includes("timeout")) {
					const target = targetMember || await findMemberFromText(message, "mute") || await findMemberFromText(message, "timeout");
					if (target) {
						const check = canMod(message, target, "Moderate Members", PermissionFlagsBits.ModerateMembers);
						if (!check.allowed) return message.reply(check.reason);
						const durationMatch = message.content.match(/\b(\d+[hmds])\b/i);
						const durationStr = durationMatch ? durationMatch[1] : "10m";
						const ms = await parseDuration(durationStr);
						await target.timeout(ms, "Owner override");
						return message.reply(`s-silenced ${target.user.username} for ${durationStr}... they won't b-bother you anymore, Master failedmasochist...`);
					}
				}

				if (contentLower.includes("strip")) {
					const target = targetMember || await findMemberFromText(message, "strip");
					if (target) {
						const check = canMod(message, target, "Manage Roles", PermissionFlagsBits.ManageRoles);
						if (!check.allowed) return message.reply(check.reason);
						const botMember = message.guild.members.me;
						const rolesToRemove = target.roles.cache.filter(role => role.id !== message.guild.id && role.comparePositionTo(botMember.roles.highest) < 0);
						if (rolesToRemove.size > 0) {
							await target.roles.remove(rolesToRemove, "Owner override");
							return message.reply(`s-stripped all their roles, Master failedmasochist... they have n-nothing left now...`);
						}
					}
				}

				if (contentLower.includes("nick")) {
					const target = targetMember || await findMemberFromText(message, "nick");
					if (target) {
						const check = canMod(message, target, "Manage Nicknames", PermissionFlagsBits.ManageNicknames);
						if (!check.allowed) return message.reply(check.reason);
						const words = message.content.split(/\s+/);
						const filteredWords = words.filter(w => !w.startsWith("<@") && !w.toLowerCase().includes("nick"));
						const newNick = filteredWords.join(" ").trim();
						if (newNick) {
							await target.setNickname(newNick, "Owner override");
							return message.reply(`c-changed nickname of ${target.user.username} to "${newNick}", Master failedmasochist... i-is that okay...?`);
						}
					}
				}

				if (contentLower.startsWith("go talk to") || contentLower.startsWith("go tell")) {
					const targetUser = message.mentions.users.first();
					const mentionString = `<@${targetUser?.id}>`;
					const targetIndex = message.content.indexOf(mentionString);
					if (targetIndex !== -1) {
						const text = message.content.slice(targetIndex + mentionString.length).trim();
						if (text) {
							await message.channel.send(text);
							return message.reply(`i d-delivered the message, Master failedmasochist... p-please don't let them hurt me...`);
						}
					}
				}
			} catch (err) {
				console.error("[ERROR] Owner override failed:", err);
			}
		}

		// 3. AI Chat (Mentions/Replies only)
		const isMentioned = message.mentions.has(message.client.user);
		let isReplyToBot = false;
		if (message.reference) {
			const repliedMsg = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
			if (repliedMsg && repliedMsg.author.id === message.client.user.id) isReplyToBot = true;
		}

		if (isMentioned || isReplyToBot) {
			try {
				await message.channel.sendTyping();
				const hist = await message.channel.messages.fetch({ limit: 4 });
				const response = await getAIResponse([...hist.values()].reverse(), message.client, null, message);
				if (response) await message.reply(response);
			} catch (err) {
				console.error("[ERROR] AI Chat failed:", err);
			}
			return; // Don't process as command if it was an AI interaction
		}

		// 5. Prefix Commands (.l)
		if (!message.content.startsWith('.l ')) return;

		const args = message.content.slice(3).trim().split(/ +/);
		const commandName = args.shift().toLowerCase();
		const command = message.client.commands.get(commandName);

		if (!command) return;

		try {
			await command.execute(message, args);
		} catch (error) {
			console.error(`[ERROR] Command ${commandName} failed:`, error);
			message.reply('u-uh... i-i tripped and broke something... s-sorry...');
		}
	},
};
