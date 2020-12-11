const { MessageEmbed } = require("discord.js");

const IMG_RX = /https?:\/\/[^\s]+\.(?:jpg|png)/i;

module.exports = (discord, db, imm, logger) => {

  // Create a quote embed
  function generateEmbed(message, author) {
    // Generate avatar URL
    const avatar_url = (author.user.avatar &&
        `https://cdn.discordapp.com/avatars/${author.id}/${author.user.avatar}.png`) ||
        author.user.defaultAvatarURL;
    let content = `${message.content}\n`
                + `[Link](${message.url})`;

    // Create base embed
    const embed = new MessageEmbed()
        .setColor('RANDOM')
        .setTimestamp(message.createdAt)
        .setAuthor(author.nickname || author.user.username, avatar_url);

    // If there's any images or attachments, add them to the embed
    let imgRegex = message.content.match(IMG_RX);
    if (imgRegex !== null) {
      embed.setImage(imgRegex[0]);
    }
    message.attachments.map(a => {
      if (embed.image === null) {
        imgRegex = a.url.match(IMG_RX);
        if (imgRegex !== null) {
          embed.setImage(imgRegex[0]);
          return;
        }
      }

      content += "\n\n" +
                  `**Attachment**: [${a.name}](${a.url})`;
    });
    
    // Set embed content
    embed.setDescription(content);
    return embed;
  }

  async function quoteHandler(message, quoter) {
      // Properly resolve guild members from message author
      // I think it's a discord.js issue
      const author = await message.guild.members.fetch(message.author.id);

      // Get nickname or username if not available
      const author_name = author.nickname || author.user.username;
      const quoter_name = quoter.nickname || quoter.user.username;

      // Create message to send
      const messagePreamble = `**${quoter_name}** quoted **${author_name}**:`;
      const embed = generateEmbed(message, author);

      logger.info(`${quoter_name} quoted ${message.url}`, 2);
      
      // Send message with embed
      message.channel.send(messagePreamble, embed);
  }

  async function quoteSaveHandler(message, quoter) {
      // Properly resolve guild members from message author
      // I think it's a discord.js issue
      const author = await message.guild.members.fetch(message.author.id);

      // Get nickname or username if not available
      const author_name = author.nickname || author.user.username;
      const quoter_name = quoter.nickname || quoter.user.username;

      // Create message to send
      const messagePreamble = `**${quoter_name}** saved quote a by **${author_name}**:`;
      const embed = generateEmbed(message, author);

      // Store quoted message to db
      await db.addQuote(message.guild.id, message.channel.id, author.id, quoter.id,
        embed.description, embed.image?.url, message.url, message.createdAt);

      logger.info(`${quoter_name} saved quote ${message.url}`, 2);
      
      // Send message with embed
      message.channel.send(messagePreamble, embed);
  }

	return {

    messageReactionHandler: async (reaction, user) => {
      // Dumb ass shit cause Discord.js doesn't resolve them
      reaction = await reaction.fetch();
      user = await reaction.message.guild.members.fetch(user.id);

      logger.info(`Reaction with emoji ${reaction.emoji.name} detected`, 4);
      // Handle emojis we care about
      // Remove reaction if we're handling em
      switch (reaction.emoji.name) {
      case "#️⃣":
        // Quote on hash react
        quoteHandler(reaction.message, user);
        reaction.remove();
        break;
      case "omegachair":
      case "♿":
        // Save on wheelchair react
        quoteSaveHandler(reaction.message, user);
        reaction.remove();
        break;
      }
    }

  }
}
