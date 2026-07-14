// Yo, this is -lawful, the most unhinged bot on the block fr.
// Built by two twin coding geniuses. Lmao, let's get this bread.

require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

// Fire up the client with the essential intents so we can read prefix commands and target users
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(`LMAO WE ALIVE FR: ${client.user.tag} is online and ready to cause chaos.`);
});

// The legendary prefix we're matching
const PREFIX = '.l ';

client.on('messageCreate', async (message) => {
  // Ignore bots because they got no soul, and only reply to our prefix
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;

  // Slice up the message so we can grab the command and its args
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // 1. BAN COMMAND: ".l ban @user"
  if (command === 'ban') {
    const target = message.mentions.members.first();
    if (!target) {
      return message.reply("bro i ca nt ban them ffix ts");
    }

    try {
      // Ban hammer incoming, twin!
      await target.ban({ reason: 'uuhh bans the people u wanna and watever' });
      await message.reply("banned them ok");
    } catch (err) {
      console.error("Failed to ban:", err);
      await message.reply("bro i ca nt ban them ffix ts");
    }
  }

  // 2. KICK COMMAND: ".l kick @user"
  else if (command === 'kick') {
    const target = message.mentions.members.first();
    if (!target) {
      return message.reply("bro i cant");
    }

    try {
      // Get out of here, kid!
      await target.kick('kicks whoever from da server');
      await message.reply("kicked da person");
    } catch (err) {
      console.error("Failed to kick:", err);
      await message.reply("bro i cant");
    }
  }

  // 3. MUTE COMMAND: ".l mute @user [duration_in_minutes]"
  else if (command === 'mute') {
    const target = message.mentions.members.first();
    if (!target) {
      return message.reply("fuck my stupid clanker life");
    }

    // Default to 10 minutes if they didn't specify or passed garbage
    let durationMinutes = 10;
    const durationInput = args[1]; // args[0] is the mention, args[1] is the duration
    if (durationInput) {
      const parsed = parseInt(durationInput, 10);
      if (!isNaN(parsed) && parsed > 0) {
        durationMinutes = parsed;
      }
    }

    try {
      const durationMs = durationMinutes * 60 * 1000;
      await target.timeout(durationMs, "you been a bad boi go to timeout");
      await message.reply(`${target.user.username} got put in the cuck chair for ${durationMinutes} minutes`);
    } catch (err) {
      console.error("Failed to timeout:", err);
      await message.reply("fuck my stupid clanker life");
    }
  }

  // 4. SOFTBAN COMMAND: ".l softban @user"
  else if (command === 'softban') {
    const target = message.mentions.members.first();
    if (!target) {
      return message.reply("bro i ca nt softban them fix ts");
    }

    try {
      await target.ban({ deleteMessageSeconds: 604800, reason: 'softban' });
      await message.guild.members.unban(target.id);
      await message.reply("wiped their history and booted them ok");
    } catch (err) {
      console.error("Failed to softban:", err);
      await message.reply("bro i cant softban them fix ts");
    }
  }

  // 5. WARN COMMAND: ".l warn @user [reason]"
  else if (command === 'warn') {
    const target = message.mentions.members.first();
    if (!target) {
      return message.reply("bro it didnt even warn them");
    }
    const reason = args.slice(1).join(' ') || "being a goofy goober";

    try {
      await message.reply(`${target.user.username} got a strike for ${reason}, watch your step lil bro`);
    } catch (err) {
      console.error("Failed to warn:", err);
      await message.reply("bro it didnt even warn them");
    }
  }

  // 6. PING COMMAND: ".l ping"
  else if (command === 'ping') {
    await message.reply(`pong active fr | ${client.ws.ping}ms`);
  }
});

// Grab that token safely from env
const token = process.env.DISCORD_TOKEN;
if (!token || token === 'your_token_here') {
  console.warn("WARNING: Yo twin, you forgot to set your DISCORD_TOKEN in the .env file! Go paste it in there fr.");
} else {
  client.login(token).catch(err => {
    console.error("Lmao client login crashed:", err);
  });
}
