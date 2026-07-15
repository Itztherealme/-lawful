const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

/**
 * Fetches a user profile from Supabase. Creates one if it doesn't exist.
 * @param {string} id - The Discord user ID.
 * @returns {Promise<Object>} The user profile data.
 */
async function getDB(id) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
  if (error || !data) {
    const newProfile = { 
      id, 
      wallet: 1000, 
      bank: 0, 
      daily_streak: 0, 
      last_daily_time: 0, 
      inventory: [], 
      pets: [] 
    };
    await supabase.from('profiles').insert(newProfile);
    return newProfile;
  }
  return data;
}

/**
 * Updates a user profile in Supabase.
 * @param {string} id - The Discord user ID.
 * @param {Object} profile - The updated profile data.
 */
async function saveDB(id, profile) {
  const { error } = await supabase.from('profiles').update(profile).eq('id', id);
  if (error) console.error(`[DB ERROR] Failed to save profile for ${id}:`, error);
}

/**
 * Logs a message event for analytics in Supabase.
 * @param {string} guildId - The Discord guild ID.
 */
async function logMessage(guildId) {
  const { data, error } = await supabase.from('analytics').select('*').eq('guild_id', guildId).single();
  if (error || !data) {
    await supabase.from('analytics').insert({ guild_id: guildId, total_messages_processed: 1 });
  } else {
    await supabase.from('analytics').update({ total_messages_processed: data.total_messages_processed + 1 }).eq('guild_id', guildId);
  }
}

module.exports = {
  supabase,
  getDB,
  saveDB,
  logMessage
};
