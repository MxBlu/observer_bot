const fetch = require('node-fetch');

// Feed requesting settings
const refreshInterval = process.env.SCRAPER_REFRESH_INTERVAL;

module.exports = (db, imm, logger) => {

  async function timerTask() {
    logger.info('Running scraper...', 4);

    let sites = await db.getAllSites();

    for (let s of sites) {
      try {
        logger.info(`Scraper: fetching ${s}`, 4);

        // Get last known data, and new data
        let oldSiteData = db.getSiteData(s);
        let response = await fetch(s);

        // Extract site text if response is 2xx
        let siteText = null;
        if (response.ok) {
          siteText = await response.text();
        }

        // No existing fetch
        if (oldSiteData == null) {
          oldSiteData = {
            data: siteText,
            status: response.status,
            lastUpdated: new Date()
          };
          db.setSiteData(s, oldSiteData);
        }

        // Change detected
        if ((oldSiteData.status != response.status) || 
            (oldSiteData.data != siteText)) {
          let newSiteData = {
            data: siteText,
            status: response.status,
            oldData: oldSiteData,
            lastUpdated: new Date()
          };
          db.setSiteData(s, newSiteData);
          logger.info(`Scraper: Change detected for ${s}: status ${newSiteData.status}`, 3);
          notifySiteUpdate(s, newSiteData);
        } else {
          logger.info(`Scraper: No change detected for ${s}`, 4);
        }
      } catch (e) {
        logger.info(`Scraper: failed to fetch ${s}: ${e}`, 1);
      }
    }
  }

  async function notifySiteUpdate(site, siteData) {
    const guilds = db.getGuilds();
    for (let guildId of guilds) {
      // If any guild has any roles that have subscribed to this site
      // Notify that the site has updated
      const roles = await db.getRoles(guildId);
      var rolesToAlert = new Set();

      for (let roleId of roles) {
        const sites = await db.getSites(guildId, roleId);
        if (sites.has(site)) {
          rolesToAlert.add(roleId);
        }
      }

      if (rolesToAlert.size > 0) {
        logger.info(`Notifying change for ${site} to roles [ ${Array.from(rolesToAlert.values()).join(', ')} ] in guild ${guildId}: ` +
            `status ${siteData.status}`, 2);
        imm.notify('siteUpdated', {
          site: site,
          siteData: siteData,
          guild: guildId,
          roles: rolesToAlert
        });
      }
    }
  }

  // Run timerTask at regular intervals 
  setInterval(timerTask, refreshInterval);

  // Run on startup
  timerTask();
}