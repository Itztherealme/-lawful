// Yo, this is -lawful, the most unhinged bot on the block fr.
// Built by two twin coding geniuses. Lmao, let's get this bread.

require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});

// Slash Command Definitions
const commands = [
  new SlashCommandBuilder().setName('ban').setDescription('uuhh bans the people u wanna and watever').addUserOption(o => o.setName('user').setRequired(true)),
  new SlashCommandBuilder().setName('kick').setDescription('kicks whoever from da server').addUserOption(o => o.setName('user').setRequired(true)),
  new SlashCommandBuilder().setName('mute').setDescription('you been a bad boi go to timeout').addUserOption(o => o.setName('user').setRequired(true)).addIntegerOption(o => o.setName('minutes')),
  new SlashCommandBuilder().setName('softban').setDescription('bans them to wipe their trash messages then unbans them instantly fr').addUserOption(o => o.setName('user').setRequired(true)),
  new SlashCommandBuilder().setName('warn').setDescription('gives them a strike before they get smacked').addUserOption(o => o.setName('user').setRequired(true)).addStringOption(o => o.setName('reason')),
  new SlashCommandBuilder().setName('unban').setDescription('pulls someone back from the shadow realm').addStringOption(o => o.setName('userid').setRequired(true)),
  new SlashCommandBuilder().setName('unmute').setDescription('lets them out of the cuck chair early').addUserOption(o => o.setName('user').setRequired(true)),
  new SlashCommandBuilder().setName('purge').setDescription('wipes the chat history because someone was doing too much').addIntegerOption(o => o.setName('amount').setRequired(true)),
  new SlashCommandBuilder().setName('lock').setDescription('freezes the whole channel down'),
  new SlashCommandBuilder().setName('unlock').setDescription('lets the chat yap again'),
  new SlashCommandBuilder().setName('ping').setDescription('checks if the clanker is lagging'),
  new SlashCommandBuilder().setName('hardstrip').setDescription('absolute nuclear option rips every single rank off them completely fr').addUserOption(o => o.setName('user').setRequired(true)),
  new SlashCommandBuilder().setName('role').setDescription('slaps a rank onto someone or rips it away from them real quick').addStringOption(o => o.setName('action').addChoices({name:'add', value:'add'}, {name:'remove', value:'remove'}).setRequired(true)).addUserOption(o => o.setName('user').setRequired(true)).addRoleOption(o => o.setName('role').setRequired(true)),
  new SlashCommandBuilder().setName('slowmode').setDescription('puts the brakes on the chat because yall are yapping way too fast').addIntegerOption(o => o.setName('seconds').setRequired(true)),
  new SlashCommandBuilder().setName('lockdown').setDescription('absolute red alert, freezes every single public text channel in the whole server'),
  new SlashCommandBuilder().setName('nick').setDescription('forcibly renames someone because their current government tag is goofy').addUserOption(o => o.setName('user').setRequired(true)).addStringOption(o => o.setName('name').setRequired(true))
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

client.once('ready', async () => {
  console.log(`LMAO WE ALIVE FR: ${client.user.tag}`);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('Successfully registered slash commands.');
  } catch (e) { console.error(e); }
});

// Shared Logic Handler
const cmdHandler = {
  async hardstrip(interactionOrMsg, target) {
    try {
      await target.roles.set([]);
      await interactionOrMsg.reply("stripped all their ranks, they are officially nobody now lmao");
    } catch (e) { await interactionOrMsg.reply("bro i cant hardstrip them, their ranks are locked above me"); }
  },
  async role(interactionOrMsg, action, target, role) {
    try {
      if (action === 'add') await target.roles.add(role);
      else await target.roles.remove(role);
      await interactionOrMsg.reply(`handled the role update for ${target.user.username}, they updated now`);
    } catch (e) { await interactionOrMsg.reply("bro i cant touch that role, check my hierarchy placement"); }
  },
  async slowmode(interactionOrMsg, seconds) {
    try {
      await interactionOrMsg.channel.setRateLimitPerUser(seconds);
      await interactionOrMsg.reply(`slowmode is set to ${seconds}s, slow your roll fr`);
    } catch (e) { await interactionOrMsg.reply("bro i cant slow down the chat, the gears are stripped"); }
  },
  async lockdown(interactionOrMsg) {
    try {
      const channels = interactionOrMsg.guild.channels.cache.filter(c => c.isTextBased());
      for (const [id, channel] of channels) await channel.permissionOverwrites.edit(interactionOrMsg.guild.roles.everyone, { SendMessages: false });
      await interactionOrMsg.reply("server is fully frozen. absolute ghost town.");
    } catch (e) { await interactionOrMsg.reply("bro lockdown failed, some channels are still leaking messages"); }
  },
  async nick(interactionOrMsg, target, name) {
    try {
      await target.setNickname(name);
      await interactionOrMsg.reply(`renamed them to ${name} ok`);
    } catch (e) { await interactionOrMsg.reply("bro i cant rename that person, their ego is too strong"); }
  }
};

client.on('interactionCreate', async i => {
  if (!i.isChatInputCommand()) return;
  const { commandName, options } = i;
  if (commandName === 'hardstrip') await cmdHandler.hardstrip(i, options.getMember('user'));
  else if (commandName === 'role') await cmdHandler.role(i, options.getString('action'), options.getMember('user'), options.getRole('role'));
  else if (commandName === 'slowmode') await cmdHandler.slowmode(i, options.getInteger('seconds'));
  else if (commandName === 'lockdown') await cmdHandler.lockdown(i);
  else if (commandName === 'nick') await cmdHandler.nick(i, options.getMember('user'), options.getString('name'));
  // ... handle others ...
});

const PREFIX = '.l ';
client.on('messageCreate', async m => {
  if (!m.content.startsWith(PREFIX) || m.author.bot) return;
  const args = m.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();
  if (cmd === 'hardstrip') await cmdHandler.hardstrip(m, m.mentions.members.first());
  else if (cmd === 'role') await cmdHandler.role(m, args[0], m.mentions.members.first(), m.mentions.roles.first());
  else if (cmd === 'slowmode') await cmdHandler.slowmode(m, parseInt(args[0]));
  else if (cmd === 'lockdown') await cmdHandler.lockdown(m);
  else if (cmd === 'nick') await cmdHandler.nick(m, m.mentions.members.first(), args.slice(1).join(' '));
  // ... handle others ...
});

client.login(process.env.DISCORD_TOKEN);
