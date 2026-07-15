/**
 * Resolves a guild member from a mention, ID, or textual query.
 * @param {Object} message - The Discord message object.
 * @param {string} arg - The argument to resolve (mention, ID, or query).
 * @returns {Promise<Object|null>} The resolved GuildMember or null.
 */
async function resolveMember(message, arg) {
    if (!arg) return null;
    
    // Check for mention
    const mentionMatch = arg.match(/^<@!?(\d+)>$/);
    if (mentionMatch) {
        return message.guild.members.fetch(mentionMatch[1]).catch(() => null);
    }
    
    // Check for ID
    if (/^\d{17,19}$/.test(arg)) {
        return message.guild.members.fetch(arg).catch(() => null);
    }
    
    // Fetch by textual query (username/nickname)
    const fetched = await message.guild.members.fetch({ query: arg, limit: 1 }).catch(() => null);
    return fetched && fetched.size > 0 ? fetched.first() : null;
}

/**
 * Finds a member from textual context using a keyword.
 * @param {Object} message - The Discord message object.
 * @param {string} keyword - The keyword to search after (e.g., 'ban').
 * @returns {Promise<Object|null>} The resolved GuildMember or null.
 */
async function findMemberFromText(message, keyword) {
    const content = message.content;
    const regex = new RegExp(`${keyword}\\s+([^\\n]+)`, 'i');
    const match = content.match(regex);
    if (!match) return null;
    
    const query = match[1].trim();
    const cleanQuery = query.replace(/<@!?\d+>/g, '').trim().split(/\s+/)[0];
    if (!cleanQuery) return null;
    
    return resolveMember(message, cleanQuery);
}

module.exports = {
    resolveMember,
    findMemberFromText
};
