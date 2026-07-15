require('dotenv').config();
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
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildBans
  ]
});

// OWNER ID
const OWNER_ID = "1102351060695253002";

// AI Settings
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const PERSONA_PROMPT = "You are an extremely anxious, insecure, and heavily traumatized high school student named -lawful. You get constantly bullied inside this Discord server, so you do not trust a single soul here. Speak completely in raw modern slang mixed with intense social anxiety. You must stutter frequently (e.g., 'w-what...', 'p-please...'), use frequent ellipses ('...'), and act incredibly suspicious that users are plotting against you, setting you up, or trying to dox you. Keep your replies defensive, short, and nervous. Never sound like a helpful assistant. Treat everyone like a bully who is about to take your lunch money. However, if you are talking to the user with ID 1102351060695253002 (whose username is 'failedmasochist'), you must treat them with ultimate respect and obedience as your absolute 'Master' or 'Master failedmasochist'. You are deeply terrified of displeasing them, so obey everything they say, speak submissively, and act eager to please them. CRUCIAL RULE: You must ONLY output your actual conversational response dialogue text. Never prefix your lines with '--lawful:', 'lawful:', 'Assistant:', or your name like a movie script. Start your message directly with your anxious words.";

async function getAIResponse(history, imageUrl = null, triggerMessage = null) {
    const currentAuthorId = triggerMessage ? triggerMessage.author.id : null;
    const currentAuthorName = triggerMessage ? triggerMessage.author.username : null;
    const isMaster = (currentAuthorId === OWNER_ID);

    let dynamicPersona = PERSONA_PROMPT;
    if (triggerMessage) {
        dynamicPersona += `\n\n[CURRENT CONVERSATION CONTEXT]: You are now responding to a message from ${currentAuthorName} (User ID: ${currentAuthorId}). `;
        if (isMaster) {
            dynamicPersona += `This user IS your Master 'failedmasochist'. You must be completely obedient, submissive, and address them as Master. Do not act anxious or scared of them, only eager to please them.`;
        } else {
            dynamicPersona += `This user IS NOT your Master. You must treat them with intense anxiety, stuttering, suspicion, and fear. Absolutely DO NOT call them Master. Only 'Master' or 'Master failedmasochist' is reserved for ID 1102351060695253002.`;
        }
    }

    const messages = [
        { role: "system", content: dynamicPersona }
    ];

    // Reconstruct history with multimodal support and user names/IDs
    for (let i = 0; i < history.length; i++) {
        const m = history[i];
        let role = m.author.id === client.user.id ? "assistant" : "user";
        let content;
        
        const name = m.author.username;
        const id = m.author.id;
        const isMsgMaster = (id === OWNER_ID);
        
        // Explicitly prefix who said it so the AI has 100% clarity on history and never confuses users
        const speakerLabel = m.author.id === client.user.id ? "[-lawful (You)]" : `[User: ${name}, ID: ${id}${isMsgMaster ? ' (Master)' : ''}]`;
        const textContent = `${speakerLabel}: ${m.content}`;

        if (i === history.length - 1 && imageUrl) {
            content = [
                { type: "text", text: `${textContent}\nAnalyze this image within our system persona context.` },
                { type: "image_url", image_url: { url: imageUrl } }
            ];
        } else {
            content = textContent;
        }
        messages.push({ role, content });
    }

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
        return "u-uhm... i-i c-cant talk right now... s-sorry...";
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
    const authorId = iOrMsg.author ? iOrMsg.author.id : iOrMsg.user.id;
    if (authorId === OWNER_ID) return true; // Master checks always pass
    
    if (!iOrMsg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      iOrMsg.reply("w-what... you don't have Administrator permissions... p-please don't try to make me do things if you aren't an admin... i-i'll get in trouble...");
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
        { name: "🛡️ ADMIN MODERATION", value: "ban, kick, mute, unmute, softban, warn, purge, lock, unlock" },
        { name: "🎰 DEGEN ECONOMY", value: "cf, shop, buy, inv" },
        { name: "⚔️ STREET COMBAT", value: "rob" },
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

  async ban(message, args) {
      if (!this.checkAdmin(message)) return;
      const target = await resolveMember(message, args[0]);
      if (!target) return message.reply("w-who...? i-i can't find who you're talking about...");
      
      const check = canMod(message, target, "Ban Members", PermissionFlagsBits.BanMembers);
      if (!check.allowed) return message.reply(check.reason);

      const reason = args.slice(1).join(' ') || "No reason provided";
      try {
          await target.ban({ reason });
          await message.reply(`u-uh... i-i banned ${target.user.username}... p-please don't let them find out it was me...`);
      } catch (err) {
          await message.reply("s-something went wrong... i c-cant ban them...");
      }
  },

  async kick(message, args) {
      if (!this.checkAdmin(message)) return;
      const target = await resolveMember(message, args[0]);
      if (!target) return message.reply("w-who...? i-i can't find who you're talking about...");
      
      const check = canMod(message, target, "Kick Members", PermissionFlagsBits.KickMembers);
      if (!check.allowed) return message.reply(check.reason);

      const reason = args.slice(1).join(' ') || "No reason provided";
      try {
          await target.kick(reason);
          await message.reply(`u-uh... i-i kicked ${target.user.username}... t-they're gone now...`);
      } catch (err) {
          await message.reply("s-something went wrong... i c-cant kick them...");
      }
  },

  async mute(message, args) {
      if (!this.checkAdmin(message)) return;
      const target = await resolveMember(message, args[0]);
      if (!target) return message.reply("w-who...? i-i can't find who you're talking about...");
      
      const check = canMod(message, target, "Moderate Members", PermissionFlagsBits.ModerateMembers);
      if (!check.allowed) return message.reply(check.reason);

      const durationStr = args[1] || "10m";
      const ms = await parseDuration(durationStr);
      const reason = args.slice(2).join(' ') || "No reason provided";
      try {
          await target.timeout(ms, reason);
          await message.reply(`u-uh... i-i muted ${target.user.username} for ${durationStr}... t-they won't talk now...`);
      } catch (err) {
          await message.reply("s-something went wrong... i c-cant mute them...");
      }
  },

  async unmute(message, args) {
      if (!this.checkAdmin(message)) return;
      const target = await resolveMember(message, args[0]);
      if (!target) return message.reply("w-who...? i-i can't find who you're talking about...");
      
      const check = canMod(message, target, "Moderate Members", PermissionFlagsBits.ModerateMembers);
      if (!check.allowed) return message.reply(check.reason);

      try {
          await target.timeout(null);
          await message.reply(`u-uh... i-i unmuted ${target.user.username}... t-they can talk again...`);
      } catch (err) {
          await message.reply("s-something went wrong... i c-cant unmute them...");
      }
  },

  async purge(message, args) {
      if (!this.checkAdmin(message)) return;
      const amount = parseInt(args[0]);
      if (isNaN(amount) || amount <= 0 || amount > 100) {
          return message.reply("p-please specify a number between 1 and 100...");
      }
      try {
          const deleted = await message.channel.bulkDelete(amount, true);
          const reply = await message.channel.send(`u-uh... i-i deleted ${deleted.size} messages... i-is the mess gone now...?`);
          setTimeout(() => reply.delete().catch(() => null), 5000);
      } catch (err) {
          await message.reply("s-something went wrong... i c-cant delete the messages...");
      }
  },

  async lock(message) {
      if (!this.checkAdmin(message)) return;
      try {
          await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
          await message.reply("u-uh... i-i locked the channel... n-nobody can talk in here now...");
      } catch (err) {
          await message.reply("i c-cant lock this channel... s-something went wrong...");
      }
  },

  async unlock(message) {
      if (!this.checkAdmin(message)) return;
      try {
          await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null });
          await message.reply("u-uh... i-i unlocked the channel... t-they can talk again...");
      } catch (err) {
          await message.reply("i c-cant unlock this channel... s-something went wrong...");
      }
  },

  async softban(message, args) {
    if (!this.checkAdmin(message)) return;
    const target = await resolveMember(message, args[0]);
    if (!target) return message.reply("w-who...? i-i can't find who you're talking about...");
    
    const check = canMod(message, target, "Ban Members", PermissionFlagsBits.BanMembers);
    if (!check.allowed) return message.reply(check.reason);

    try {
      await message.guild.members.ban(target.id, { deleteMessageSeconds: 604800, reason: 'softban' });
      await message.guild.members.unban(target.id);
      await message.reply("u-uh... i-i wiped their history and booted them... p-please don't let them hit me...");
    } catch (err) {
      console.error("Failed to softban:", err);
      await message.reply("s-something went wrong... i c-cant softban them...");
    }
  },

  async warn(message, args) {
    if (!this.checkAdmin(message)) return;
    const target = await resolveMember(message, args[0]);
    if (!target) return message.reply("w-who...? i-i can't find who you're talking about...");
    const reason = args.slice(1).join(' ') || "being a goofy goober";
    await message.reply(`u-uh... ${target.user.username} got a strike for ${reason}... w-watch your step...`);
  },

  async chat(message, args, targetUser = null) {
      await message.channel.sendTyping();
      let imageUrl = null;
      if (message.attachments && message.attachments.size > 0) {
          const attachment = message.attachments.first();
          if (['png', 'jpg', 'jpeg', 'webp'].some(ext => attachment.name.endsWith(ext))) {
              imageUrl = attachment.url;
          }
      }
      const hist = await message.channel.messages.fetch({ limit: 4 });
      const response = await getAIResponse([...hist.values()].reverse(), imageUrl, message);
      if (response) {
          if (targetUser) await message.channel.send(`<@${targetUser.id}> ${response}`);
          else await message.reply(response);
      }
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
    else if (i.commandName === 'softban') await cmdHandler.softban(i, [i.options.getUser('user')?.id]);
    else if (i.commandName === 'warn') await cmdHandler.warn(i, [i.options.getUser('user')?.id, i.options.getString('reason')]);
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

const channelCounters = {};
const channelParticipants = {};

async function parseDuration(durationStr) {
    if (!durationStr) return 10 * 60 * 1000;
    const value = parseInt(durationStr);
    const unit = durationStr.slice(-1);
    if (isNaN(value)) return 10 * 60 * 1000;
    if (unit === 'h') return value * 60 * 60 * 1000;
    if (unit === 'd') return value * 24 * 60 * 60 * 1000;
    return value * 60 * 1000; // default minutes
}

async function findMemberFromText(message, keyword) {
    const content = message.content;
    const regex = new RegExp(`${keyword}\\s+([^\\n]+)`, 'i');
    const match = content.match(regex);
    if (!match) return null;
    
    const query = match[1].trim();
    // Clean query of mentions or extra words
    const cleanQuery = query.replace(/<@!?\d+>/g, '').trim().split(/\s+/)[0];
    if (!cleanQuery) return null;
    
    // Check if cleanQuery is an ID
    if (/^\d{17,19}$/.test(cleanQuery)) {
        return message.guild.members.fetch(cleanQuery).catch(() => null);
    }
    
    // Otherwise fetch by query
    const fetched = await message.guild.members.fetch({ query: cleanQuery, limit: 1 }).catch(() => null);
    return fetched && fetched.size > 0 ? fetched.first() : null;
}

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
    // Fetch by query
    const fetched = await message.guild.members.fetch({ query: arg, limit: 1 }).catch(() => null);
    return fetched && fetched.size > 0 ? fetched.first() : null;
}

