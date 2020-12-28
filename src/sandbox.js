const Discord       = require('discord.js');
const mongoose      = require('mongoose');

require('dotenv').config();

// Logger
const verbosity = process.env.LOG_LEVEL || 3;
var logger = require('./util/logger')(verbosity);

// MongoDB
mongoose.connect(process.env.MONGO_URI, { autoCreate: true, autoIndex: true });
var db = require('./util/store')(logger);


async function main() {
    try {
        var quote = await db.addQuote(6, 5, 5, 6, "Test message", "http://link/", new Date());
        console.log(quote);
    } catch(err) {
        console.error(err);
    }
}

main();