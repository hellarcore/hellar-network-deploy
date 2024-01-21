/* eslint-disable no-loop-func */
const hapiClient = require('@hellarcore/hapi-client');

const { Block } = require('@hellarcore/hellarcore-lib');

// eslint-disable-next-line no-undef
const { config: { testVariables: { inventory, variables } } } = __karma__;

describe('hapi', () => {
  describe('All nodes', () => {
    const blockByHeight = {};
    const blockByHeightError = {};
    const blockByHash = {};
    const blockByHashError = {};
    const dataContract = {};
    const dataContractError = {};

    before('Collect block height info', async function collect() {
      if (variables.hellarmate_platform_enable === false) {
        this.skip('platform is disabled for this network');
      }

      const promises = [];

      for (const hostName of inventory.hp_masternodes.hosts) {
        if (!inventory.meta.hostvars[hostName]) {
          // eslint-disable-next-line no-continue
          continue;
        }

        const timeout = 10000; // set individual hapi client timeout

        const hapiAddress = {
          protocol: 'https',
          host: inventory.meta.hostvars[hostName].public_ip,
          port: variables.hapi_port,
          allowSelfSignedCertificate: variables.hellarmate_platform_hapi_envoy_ssl_provider !== 'zerossl',
        };

        const hapiClient = new hapiClient({
          hapiAddresses: [hapiAddress],
          timeout,
        });

        const requestBlockByHeight = hapiClient.core.getBlockByHeight(1)
          .then((result) => {
            blockByHeight[hostName] = new Block(result);
          })
          .catch((e) => {
            blockByHeightError[hostName] = e;
          });
        promises.push(requestBlockByHeight);
      }

      return Promise.all(promises);
    });

    before('Collect block hash and contract info', async () => {
      const promises = [];

      for (const hostName of inventory.hp_masternodes.hosts) {
        if (!blockByHeight[hostName]) {
          // eslint-disable-next-line no-continue
          continue;
        }

        const timeout = 10000; // set individual hapi client timeout
        const unknownContractId = Buffer.alloc(32)
          .fill(1);

        const hapiAddress = {
          protocol: 'https',
          host: inventory.meta.hostvars[hostName].public_ip,
          port: variables.hapi_port,
          allowSelfSignedCertificate: variables.hellarmate_platform_hapi_envoy_ssl_provider !== 'zerossl',
        };

        const hapiClient = new hapiClient({
          hapiAddresses: [hapiAddress],
          timeout,
        });

        // eslint-disable-next-line max-len
        const requestBlockByHash = hapiClient.core.getBlockByHash(blockByHeight[hostName].header.hash)
          .then((result) => {
            blockByHash[hostName] = new Block(result);
          })
          .catch((e) => {
            blockByHashError[hostName] = e;
          });

        const requestDataContract = hapiClient.platform.getDataContract(unknownContractId)
          .then((result) => {
            dataContract[hostName] = result;
          })
          .catch((e) => {
            dataContractError[hostName] = e;
          });

        promises.push(requestBlockByHash, requestDataContract);
      }

      await Promise.all(promises).catch(() => Promise.resolve());
    });

    for (const hostName of inventory.hp_masternodes.hosts) {
      describe(hostName, () => {
        it('should respond with Core data via gRPC Web', () => {
          if (blockByHeightError[hostName]) {
            expect.fail(null, null, blockByHeightError[hostName]);
          }

          if (!blockByHash[hostName]) {
            expect.fail('no response');
          }

          expect(blockByHeight[hostName].toJSON()).to.deep.equal(blockByHash[hostName].toJSON());
        });

        it('should respond with Platform data via gRPC Web', () => {
          if (!dataContractError[hostName]) {
            expect.fail(null, null, 'no hapi error info');
          }

          expect(dataContract[hostName]).to.be.undefined();
          expect(dataContractError[hostName].code).to.be.equal(5);
        });
      });
    }
  });
});