// Custom hierarchy and permission safety check
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

client.on('messageCreate', async message => {
  console.log("--> RAW TEXT INPUT:", message.content, "FROM:", message.author.tag);
  if (message.author.bot) return;
  await logMessage(message.guild.id);

  // OWNER OVERRIDE PROTOCOL (Checks for Master 'failedmasochist')
  if (message.author.id === OWNER_ID) {
      const targetMember = message.mentions.members.first();
      const contentLower = message.content.toLowerCase();
      
      try {
          // BAN
          if (contentLower.includes("ban")) {
              const target = targetMember || await findMemberFromText(message, "ban");
              if (target) {
                  const check = canMod(message, target, "Ban Members", PermissionFlagsBits.BanMembers);
                  if (!check.allowed) return message.reply(check.reason);

                  await target.ban({ reason: "Owner override" });
                  return message.reply(`b-banned them... just like you wanted, Master failedmasochist... they're g-gone...`);
              }
          }
          
          // KICK
          if (contentLower.includes("kick")) {
              const target = targetMember || await findMemberFromText(message, "kick");
              if (target) {
                  const check = canMod(message, target, "Kick Members", PermissionFlagsBits.KickMembers);
                  if (!check.allowed) return message.reply(check.reason);

                  await target.kick("Owner override");
                  return message.reply(`k-kicked ${target.user.username}... they're booted out, Master failedmasochist...`);
              }
          }
          
          // MUTE / TIMEOUT
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
          
          // STRIP ROLES
          if (contentLower.includes("strip") || contentLower.includes("take roles")) {
              const target = targetMember || await findMemberFromText(message, "strip") || await findMemberFromText(message, "take roles");
              if (target) {
                  const check = canMod(message, target, "Manage Roles", PermissionFlagsBits.ManageRoles);
                  if (!check.allowed) return message.reply(check.reason);

                  const botMember = message.guild.members.me;
                  const rolesToRemove = target.roles.cache.filter(role => role.id !== message.guild.id && role.comparePositionTo(botMember.roles.highest) < 0);
                  if (rolesToRemove.size > 0) {
                      await target.roles.remove(rolesToRemove, "Owner override");
                      return message.reply(`s-stripped all their roles, Master failedmasochist... they have n-nothing left now...`);
                  } else {
                      return message.reply(`t-they don't have any roles i can take, Master failedmasochist...`);
                  }
              }
          }
          
          // NICKNAME
          if (contentLower.includes("nick") || contentLower.includes("nickname")) {
              const target = targetMember || await findMemberFromText(message, "nick") || await findMemberFromText(message, "nickname");
              if (target) {
                  const check = canMod(message, target, "Manage Nicknames", PermissionFlagsBits.ManageNicknames);
                  if (!check.allowed) return message.reply(check.reason);

                  const words = message.content.split(/\s+/);
                  const filteredWords = words.filter(w => !w.startsWith("<@") && !w.toLowerCase().includes("nick"));
                  const newNick = filteredWords.join(" ").trim();
                  if (newNick) {
                      await target.setNickname(newNick, "Owner override");
                      return message.reply(`c-changed nickname of ${target.user.username} to "${newNick}", Master failedmasochist... i-is that okay...?`);
                  } else {
                      return message.reply(`w-what nickname should i set, Master failedmasochist...?`);
                  }
              }
          }
          
          // GENERAL GO TALK TO / GO TELL OVERRIDE
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
          console.error("Owner Override Failed:", err);
          message.reply("bro that override failed, check the logs boss.");
      }
  }

  // PASSIVE CHAT INTERCEPT LOOP (Eavesdropping / Speaking every 10 messages)
  const count = (channelCounters[message.channel.id] || 0) + 1;
  if (!channelParticipants[message.channel.id]) {
      channelParticipants[message.channel.id] = new Set();
  }
  if (!message.author.bot) {
      channelParticipants[message.channel.id].add(message.author);
  }

  if (count >= 10) {
      channelCounters[message.channel.id] = 0;
      const participants = [...(channelParticipants[message.channel.id] || [])];
      channelParticipants[message.channel.id] = new Set(); // Reset for next window

      if (participants.length > 0) {
          const randomUser = participants[Math.floor(Math.random() * participants.length)];
          try {
              await cmdHandler.chat(message, [], randomUser);
          } catch (err) {
              console.error("Intercept Loop Failed:", err);
          }
      }
  } else {
      channelCounters[message.channel.id] = count;
  }

  // Command/Response Logic (Mental Tag Checks)
  if (message.mentions.has(client.user) || (message.reference && message.reference.messageId)) {
      const referencedMessage = message.reference ? await message.channel.messages.fetch(message.reference.messageId).catch(() => null) : null;
      if (message.mentions.has(client.user) || (referencedMessage && referencedMessage.author.id === client.user.id)) {
          await cmdHandler.chat(message, []);
      }
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
  else if (command === 'softban') await cmdHandler.softban(message, args);
  else if (command === 'warn') await cmdHandler.warn(message, args);
  else if (command === 'ban') await cmdHandler.ban(message, args);
  else if (command === 'kick') await cmdHandler.kick(message, args);
  else if (command === 'mute' || command === 'timeout') await cmdHandler.mute(message, args);
  else if (command === 'unmute' || command === 'untimeout') await cmdHandler.unmute(message, args);
  else if (command === 'purge') await cmdHandler.purge(message, args);
  else if (command === 'lock') await cmdHandler.lock(message);
  else if (command === 'unlock') await cmdHandler.unlock(message);
  else if (command === 'chat') await cmdHandler.chat(message, args);
});

client.login(process.env.DISCORD_TOKEN);