#!/usr/bin/env node

/**
 * Sherpy CLI entry point
 * Command routing for start/stop
 */

import { startCommand } from "./commands/start.js";
import { stopCommand } from "./commands/stop.js";

export function main(): void {
  const args = process.argv.slice(2);
  const command = args[0];

  let exitCode: number;

  switch (command) {
    case "start":
      exitCode = startCommand();
      break;
    case "stop":
      exitCode = stopCommand();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error("Usage: sherpy [start|stop]");
      exitCode = 1;
  }

  process.exit(exitCode);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
