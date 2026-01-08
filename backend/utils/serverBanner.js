const printServerBanner = ({ environment, port }) => {
  const env = environment || 'development';
  const portValue = port?.toString() || '5000';

  console.log(`
╔═══════════════════════════════════════╗
║   Gmail IMAP Viewer Server Started   ║
╠═══════════════════════════════════════╣
║  Environment: ${env.padEnd(23)} ║
║  Port: ${portValue.padEnd(30)} ║
║  Database: Connected                  ║
╚═══════════════════════════════════════╝
`);
};

module.exports = {
  printServerBanner
};
