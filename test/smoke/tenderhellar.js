const parsePrometheusTextFormat = require('parse-prometheus-text-format');
const getNetworkConfig = require('../../lib/test/getNetworkConfig');
const {
  createDocker,
  execJSONDockerCommand,
  execDockerCommand,
  getContainerId,
} = require('../../lib/test/docker');

const { variables, inventory, network } = getNetworkConfig();

const proMasternodes = inventory.hp_masternodes?.hosts ?? [];
const seedNodes = inventory.seed_nodes?.hosts ?? [];

describe('Tenderhellar', () => {
  const errors = {};

  describe('Pro masternodes', () => {
    const currentTimeStrings = {};
    const tenderhellarStatuses = {};

    before('Collect tenderhellar info', function collect() {
      if (variables.hellarmate_platform_enable === false) {
        this.skip('platform is disabled for this network');
      }

      this.timeout(40000); // set mocha timeout

      const promises = proMasternodes
        .filter((hostName) => inventory.meta.hostvars[hostName])
        .map(async (hostName) => {
          try {
            const docker = createDocker(inventory.meta.hostvars[hostName].public_ip, {
              timeout: this.timeout() - 5000,
            });

            const containerId = await getContainerId(docker, 'hellarmate_helper');

            currentTimeStrings[hostName] = await execDockerCommand(
              docker,
              containerId,
              ['date'],
            );

            const { result, error } = await execJSONDockerCommand(
              docker,
              containerId,
              [
                'curl',
                '--silent',
                '-X',
                'POST',
                '-H',
                'Content-Type: application/json',
                '-d',
                '{"jsonrpc":"2.0","id":"id","method":"status platform","params": {"format": "json"}}',
                'localhost:9000',
              ],
            );

            if (error) {
              // noinspection ExceptionCaughtLocallyJS
              throw new Error(error.message);
            }

            const status = JSON.parse(result);

            tenderhellarStatuses[hostName] = status.tenderhellar;
          } catch (e) {
            errors[hostName] = e;
          }
        });

      return Promise.all(promises);
    });

    for (const hostName of proMasternodes) {
      // eslint-disable-next-line no-loop-func
      describe(hostName, () => {
        it('should be connected to the network', () => {
          if (errors[hostName]) {
            expect.fail(errors[hostName]);
          }

          if (!tenderhellarStatuses[hostName]) {
            expect.fail('can\'t get tenderhellar status');
          }

          let networkName = `hellar-${network.name}`;
          if (variables.tenderhellar_chain_id !== undefined) {
            networkName = `hellar-${variables.tenderhellar_chain_id}`;
          }

          expect(tenderhellarStatuses[hostName].network).to.be.equal(networkName);
          expect(tenderhellarStatuses[hostName].moniker).to.be.equal(hostName);
        });

        it('should be connected to peers', () => {
          if (errors[hostName]) {
            expect.fail(errors[hostName]);
          }

          if (!tenderhellarStatuses[hostName]) {
            expect.fail('can\'t get tenderhellar status');
          }

          expect(tenderhellarStatuses[hostName]).to.have.property('listening', true);
          expect(tenderhellarStatuses[hostName]).to.have.property('peers');
          expect(tenderhellarStatuses[hostName].peers).to.be.greaterThan(0);
        });

        it('should sync blocks', () => {
          if (errors[hostName]) {
            expect.fail(errors[hostName]);
          }

          if (!tenderhellarStatuses[hostName]) {
            expect.fail('can\'t get tenderhellar status');
          }

          const latestBlockTime = new Date(tenderhellarStatuses[hostName].latestBlockTime);

          const currentDate = new Date(currentTimeStrings[hostName]);
          const emptyBlockWindow = new Date(currentDate);
          emptyBlockWindow.setMinutes(currentDate.getMinutes() - 5);

          expect(latestBlockTime).to.be.within(emptyBlockWindow, currentDate);
        });
      });
    }
  });

  describe('Seed nodes', () => {
    const tenderhellarMetrics = {};

    before('Collect tenderhellar metrics', function collect() {
      if (variables.hellarmate_platform_enable === false) {
        this.skip('platform is disabled for this network');
      }

      this.timeout(40000); // set mocha timeout

      const promises = seedNodes
        .filter((hostName) => inventory.meta.hostvars[hostName])
        .map(async (hostName) => {
          try {
            const docker = createDocker(inventory.meta.hostvars[hostName].public_ip, {
              timeout: this.timeout() - 5000,
            });

            const containerId = await getContainerId(docker, 'tenderhellar');

            const result = await execDockerCommand(
              docker,
              containerId,
              [
                'curl',
                '--silent',
                'localhost:36660/metrics',
              ],
            );

            tenderhellarMetrics[hostName] = parsePrometheusTextFormat(result);
          } catch (e) {
            errors[hostName] = e;
          }
        });

      return Promise.all(promises);
    });

    for (const hostName of seedNodes) {
      // eslint-disable-next-line no-loop-func
      describe(hostName, () => {
        it('should be connected to the network', () => {
          if (errors[hostName]) {
            expect.fail(errors[hostName]);
          }

          if (!tenderhellarMetrics[hostName]) {
            expect.fail('can\'t get tenderhellar metrics');
          }

          const p2pMetrics = tenderhellarMetrics[hostName].find((m) => m.name === 'drive_tenderhellar_p2p_peers_connected');
          const chainId = p2pMetrics?.metrics[0]?.labels?.chain_id;

          if (!chainId) {
            expect.fail('can\'t get chain id from p2p metric');
          }

          let networkName = `hellar-${network.name}`;
          if (variables.tenderhellar_chain_id !== undefined) {
            networkName = `hellar-${variables.tenderhellar_chain_id}`;
          }

          expect(chainId).to.be.equal(networkName);
        });

        it('should be connected to peers', () => {
          if (errors[hostName]) {
            expect.fail(errors[hostName]);
          }

          if (!tenderhellarMetrics[hostName]) {
            expect.fail('can\'t get tenderhellar metrics');
          }

          const p2pMetrics = tenderhellarMetrics[hostName].find((m) => m.name === 'drive_tenderhellar_p2p_peers_connected');
          const value = parseInt(p2pMetrics?.metrics[0]?.value, 10);

          if (!value) {
            expect.fail('can\'t get number of peers from p2p metric');
          }

          expect(value).to.be.greaterThan(0);
        });
      });
    }
  });
});
