const Discord       = require('discord.js');
const mongoose      = require('mongoose');

require('dotenv').config();

// Logger
const verbosity = process.env.LOG_LEVEL || 3;
var logger = require('./util/logger')(verbosity);

// Inter-module messenger
var messenger = require('./util/imm')(logger);
// For discord logging of errors
logger.registerMessenger(messenger);
messenger.newTopic('newErrorLog');

// Redis DB
const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT || 6379;
const redisDb = process.env.REDIS_DB ? parseInt(process.env.REDIS_DB) : 0;
var db = require('./util/store')(redisHost, redisPort, redisDb, logger);

// Discord Client
const discordToken = process.env.DISCORD_TOKEN;
var discord = new Discord.Client();

// Setup Discord services
require('./modules/bot')(discord, db, messenger, logger);
discord.login(discordToken);

logger.info(`Server started`);