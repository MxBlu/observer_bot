const ZooKeeper = require('zookeeper');

const zkTimeout = process.env.ZK_TIMEOUT;
const zkRootPath = process.env.ZK_ROOT_PATH;

module.exports = (zkHosts, imm, logger) => {

  // Zookeeper client
  const client = new ZooKeeper({
    connect: zkHosts,
    timeout: zkTimeout
  });

  var nodeSeqId = 0;
  var numNodes = 0;

  async function clientInit() {
    joinCluster();
  }

  // Operations

  async function initWatches() {
    
  }

  async function joinCluster() {
    // Make sure paths exist on zookeeper
    await ensureNode(zkRootPath);
    await ensureNode(`${zkRootPath}/nodes`);
    await ensureNode(`${zkRootPath}/cmds`);

    // Create cluster node
    client.create(`${zkRootPath}/nodes/n`, null, 
        ZooKeeper.constants.ZOO_EPHEMERAL | ZooKeeper.constants.ZOO_SEQUENCE);
    
  }

  // Utils

  async function ensureNode(path, data, flags) {
    if (await client.exists(path)) {
      return client.get(path);
    } else {
      return client.create(path, data, flags);
    }
  }

  // Access

  async function getClusterNodeCount() {
    client
  }

  client.init();
  client.on('connect', clientInit);

  return {

    // Exported functions

  }
}