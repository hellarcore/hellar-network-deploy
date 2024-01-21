const RpcClientPromise = require('@hellarcore/hellard-rpc/promise');
const RpcClient = require('@hellarcore/hellard-rpc');
const getNetworkConfig = require('./getNetworkConfig');

const { inventory, variables } = getNetworkConfig();

/**
 * @param {string} hostName
 * @return {RpcClientPromise}
 */
function createRpcClientFromConfig(hostName) {
  const options = {
    protocol: 'http',
    user: variables.hellard_rpc_user,
    pass: variables.hellard_rpc_password,
    host: inventory.meta.hostvars[hostName].public_ip,
    port: variables.hellard_rpc_port,
  };

  RpcClient.config.logger = 'none';

  return new RpcClientPromise(options);
}

module.exports = createRpcClientFromConfig;
