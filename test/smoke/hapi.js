const hapiClient = require('@hellarcore/hapi-client');

const getNetworkConfig = require('../../lib/test/getNetworkConfig');

const { variables, inventory } = getNetworkConfig();

const proMasternodes = inventory.hp_masternodes?.hosts ?? [];

describe('hapi', () => {
  describe('Pro masternodes', () => {
    // Set up vars and functions to hold hapi responses
    const bestBlockHash = {};
    const bestBlockHashError = {};
    const status = {};
    const statusError = {};
    const dataContract = {};
    const dataContractError = {};

    before('Collect blockhash, status and data contract info and errors', function func() {
      this.timeout(120000); // set mocha timeout

      if (variables.hellarmate_platform_enable === false) {
        this.skip('platform is disabled for this network');
      }

      const promises = [];
      for (const hostName of proMasternodes) {
        if (!inventory.meta.hostvars[hostName]) {
          // eslint-disable-next-line no-continue
          continue;
        }

        const timeout = 15000; // set individual hapi client timeout
        const unknownContractId = Buffer.alloc(32).fill(1);

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

        const requestBestBlockHash = hapiClient.core.getBestBlockHash()
          // eslint-disable-next-line no-loop-func
          .then((result) => {
            bestBlockHash[hostName] = result;
          })
          .catch((e) => {
            bestBlockHashError[hostName] = e;
          });

        const requestStatus = hapiClient.core.getStatus()
          // eslint-disable-next-line no-loop-func
          .then((result) => {
            status[hostName] = result;
          })
          .catch((e) => {
            statusError[hostName] = e;
          });

        const requestDataContract = hapiClient.platform.getDataContract(unknownContractId)
          // eslint-disable-next-line no-loop-func
          .then((result) => {
            dataContract[hostName] = result;
          })
          .catch((e) => {
            dataContractError[hostName] = e;
          });

        promises.push(requestBestBlockHash, requestStatus, requestDataContract);
      }

      return Promise.all(promises);
    });

    for (const hostName of proMasternodes) {
      describe(hostName, () => {
        it('should return data from Core', async () => {
          if (bestBlockHashError[hostName]) {
            expect.fail(null, null, bestBlockHashError[hostName]);
          }

          if (!bestBlockHash[hostName]) {
            expect.fail('no block info');
          }

          expect(bestBlockHash[hostName]).to.be.a('string');
        });

        it('should return data from Core using gRPC', async () => {
          if (statusError[hostName]) {
            expect.fail(null, null, statusError[hostName]);
          }

          if (!status[hostName]) {
            expect.fail('no status info');
          }

          expect(status[hostName]).to.have.a.property('version');
          expect(status[hostName]).to.have.a.property('time');
          expect(status[hostName]).to.have.a.property('status');
          expect(status[hostName]).to.have.a.property('syncProgress');
          expect(status[hostName]).to.have.a.property('chain');
          expect(status[hostName]).to.have.a.property('masternode');
          expect(status[hostName]).to.have.a.property('network');
        });

        it('should return data from Platform', async () => {
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
