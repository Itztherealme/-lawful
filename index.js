require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 10000;
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, Events } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');

// HTTP Server
app.get('/', (req, res) => res.send('Bot is alive fr'));
app.listen(port, () => console.log(`Server running on port ${port}`));

// Clients
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildBans]
});

// Database
async function getDB(id) {
  const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
  if (!data) {
    const newProfile = { id, wallet: 1000, bank: 0, daily_streak: 0, last_daily_time: 0, inventory: [], pets: [] };
    await supabase.from('profiles').insert(newProfile);
    return newProfile;
  }
  return data;
}

async function saveDB(id, profile) {
  await supabase.from('profiles').update(profile).eq('id', id);
}

const blacklistedUsers = new Set();
const active_bounties = {};
let raidInfo = { active: false, participants: [] };

// Logic Handler
const cmdHandler = {
  async rob(interactionOrMsg, thief, target) {
    if (thief.id === target.id) return interactionOrMsg.reply("bro trying to rob his own pockets, you goofy fr");
    const tDB = await getDB(thief.id);
    const tarDB = await getDB(target.id);
    if (!tDB.inventory.includes('ski_mask')) return interactionOrMsg.reply("bro you think you slick? go buy a ski_mask from the shop before you try to run up on someone lil bro");
    
    // Uno Reverse
    const revIdx = tarDB.inventory.indexOf('uno_reverse');
    if (revIdx !== -1) {
      tarDB.inventory.splice(revIdx, 1);
      tDB.wallet = Math.max(0, tDB.wallet - 3000);
      tarDB.wallet += 3000;
      await saveDB(thief.id, tDB);
      await saveDB(target.id, tarDB);
      return interactionOrMsg.reply(`OH SNAP! They pulled out the Uno Reverse card twin! <@${thief.id}> just got counter-robbed for 3000 $lawless instead, you love to see it lmao`);
    }

    // Standard Rob
    if (Math.random() < 0.5) {
      const amt = Math.floor(tarDB.wallet * (Math.random() * 0.3 + 0.1));
      tarDB.wallet -= amt; tDB.wallet += amt;
      await saveDB(thief.id, tDB);
      await saveDB(target.id, tarDB);
      return interactionOrMsg.reply(`dam twan they stole ya shit boi you lost ${amt} $lawless`);
    } else {
      tDB.wallet = Math.max(0, tDB.wallet - 2000);
      await saveDB(thief.id, tDB);
      return interactionOrMsg.reply("bro got caught lacking by the local blues, you just lost 2000 $lawless in court fees fr");
    }
  }
};

// Interaction Handler
client.on('interactionCreate', async i => {
  if (!i.isChatInputCommand()) return;
  if (blacklistedUsers.has(i.user.id)) return i.reply("bro you are blacklisted from this bot, stop trying to click my buttons lil bro");
  
  if (i.commandName === 'rob') await cmdHandler.rob(i, i.user, i.options.getUser('user'));
});

client.login(process.env.DISCORD_TOKEN);
