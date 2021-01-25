const Redis         = require('ioredis');

// Feed requesting settings
const vacuumInterval = process.env.REDIS_VACUUM_INTERVAL;

/*
  Storage backend using Redis for persistence
  Guilds are stored in an ephemeral fashion, since the source of truth is Discord itself

  Store format:
 - <guildId>_roles: Set() [ <roleId> ]
 - <guildId>_<roleId>_name: String
 - <guildId>_<roleId>_notifChannel: String
 - <guildId>_<roleId>_titles: Set() [ <titleId> ]
 - title_<titleId>: String
*/

// Initialise with Redis credentials and logger
module.exports = (redisHost, redisPort, redisDb, logger) => {
  // Redis client
  // Explicitly set the Redis DB
  const rclient = new Redis(redisPort, redisHost, { db: redisDb });
  
  // Guilds can be ephemeral
  var guilds = new Set();

  // Site cache, for comparing, ephemeral.
  var siteData = {};

  rclient.on('error', (err) => {
    logger.error(`Redis error: ${err}`);
  });

  rclient.once('connect', () => {
    logger.info('Redis connected', 1);
  });

  // Clean up unused sites regularly
  async function vacuumSitesTask () {
    logger.info('Running vacuum task...', 3);
    // Setup promises to get all sites currently subscribed
    let promises = [];
    for (let g of guilds) {
      let roles = await rclient.smembers(`${g}_roles`);
      roles.forEach(r => promises.push(rclient.smembers(`${g}_${r}_sites`)));
    }

    // Resolve promises for current sites, and fetch cache of all sites
    let sites = new Set((await Promise.all(promises)).flat());
    let oldSites = await rclient.smembers('all_sites');

    // Remove any sites that no longer have a subscriber
    oldSites.filter(s => !sites.has(s)).forEach(s => {
      logger.info(`Vacuumed ${s}`, 3);
      rclient.srem('all_sites', s);
      delete siteData[s];
    });
  }

  // setInterval(vacuumSitesTask, vacuumInterval);

  return {

    // Return guilds set
    getGuilds: () => {
      return guilds;
    },

    // Add all args as guilds to guild set
    addGuilds: (...guildIds) => {
      guildIds.forEach((g) => guilds.add(g));
    },

    // Remove guild from guild set
    removeGuild: (guildId) => {
      guilds.delete(guildId);
    },

    // Fetch roles from db for a given guild, returns set
    getRoles: async (guildId) => {
      return new Set(await rclient.smembers(`${guildId}_roles`));
    },

    // Add role to db for a given guild
    addRole: async (guildId, roleId) => {
      return rclient.sadd(`${guildId}_roles`, roleId);
    },

    // Delete role from db for a given guild
    delRole: async (guildId, roleId) => {
      return rclient.srem(`${guildId}_roles`, roleId);
    },

    // Get operating channel for a given role and guild
    getNotifChannel: async (guildId, roleId) => {
      return rclient.get(`${guildId}_${roleId}_notifChannel`);
    },

    // Set operating channel for a given role and guild
    setNotifChannel: async (guildId, roleId, channelId) => {
      return rclient.set(`${guildId}_${roleId}_notifChannel`, channelId);
    },
    
    // Delete operating channel for a given role and guild
    delNotifChannel: async (guildId, roleId) => {
      return rclient.del(`${guildId}_${roleId}_notifChannel`);
    },

    // Fetch alertable sites for a given role and guild, returns set
    getSites: async (guildId, roleId) => {
      return new Set(await rclient.smembers(`${guildId}_${roleId}_sites`));
    },

    // Fetch all sites observed 
    getAllSites: async () => {
      return new Set(await rclient.smembers('all_sites'));
    },

    delFromAllSites: async (site) => {
      return rclient.srem('all_sites', site);
    },

    // Add alertable site for a given role and guild
    addSite: async (guildId, roleId, site) => {
      return Promise.all([
        rclient.sadd(`${guildId}_${roleId}_sites`, site),
        rclient.sadd('all_sites', site)
      ]);
    },

    // Delete alertable site for a given role and guild
    delSite: async (guildId, roleId, site) => {
      return rclient.srem(`${guildId}_${roleId}_sites`, site);
    },

    // Delete all alertable sites for a given role and guild
    clearSites: async (guildId, roleId) => {
      return rclient.del(`${guildId}_${roleId}_sites`);
    },

    getSiteData: (site) => {
      return siteData[site];
    },

    setSiteData: (site, data) => {
      siteData[site] = data;
    },

    delSiteData: (site) => {
      delete siteData[site];
    }

  }
}