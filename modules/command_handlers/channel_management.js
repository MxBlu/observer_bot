const { sendCmdMessage, checkIfSubscribed, stringEquivalence, stringSearch } = require("../../util/bot_utils");

module.exports = (discord, db, imm, logger) => {

  return {

    notifsitechannelHandler: async (command) => {
      switch (command.arguments.length) {
      case 1:
        const roleName = command.arguments[0];
    
        let guild = command.message.guild;
        let channel = command.message.channel;
        let role = null;
    
        // Get Role object by given id/name
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

        return;
      default:
        sendCmdMessage(command.message, 'Error: incorrect argument count', 3, logger);
        return;
      }
    },
    
    unnotifsitechannelHandler: async (command) => {
      if (! await checkIfSubscribed(db, command.message.guild.id, command.message.channel.id)) {
        // Only handle if listening to this channel already
        logger.info(`Not listening to channel #${command.message.channel.name}, ignoring`);
        return;
      }

      switch (command.arguments.length) {
      case 1:
        const roleName = command.arguments[0];
    
        let guild = command.message.guild;
        let channel = command.message.channel;
        let role = null;
    
        // Get Role object by given id/name
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

        return;
      default:
        sendCmdMessage(command.message, 'Error: incorrect argument count', 3, logger);
        return;
      }
    },
    
  }
}
