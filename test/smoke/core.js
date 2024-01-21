const createRpcClientFromConfig = require('../../lib/test/createRpcClientFromConfig');
const getNetworkConfig = require('../../lib/test/getNetworkConfig');

const { inventory, network, variables } = getNetworkConfig();
const { createDocker, execJSONDockerCommand, getContainerId } = require('../../lib/test/docker');

const allMasternodes = [
  ...(inventory.masternodes?.hosts ?? []),
  ...(inventory.hp_masternodes?.hosts ?? []),
];

const allHosts = [
  ...(allMasternodes ?? []),
  ...(inventory.wallet_nodes?.hosts ?? []),
  ...(inventory.miners?.hosts ?? []),
  ...(inventory.seed_nodes?.hosts ?? []),
];

const ansibleHosts = [
  ...(inventory.masternodes?.hosts ?? []),
  ...(inventory.wallet_nodes?.hosts ?? []),
  ...(inventory.miners?.hosts ?? []),
  ...(inventory.seed_nodes?.hosts ?? []),
];

const hellarmateHosts = [
  ...(inventory.hp_masternodes?.hosts ?? []),
];

describe('Core', () => {
  describe('All nodes', () => {
    // Set up vars and functions to hold max height and mn responses
    const blockchainInfo = {};
    let maxBlockHeight = 0;
    const networkInfo = {};
    const errors = {};

    before('Collect blockchain and network info', async function func() {
      this.timeout(60000); // set mocha timeout

      // Collect data for hellarmate-based hosts
      let promises = hellarmateHosts
        .filter((hostName) => inventory.meta.hostvars[hostName])
        .map(async (hostName) => {
          try {
            const docker = createDocker(`http://${inventory.meta.hostvars[hostName].public_ip}`, {
              timeout: this.timeout() - 5000,
            });

            const containerId = await getContainerId(docker, 'core');

            const blockchain = await execJSONDockerCommand(
              docker,
              containerId,
              ['hellar-cli', 'getblockchaininfo'],
            );

            if (maxBlockHeight < blockchain.blocks) {
              maxBlockHeight = blockchain.blocks;
            }

            blockchainInfo[hostName] = blockchain;

            networkInfo[hostName] = await execJSONDockerCommand(
              docker,
              containerId,
              ['hellar-cli', 'getnetworkinfo'],
            );
          } catch (e) {
            errors[hostName] = e;
          }
        });

      promises = promises.concat(ansibleHosts
        .filter((hostName) => inventory.meta.hostvars[hostName])
        .map(async (hostName) => {
          try {
            const client = createRpcClientFromConfig(hostName);

            client.setTimeout(this.timeout() - 5000);

            const blockchainInfoResult = await client.getBlockchainInfo();

            if (maxBlockHeight < blockchainInfoResult.result.blocks) {
              maxBlockHeight = blockchainInfoResult.result.blocks;
            }

            blockchainInfo[hostName] = blockchainInfoResult.result;

            const networkInfoResult = await client.getNetworkInfo();

            networkInfo[hostName] = networkInfoResult.result;
          } catch (e) {
            errors[hostName] = e;
          }
        }));

      // Collect data for hellard role based hosts
      await Promise.all(promises).catch(() => Promise.resolve());
    });

    for (const hostName of allHosts) {
      // eslint-disable-next-line no-loop-func
      describe(hostName, () => {
        it('should have correct network type', async () => {
          if (errors[hostName]) {
            expect.fail(errors[hostName]);
          }

          if (!blockchainInfo[hostName]) {
            expect.fail('no blockchain info');
          }

          if (!networkInfo[hostName]) {
            expect.fail('no network info');
          }

          const chainNames = {
            testnet: 'test',
            mainnet: 'main',
            devnet: network.name,
            regtest: 'regtest',
          };

          expect(blockchainInfo[hostName]).to.be.not.empty();
          expect(blockchainInfo[hostName].chain).to.equal(chainNames[network.type]);
          expect(networkInfo[hostName].networkactive).to.be.equal(true);

          if (network.type === 'devnet') {
            expect(networkInfo[hostName].subversion).to.have.string(`${network.type}.${network.name}`);
          }
        });

        it('should sync blocks', async () => {
          if (errors[hostName]) {
            expect.fail(errors[hostName]);
          }

          if (!blockchainInfo[hostName]) {
            expect.fail(null, null, 'no blockchain info');
          }

          expect(maxBlockHeight - blockchainInfo[hostName].blocks).to.be.below(3);
        });
      });
    }
  });

  describe('Masternodes', () => {
    const masternodeListInfo = {};
    const errors = {};

    before('Collect masternode list info', async function func() {
      this.timeout(80000); // set mocha timeout

      const promises = hellarmateHosts
        .filter((hostName) => inventory.meta.hostvars[hostName])
        .map(async (hostName) => {
          try {
            const docker = createDocker(`http://${inventory.meta.hostvars[hostName].public_ip}`, {
              timeout: this.timeout() - 10000,
            });

            const containerId = await getContainerId(docker, 'core');

            masternodeListInfo[hostName] = await execJSONDockerCommand(docker, containerId, ['hellar-cli', 'masternode', 'list']);
          } catch (e) {
            errors[hostName] = e;
          }
        });

      // Collect info from hellard role based hosts
      for (const hostName of ansibleHosts) {
        if (!inventory.meta.hostvars[hostName]) {
          // eslint-disable-next-line no-continue
          continue;
        }

        const client = createRpcClientFromConfig(hostName);

        client.setTimeout(15000);

        const requestMasternodeListInfoPromise = client.masternodelist()
          .then(({ result }) => {
            masternodeListInfo[hostName] = result;
          }).catch((error) => {
            errors[hostName] = error;
          });

        promises.push(requestMasternodeListInfoPromise);
      }

      await Promise.all(promises).catch(() => Promise.resolve());
    });

    for (const hostName of allMasternodes) {
      describe(hostName, () => {
        it('should be in masternodes list with correct type', async () => {
          if (errors[hostName]) {
            expect.fail(errors[hostName]);
          }

          if (!masternodeListInfo[hostName]) {
            expect.fail(null, null, 'no masternode list info');
          }

          const nodeFromList = Object.values(masternodeListInfo[hostName])
            .find((node) => (
              inventory.meta.hostvars[hostName]
              && inventory.meta.hostvars[hostName].public_ip === node.address.split(':')[0]
            ));

          const masternodeType = hostName.startsWith('hp-') ? 'Pro' : 'Regular';

          expect(nodeFromList, `${hostName} is not present in masternode list`).to.exist();
          expect(nodeFromList.type).to.be.equal(masternodeType);
          expect(nodeFromList.status).to.be.equal('ENABLED');
        });
      });
    }
  });

  describe('Miners', () => {
    for (const hostName of inventory.miners?.hosts ?? []) {
      describe(hostName, () => {
        it('should mine blocks regularly', async () => {
          const targetBlockTime = variables.hellard_powtargetspacing || 156;
          const blockTimeLowerBound = targetBlockTime * 0.5;
          const blockTimeUpperBound = targetBlockTime * 1.5;
          const blockDelta = 10;

          // Connect and get current block count
          const coreClient = createRpcClientFromConfig(hostName);
          const { result: blockCount } = await coreClient.getBlockCount();

          // Get current and delta block timestamps
          const { result: currBlockHash } = await coreClient.getBlockHash(blockCount);
          const { result: prevBlockHash } = await coreClient.getBlockHash(blockCount - blockDelta);
          const { result: { time: currBlockTime } } = await coreClient.getBlock(currBlockHash);
          const { result: { time: prevBlockTime } } = await coreClient.getBlock(prevBlockHash);

          // Calculate mining stats
          const averageBlockTime = (currBlockTime - prevBlockTime) / blockDelta;
          const secondsSinceLastBlock = (new Date().getTime() - (currBlockTime * 1000)) / 1000;

          expect(averageBlockTime).to.be.within(blockTimeLowerBound, blockTimeUpperBound);
          expect(secondsSinceLastBlock).to.be.at.most(600);
        });
      });
    }
  });
});
