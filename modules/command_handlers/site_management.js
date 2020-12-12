const { sendCmdMessage, checkIfSubscribed, stringEquivalence } = require("../../util/bot_utils");
const fetch = require('node-fetch');

module.exports = (discord, db, imm, logger) => {

  return {

    subsiteHandler: async (command) => {
      if (! await checkIfSubscribed(db, command.message.guild.id, command.message.channel.id)) {
        // Only handle if listening to this channel already
        logger.info(`Not listening to channel #${command.message.channel.name}, ignoring`);
        return;
      }

      switch (command.arguments.length) {
      case 2:
        let roleName = command.arguments[0];
        let site = command.arguments[1];

        let guild = command.message.guild;
        let role = null;

        let roleRx = roleName.match(/^<@&(\d+)>$/);
        if (roleRx != null) {
          role = guild.roles.cache.get(roleRx[1]);
        } else {
          role = guild.roles.cache.find(r => stringEquivalence(r.name, roleName));
        }

        if (role == null) {
          sendCmdMessage(command.message, 'Error: role does not exist', 3, logger);
          return;
        }

        try {
          const response = await fetch(site);
          if (response.ok) {
            db.setSiteData(site, await response.text());
          }
        } catch (e) {
          sendCmdMessage(command.message, 'Error: Invalid url or connection issues, try again', 2, logger);
          return;
        }

        await db.addSite(guild.id, role.id, site);
        sendCmdMessage(command.message, `Watching site '${site}' for role @${role.name}`, 2, logger);
        return;
      default:
        sendCmdMessage(command.message, 'Error: incorrect argument count', 3, logger);
        return;
      }
    },

    unsubsiteHandler: async (command) => {
      if (! await checkIfSubscribed(db, command.message.guild.id, command.message.channel.id)) {
        // Only handle if listening to this channel already
        logger.info(`Not listening to channel #${command.message.channel.name}, ignoring`);
        return;
      }

      switch (command.arguments.length) {
      case 2:
        let roleName = command.arguments[0];
        let site = command.arguments[1];

        let guild = command.message.guild;
        let role = null;

        let roleRx = roleName.match(/^<@&(\d+)>$/);
        if (roleRx != null) {
          role = guild.roles.cache.get(roleRx[1]);
        } else {
          role = guild.roles.cache.find(r => stringEquivalence(r.name, roleName));
        }

        if (role == null) {
          sendCmdMessage(command.message, 'Error: role does not exist', 3, logger);
          return;
        }

        await db.delSite(guild.id, role.id, site);
        sendCmdMessage(command.message, `Stopped watching site '${site}' for role @${role.name}`, 2, logger);
        return;
      default:
        sendCmdMessage(command.message, 'Error: incorrect argument count', 3, logger);
        return;
      }
    },

    listsitesubsHandler: async (command) => {
      if (! await checkIfSubscribed(db, command.message.guild.id, command.message.channel.id)) {
        // Only handle if listening to this channel already
        logger.info(`Not listening to channel #${command.message.channel.name}, ignoring`);
        return;
      }

      switch (command.arguments.length) {
      case 1:
        let roleName = command.arguments[0];

        let guild = command.message.guild;
        let role = null;

        let roleRx = roleName.match(/^<@&(\d+)>$/);
        if (roleRx != null) {
          role = guild.roles.cache.get(roleRx[1]);
        } else {
          role = guild.roles.cache.find(r => stringEquivalence(r.name, roleName));
        }

        if (role == null) {
          sendCmdMessage(command.message, 'Error: role does not exist', 3, logger);
          return;
        }

        const sites = await db.getSites(guild.id, role.id);
        if (sites == null || sites.size == 0) {
          sendCmdMessage(command.message, 'No watched sites', 3, logger);
        }

        let str = Array.from(sites).map(s => `<${s}>`).join('\n');
        sendCmdMessage(command.message, str, 3, logger);
        return;
      default:
        sendCmdMessage(command.message, 'Error: incorrect argument count', 3, logger);
        return;
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
