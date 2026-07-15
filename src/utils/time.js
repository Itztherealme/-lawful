/**
 * Parses a duration string (e.g., '10m', '2h', '1d') into milliseconds.
 * @param {string} durationStr - The duration string.
 * @returns {Promise<number>} Milliseconds.
 */
async function parseDuration(durationStr) {
    if (!durationStr) return 10 * 60 * 1000;
    const value = parseInt(durationStr);
    const unit = durationStr.slice(-1).toLowerCase();
    if (isNaN(value)) return 10 * 60 * 1000;
    
    switch (unit) {
        case 's': return value * 1000;
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        case 'w': return value * 7 * 24 * 60 * 60 * 1000;
        default: return value * 60 * 1000; // default to minutes
    }
}

module.exports = {
    parseDuration
};
