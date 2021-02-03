const { sendCmdMessage, sendMessage, checkIfSubscribed } = require("../../util/bot_utils");
const { produceDiffMsg } = require('../../util/diff');
const fetch = require('node-fetch');

module.exports = (discord, db, imm, logger) => {

  return {

    siteUpdatedHandler: async (topic, siteUpdate) => {
      const guild = discord.guilds.cache.get(siteUpdate.guild);
      if (guild == null) {
        logger.error(`Error: notifying for a guild no longer available: ${siteUpdate.guild}`);
        return;
      }

      // logger.error(`${siteUpdate.site} update, diff below`);
      // logger.error(produceDiffMsg(siteUpdate.siteData.oldData.data, siteUpdate.siteData.data));

      let channels = {};
      for (let roleId of siteUpdate.roles) {
        let nc = await db.getNotifChannel(guild.id, roleId);
        if (nc == null) {
          continue;
        }
        if (nc in channels) {
          channels[nc].push(roleId);
        } else {
          channels[nc] = [ roleId ];
        }
      }

      for (let [channelId, roles] of Object.entries(channels)) {
        let channel = guild.channels.cache.get(channelId);
        let pingStr = roles.map(tr => `<@&${tr}>`).join(' ');

        var msg = 
          `Site '<${siteUpdate.site}>' has updated! Status is ${siteUpdate.siteData.status} | ${pingStr}`;
        
        try {
          sendMessage(channel, msg); 
        } catch (e) {
          logger.error(`Failed to send notification to ${guild.id}@${channelId}: ${e}`);
        }
      }
    },

    hassitechangedHandler: async (command) => {
      if (! await checkIfSubscribed(db, command.message.guild.id, command.message.channel.id)) {
        // Only handle if listening to this channel already
        logger.info(`Not listening to channel #${command.message.channel.name}, ignoring`);
        return;
      }

      switch (command.arguments.length) {
      case 1:
        let site = command.arguments[0];

        let oldSiteData = db.getSiteData(site);
        let newSiteData = null;
        try {
          const response = await fetch(site);
          if (response.ok) {
            newSiteData = await response.text();
            db.setSiteData(site, newSiteData);
          } else {
            db.setSiteData(site, null);
          }
        } catch (e) {
          sendCmdMessage(command.message, 'Error: Invalid url or connection issues, try again', 2, logger);
          return;
        }

        if (oldSiteData == newSiteData) {
          sendCmdMessage(command.message, `Site data has NOT changed since last call`, 2, logger);
        } else {
          sendCmdMessage(command.message, `Site data has changed since last call`, 2, logger);
        }
        return;
      default:
        sendCmdMessage(command.message, 'Error: incorrect argument count', 3, logger);
        return;
      }
    }
    
  }
}
