/** Prints the URL to open from another device on the same network (see the `:lan` scripts). */
import { networkInterfaces } from 'node:os';

const port = process.argv[2] ?? '3000';
const address = Object.values(networkInterfaces())
  .flat()
  .find((net) => net && net.family === 'IPv4' && !net.internal)?.address;

console.log(
  address
    ? `\n  Network: http://${address}:${port}\n`
    : '\n  No network address found: are you connected to Wi-Fi?\n',
);
