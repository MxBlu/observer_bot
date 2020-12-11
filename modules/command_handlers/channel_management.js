const { sendCmdMessage } = require("../../util/bot_utils");

module.exports = (discord, db, imm, logger) => {

  return {

    notifchannelHandler: async function (command) {
      if (command.arguments.length == 0) {
        sendCmdMessage(command.message, 'Error: missing arugment, provide role to register', 3, logger);
        return;
      }
      const roleName = command.arguments[0];
  
      let guild = command.message.guild;
      let channel = command.message.channel;
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
  
      await db.addRole(guild.id, role.id);
      await db.setNotifChannel(guild.id, role.id, channel.id);
      sendCmdMessage(command.message, `Notif channel set to #${channel.name} for role @${role.name}`, 2, logger);

      switch (command.arguments.length) {
      case 1:
        
        break;
      default:
        sendCmdMessage(command.message, 'Error: incorrect argument count', 3, logger);
        return;
      }
    },
    
    unnotifHandler: async function (command) {
      if (! await checkIfSubscribed(command.message)) {
        // Only handle if listening to this channel already
        logger.info(`Not listening to channel #${command.message.channel.name}`);
        return;
      }
      if (command.arguments.length == 0) {
        sendCmdMessage(command.message, 'Error: missing arugment, provide role to unregister', 3, logger);
        return;
      }
      const roleName = command.arguments[0];
  
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
  
      await db.delRole(guild.id, role.id);
      await db.delNotifChannel(guild.id, role.id);
      sendCmdMessage(command.message, `No longer notifying for role @${role.name}`, 2, logger);
    },

    subsiteHandler: async (command) => {
      let guildId = command.message.guild.id;
      switch (command.arguments.length) {
      case 1:
        // Delete quote with given seq ID
        try {
          // Attempt to delete quote with given id
          let res = await db
              .delQuote(guildId, parseInt(command.arguments[0])).exec();
          if (res.deletedCount != null && res.deletedCount > 0) {
            sendCmdMessage(command.message, `Quote ${command.arguments[0]} deleted.`, 2, logger);
            return;
          } else {
            sendCmdMessage(command.message, `Error: quote ${command.arguments[0]} doesn't exist`, 2, logger);
            return;
          }
          } catch (e) {
          sendCmdMessage(command.message, 'Error: invalid argument', 3, logger);
          return;
        }
        break;
      default:
        sendCmdMessage(command.message, 'Error: incorrect argument count', 3, logger);
        return;
      }
    }
    
  }
}
