const { PermissionFlagsBits } = require('discord.js');
const { OWNER_ID } = require('./ai');

/**
 * Checks if the bot can perform a moderation action on a target member.
 * @param {Object} message - The Discord message object.
 * @param {Object} target - The target GuildMember.
 * @param {string} permName - Human-readable name of the permission.
 * @param {bigint} permissionFlag - The PermissionFlagsBits flag to check.
 * @returns {Object} { allowed: boolean, reason: string|null }
 */
function canMod(message, target, permName, permissionFlag) {
    const me = message.guild.members.me;
    if (!me.permissions.has(permissionFlag)) {
        return { allowed: false, reason: `i-i don't even have the '${permName}' permission in my server settings, Master failedmasochist... p-please check my roles...!` };
    }
    if (target.id === message.guild.ownerId) {
        return { allowed: false, reason: `t-they own this entire server, Master failedmasochist... i c-cant touch the owner...!` };
    }
    if (target.roles.highest.position >= me.roles.highest.position) {
        return { allowed: false, reason: `t-their highest role rank is higher than or equal to mine, Master failedmasochist... role hierarchy is b-blocking me...!` };
    }
    return { allowed: true };
}

/**
 * Checks if a user has admin permissions (or is the Master).
 * @param {Object} iOrMsg - The interaction or message object.
 * @returns {boolean}
 */
function checkAdmin(iOrMsg) {
    const authorId = iOrMsg.author ? iOrMsg.author.id : iOrMsg.user.id;
    if (authorId === OWNER_ID) return true;
    
    if (!iOrMsg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      iOrMsg.reply("w-what... you don't have Administrator permissions... p-please don't try to make me do things if you aren't an admin... i-i'll get in trouble...");
      return false;
    }
    return true;
}

module.exports = {
  canMod,
  checkAdmin
};
