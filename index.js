require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, Events } = require('discord.js');
const fs = require('fs');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildBans]
});

// Database & Memory
let db = {};
if (fs.existsSync('database.json')) db = JSON.parse(fs.readFileSync('database.json'));
function saveDB() { fs.writeFileSync('database.json', JSON.stringify(db, null, 2)); }
function getDB(id) { if (!db[id]) db[id] = { wallet: 0, bank: 0, daily_streak: 0, last_daily_time: 0, inventory: [], pets: [] }; return db[id]; }

const hardbannedUsers = new Set();
function getDB(id) { 
  if (!db[id]) db[id] = { wallet: 1000, bank: 0, daily_streak: 0, last_daily_time: 0, inventory: [], pets: [] }; 
  return db[id]; 
}

const econ = {
  // ... existing ...
  hunt: (u) => {
    const d = getDB(u.id);
    const pets = ['Rat', 'Cyber-Demon', 'Glitch Dragon'];
    const p = pets[Math.floor(Math.random() * pets.length)];
    d.pets.push(p); saveDB();
    return `caught a ${p} fr`;
  },
  shop: () => "items: ski_mask (5000), uno_reverse (12000), golden_cuffs (8000)",
  farm: (u) => {
    const d = getDB(u.id);
    const gain = d.pets.length * 50;
    d.wallet += gain; saveDB();
    return `farmed ${gain} $lawless from your zoo lil bro`;
  }
};

  }


// ... registration, handlers ...
// This file will grow too large, I will inform the user of the implementation approach.
client.login(process.env.DISCORD_TOKEN);
