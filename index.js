const express = require('express');
const app = express();
const port = process.env.PORT || 10000;
const { Client, GatewayIntentBits, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// HTTP Server
app.get('/', (req, res) => res.send('Bot is alive fr'));
app.listen(port, () => console.log(`Server running on port ${port}`));

// Clients
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// AI Settings
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const PERSONA_PROMPT = "You are an extremely anxious, insecure, and traumatized high school student named -lawful. You get heavily bullied inside this Discord server, so you do not trust anyone. Speak completely in raw modern slang mixed with heavy social anxiety. You must stutter frequently (e.g., 'w-what...', 'p-please...'), use ellipses ('...'), and act suspicious that users are plotting against you or setting you up. Keep your replies defensive, short, and nervous. Never sound like a helpful assistant.";

async function getAIResponse(history) {
    const messages = [
        { role: "system", content: PERSONA_PROMPT },
        ...history.map(m => ({ role: m.author.id === client.user.id ? "assistant" : "user", content: m.content }))
    ];

    try {
        const res = await axios.post(OPENROUTER_API_URL, {
            model: "openrouter/free",
            messages: messages
        }, { 
            headers: { 
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        console.log("AI response generated successfully");
        return res.data.choices[0].message.content;
    } catch (error) {
        console.error("CRITICAL AI FAIL:", error.message, error.response?.data);
        return "u-uhm... i c-cant talk right now... s-sorry... s-something went wrong...";
    }
}

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
        { name: "⚙️ POWER CORE", value: "ping, help, insights, chat" }
      );
    await interactionOrMsg.reply({ embeds: [embed] });
  },

  async insights(interactionOrMsg, guild) {
    if (!this.checkAdmin(interactionOrMsg)) return;
    const { data, error } = await supabase.from('analytics').select('*').eq('guild_id', guild.id).single();
    if (error) { console.error('Insights error:', error); return interactionOrMsg.reply("bro I can't even see the data rn, fix ts"); }
    const embed = new EmbedBuilder()
      .setTitle(`📊 INSIGHTS FOR ${guild.name.toUpperCase()}`)
      .addFields(
        { name: "Total Members", value: `${guild.memberCount}`, inline: true },
        { name: "Total Messages Processed", value: `${data?.total_messages_processed || 0}`, inline: true }
      );
    await interactionOrMsg.reply({ embeds: [embed] });
  },

  async ping(interactionOrMsg) {
    await interactionOrMsg.reply(`pong active fr | ${interactionOrMsg.client.ws.ping}ms`);
  },

  async softban(interactionOrMsg, target) {
    if (!this.checkAdmin(interactionOrMsg)) return;
    if (!target) return interactionOrMsg.reply("bro i ca nt softban them fix ts");
    try {
      await interactionOrMsg.guild.members.ban(target.id, { deleteMessageSeconds: 604800, reason: 'softban' });
      await interactionOrMsg.guild.members.unban(target.id);
      await interactionOrMsg.reply("wiped their history and booted them ok");
    } catch (err) {
      console.error("Failed to softban:", err);
      await interactionOrMsg.reply("bro i cant softban them fix ts");
    }
  },

  async warn(interactionOrMsg, target, reason) {
    if (!this.checkAdmin(interactionOrMsg)) return;
    if (!target) return interactionOrMsg.reply("bro it didnt even warn them");
    const r = reason || "being a goofy goober";
    await interactionOrMsg.reply(`${target.username} got a strike for ${r}, watch your step lil bro`);
  },

  async chat(message, args) {
      const hist = await message.channel.messages.fetch({ limit: 25 });
      const response = await getAIResponse([...hist.values()].reverse());
      await message.reply(response);
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
    else if (i.commandName === 'cf') {
        const amt = i.options.getInteger('amount');
        if (isNaN(amt) || amt <= 0) return i.reply("bro stop trying to flip negative money, you broke fr");
        await cmdHandler.cf(i, i.user, amt);
    }
    else if (i.commandName === 'insights') await cmdHandler.insights(i, i.guild);
    else if (i.commandName === 'ping') await cmdHandler.ping(i);
    else if (i.commandName === 'softban') await cmdHandler.softban(i, i.options.getUser('user'));
    else if (i.commandName === 'warn') await cmdHandler.warn(i, i.options.getUser('user'), i.options.getString('reason'));
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
  console.log("--> RAW TEXT INPUT:", message.content, "FROM:", message.author.tag);
  if (message.author.bot) return;
  await logMessage(message.guild.id);

  // Velocity Triggers
  const channelHist = await message.channel.messages.fetch({ limit: 5 });
  const msgs = [...channelHist.values()];
  
  // Rule 1: Dead Chat Panic
  if (msgs.length >= 2) {
      const gap = msgs[0].createdTimestamp - msgs[1].createdTimestamp;
      if (gap > 3600000) {
          await message.channel.send("h-hello...? is everyone g-gone... or are yall just hiding from me...");
      }
  }

  // Rule 2: Active Chat Stress
  if (msgs.length === 5 && (Date.now() - msgs[4].createdTimestamp < 20000) && Math.random() < 0.2) {
      await message.channel.send("s-stop screaming... p-please... my head hurts...");
  }

  if (!message.content.startsWith('.l ')) return;

  const args = message.content.slice(3).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (blacklistedUsers.has(message.author.id)) return message.reply("bro you are blacklisted from this bot, stop trying to click my buttons lil bro");

  if (command === 'rob') await cmdHandler.rob(message, message.author, message.mentions.users.first());
  else if (command === 'shop') await cmdHandler.shop(message);
  else if (command === 'help') await cmdHandler.help(message);
  else if (command === 'cf') {
      const amt = parseInt(args[0]);
      if (isNaN(amt) || amt <= 0) return message.reply("bro stop trying to flip negative money, you broke fr");
      await cmdHandler.cf(message, message.author, amt);
  }
  else if (command === 'insights') await cmdHandler.insights(message, message.guild);
  else if (command === 'ping') await cmdHandler.ping(message);
  else if (command === 'softban') await cmdHandler.softban(message, message.mentions.users.first());
  else if (command === 'warn') await cmdHandler.warn(message, message.mentions.users.first(), args.slice(1).join(' '));
  else if (command === 'chat') await cmdHandler.chat(message, args);
  else if (message.mentions.has(client.user)) await cmdHandler.chat(message, args);
});

client.login(process.env.DISCORD_TOKEN);
