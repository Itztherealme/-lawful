require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 10000;
const { Client, GatewayIntentBits, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');

// HTTP Server
app.get('/', (req, res) => res.send('Bot is alive fr'));
app.listen(port, () => console.log(`Server running on port ${port}`));

// Clients
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildBans]
});

// Database Helpers
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

// Analytics Helpers
async function logMessage(guildId) {
  const { data } = await supabase.from('analytics').select('*').eq('guild_id', guildId).single();
  if (!data) {
    await supabase.from('analytics').insert({ guild_id: guildId, total_messages_processed: 1 });
  } else {
    await supabase.from('analytics').update({ total_messages_processed: data.total_messages_processed + 1 }).eq('guild_id', guildId);
  }
}

const blacklistedUsers = new Set();
const items = {
  'ski_mask': { price: 5000, description: 'Required to run /rob' },
  'uno_reverse': { price: 12000, description: 'Counter-attack shield' },
  'golden_cuffs': { price: 8000, description: 'Moderation timing multiplier' }
};

const cmdHandler = {
  // --- Admin Permission Guard ---
  checkAdmin(iOrMsg) {
    if (!iOrMsg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      iOrMsg.reply("bro you don't got the stripes for this, stop trying to touch my controls before you get smacked fr");
      return false;
    }
    return true;
  },

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
  },

  async cf(interactionOrMsg, user, amount) {
    let profile = await getDB(user.id);
    if (profile.wallet < amount) return interactionOrMsg.reply("broke boy alert! you ain't got the bread for that, get back on your grind");
    
    if (Math.random() < 0.5) {
      profile.wallet += amount;
      await saveDB(user.id, profile);
      return interactionOrMsg.reply(`W! You just doubled your money and got ${amount} $lawless more. Keep stacking.`);
    } else {
      profile.wallet -= amount;
      await saveDB(user.id, profile);
      return interactionOrMsg.reply(`L. You just lost ${amount} $lawless. Stop gambling and get your money up.`);
    }
  },

  async shop(interactionOrMsg) {
    const embed = new EmbedBuilder()
      .setTitle("🎭 THE BLACK MARKET")
      .setDescription("yo, check the stash, cop something before it's gone")
      .addFields(
        Object.entries(items).map(([name, data]) => ({
          name: `${name.replace('_', ' ').toUpperCase()} — ${data.price.toLocaleString()} $lawless`,
          value: data.description
        }))
      );

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('shop_buy_menu')
        .setPlaceholder('Select an item to purchase...')
        .addOptions(
          Object.entries(items).map(([name, data]) => ({
            label: name.replace('_', ' '),
            value: name
          }))
        )
    );

    await interactionOrMsg.reply({ embeds: [embed], components: [row] });
  },

  async help(interactionOrMsg) {
    const embed = new EmbedBuilder()
      .setTitle("CLANKER COMMAND DIRECTORY")
      .setDescription("shows you every single command in this clanker before you get lost")
      .addFields(
        { name: "🛡️ ADMIN MODERATION", value: "ban, kick, mute, unmute, softban, warn, purge, lock, unlock, slowmode, lockdown, hardstrip, role, nick" },
        { name: "🎰 DEGEN ECONOMY", value: "daily, bal, deposit, withdraw, give, slots, cf, rps, scratch, roulette, shop, buy, inv" },
        { name: "⚔️ STREET COMBAT", value: "rob, mug, bounty, claimbounty, bountylist, raid, hunt, zoo, sellpet, petfight, farm" },
        { name: "⚙️ POWER CORE", value: "ping, help, insights" }
      );
    await interactionOrMsg.reply({ embeds: [embed] });
  },

  async insights(interactionOrMsg, guild) {
    if (!this.checkAdmin(interactionOrMsg)) return;
    const { data } = await supabase.from('analytics').select('*').eq('guild_id', guild.id).single();
    const embed = new EmbedBuilder()
      .setTitle(`📊 INSIGHTS FOR ${guild.name.toUpperCase()}`)
      .addFields(
        { name: "Total Members", value: `${guild.memberCount}`, inline: true },
        { name: "Total Messages Processed", value: `${data?.total_messages_processed || 0}`, inline: true }
      );
    await interactionOrMsg.reply({ embeds: [embed] });
  }
};

// Events
client.on('guildCreate', guild => {
  console.log(`🟢 NEW HUB SECURED: Connected to ${guild.name} | ${guild.memberCount} users. Let's run it up.`);
});

client.on('guildDelete', guild => {
  console.log(`🔴 LOST SECTOR: Kicked from ${guild.name}. They couldn't handle the heat fr.`);
});

client.on('interactionCreate', async i => {
  if (i.isChatInputCommand()) {
    if (blacklistedUsers.has(i.user.id)) return i.reply("bro you are blacklisted from this bot, stop trying to click my buttons lil bro");
    
    if (i.commandName === 'rob') await cmdHandler.rob(i, i.user, i.options.getUser('user'));
    else if (i.commandName === 'shop') await cmdHandler.shop(i);
    else if (i.commandName === 'lawhelp') await cmdHandler.help(i);
    else if (i.commandName === 'cf') await cmdHandler.cf(i, i.user, i.options.getInteger('amount'));
    else if (i.commandName === 'insights') await cmdHandler.insights(i, i.guild);
  } else if (i.isStringSelectMenu()) {
    if (i.customId === 'shop_buy_menu') {
      const itemKey = i.values[0];
      const item = items[itemKey];
      let profile = await getDB(i.user.id);

      if (profile.wallet < item.price) return i.reply({ content: "bro you don't even got the funds for this item, stop playing with my inventory", ephemeral: true });
      
      profile.wallet -= item.price;
      profile.inventory.push(itemKey);
      await saveDB(i.user.id, profile);
      await i.reply({ content: `pleasure doing business twin, just threw 1x ${itemKey.replace('_', ' ')} into your inventory bag.`, ephemeral: true });
    }
  }
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;
  await logMessage(message.guild.id);
  if (!message.content.startsWith('.l ')) return;

  const args = message.content.slice(3).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (blacklistedUsers.has(message.author.id)) return message.reply("bro you are blacklisted from this bot, stop trying to click my buttons lil bro");

  if (command === 'rob') await cmdHandler.rob(message, message.author, message.mentions.users.first());
  else if (command === 'shop') await cmdHandler.shop(message);
  else if (command === 'help') await cmdHandler.help(message);
  else if (command === 'cf') await cmdHandler.cf(message, message.author, parseInt(args[0]));
  else if (command === 'insights') await cmdHandler.insights(message, message.guild);
});

client.login(process.env.DISCORD_TOKEN);
