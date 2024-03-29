const vpnManager = require('node-openvpn');

// Sorry guys for this shit.
// Please say thank you to Luigi Poole (node-openvpn author).
// Here we go...

let vpn;

async function waitForConnection() {
  vpn = await vpnManager.connect({
    host: process.env.OPENVPN_MANAGMENT_HOST,
    port: process.env.OPENVPN_MANAGMENT_PORT,
    timeout: 1500,
  });

  return new Promise((resolve, reject) => {
    // Waiting for 'connected' state
    vpn.on('state-change', (state) => {
      const [, name, status] = state;
      if (name === 'CONNECTED' && status === 'SUCCESS') {
        resolve();
      }
    });

    // Handle errors
    vpn.on('error', reject);
    vpn.on('close', reject);
    vpn.on('end', reject);

    // Check current state
    vpnManager.cmd('state').then((stateString) => {
      if (stateString.includes('CONNECTED,SUCCESS')) {
        resolve();
      }
    });
  });
}

async function shutdown() {
  await vpnManager.disconnect();
  vpnManager.destroy();
}

async function handleTermSignal() {
  await shutdown();

  process.exit(0);
}

// Prevent the hang of the Node process
process.on('uncaughtException', shutdown);
process.on('unhandledRejection', shutdown);

process.on('SIGTERM', handleTermSignal);
process.on('SIGINT', handleTermSignal);

module.exports = {
  waitForConnection,
  shutdown,
};
