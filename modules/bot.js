const { sendMessage } = require('../util/bot_utils');

const errStream = process.env.DISCORD_ERRSTREAM;
const adminUser = process.env.DISCORD_ADMINUSER;

const commandSyntax = /^\s*!([A-Za-z]+)((?: [^ ]+)+)?\s*$/;

module.exports = (discord, db, imm, logger) => {

  var errLogDisabled = false;

  // Command handlers
  const channelManagementHandler  = require('./command_handlers/channel_management')(discord, db, imm, logger);
  const siteManagementHandler = require('./command_handlers/site_management')(discord, db, imm, logger);

  const commandHandlers = {
    "help": helpHandler,
    "notifsitechannel": channelManagementHandler.notifsitechannelHandler,
    "unnotifsitechannel": channelManagementHandler.unnotifsitechannelHandler,
    "subsite": siteManagementHandler.subsiteHandler,
    "unsubsite": siteManagementHandler.unsubsiteHandler,
    "listsitesubs": siteManagementHandler.listquotesHandler,
    "hassitechanged": siteManagementHandler.hassitechangedHandler
  };

  // Discord event handlers

  function readyHandler() {
    logger.info("Discord connected", 1);
    
    let guilds = discord.guilds.cache.map(g => g.id);
    db.addGuilds(...guilds);
  }

  function joinServerHandler(guild) {
    logger.info(`Joined guild: ${guild.name}`, 2);
    db.addGuilds(guild.id);
  }

  function leaveServerHandler(guild) {
    logger.info(`Left guild: ${guild.name}`, 2);
    db.removeGuild(guild.id);
  }

  async function messageHandler(message) {
    // Ignore bot messages to avoid messy situations
    if (message.author.bot) {
      return;
    }

    const command = parseCommand(message);
    if (command != null) {
      logger.info(`Command received from '${message.author.username}' in '${message.guild.name}': ` +
          `!${command.command} - '${command.arguments.join(' ')}'`, 2);
      commandHandlers[command.command](command);
    }
    return;
  }

  function helpHandler(command) {
    if (command.arguments == null ||
          command.arguments[0] !== "observer") {
      // Only send help for !help quotebot
      return;
    }

    let msg = 
      "Observer - Watch sites for changes\n" + 
      "\n" + 
      "!notifsitechannel <role> - Set current channel as the notification channel for given role\n" +
      "!unnotifsitechannel <role> - Remove notif channel from given role\n" +
      "!subsite <role> <url> - Watch provided url for given role\n" +
      "!unsubsite <role> <url> - Stop watching provided url for given role\n" +
      "!listsitesubs <role> - List all sites watched for given role\n";

    sendMessage(command.message.channel, msg);
  }

  // Error handler

  async function errorLogHandler(topic, log) {
    if (!errLogDisabled) {
      try {
        // Should ensure that it works for DM channels too
        var targetChannel = await discord.channels.fetch(errStream);
        // Only send if we can access the error channel
        if (targetChannel != null) {
          sendMessage(targetChannel, log);
        }
      } catch (e) {
        console.error('Discord error log exception, disabling error log');
        console.error(e);
        errLogDisabled = true;
      }
    }
  }

  // Utility functions

  function parseCommand(cmdMessage) {
    // Compare against command syntax
    var matchObj = cmdMessage.content.match(commandSyntax);

    // Check if command is valid
    if (matchObj == null || !(matchObj[1] in commandHandlers)) {
      return null;
    }

    return {
      message: cmdMessage,
      command: matchObj[1],
      arguments: matchObj[2] ? matchObj[2].trim().split(' ') : []
    };
  }

  discord.once('ready', readyHandler);
  discord.on('message', messageHandler);
  discord.on('error', err => logger.error(`Discord error: ${err}`));
  discord.on('guildCreate', joinServerHandler);
  discord.on('guildDelete', leaveServerHandler);

  imm.subscribe('newErrorLog', errorLogHandler);
}