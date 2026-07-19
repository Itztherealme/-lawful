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
        return { allowed: false, reason: `i-i don't have the '${permName}' permission, Master... p-please check my server role permissions...!` };
    }
    
    // Check if the bot is physically above the target in role hierarchy
    if (target.roles.highest.comparePositionTo(me.roles.highest) >= 0) {
        return { allowed: false, reason: `t-their role position is higher than or equal to mine, Master... I can't touch them unless you move my bot role higher in the server settings...!` };
    }

    if (target.id === message.guild.ownerId) {
        return { allowed: false, reason: `t-they own this server, Master... I c-can't touch the owner...!` };
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
