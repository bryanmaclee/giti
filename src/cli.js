#!/usr/bin/env bun

/**
 * giti — Version control for humans.
 *
 * 5-function surface: save, switch, merge, undo, history
 * Engine: jj-lib (invisible to the user)
 *
 * See docs/giti-spec-v1.md for full specification.
 */

import { save } from "./commands/save.js";
import { switch_ } from "./commands/switch.js";
import { merge } from "./commands/merge.js";
import { undo } from "./commands/undo.js";
import { history } from "./commands/history.js";
import { init } from "./commands/init.js";
import { land } from "./commands/land.js";
import { status } from "./commands/status.js";
import { describe } from "./commands/describe.js";
import { sync } from "./commands/sync.js";
import { serve } from "./commands/serve.js";

const COMMANDS = {
  save,
  switch: switch_,
  merge,
  undo,
  history,
  init,
  land,
  status,
  describe,
  sync,
  serve,
};

const HELP = `giti — version control for humans

Commands:
  giti save [message]     Save your current work
  giti switch <name>      Switch to a different line of work
  giti merge <name>       Bring another line of work into yours
  giti undo               Undo the last operation
  giti history            Show what happened
  giti land               Ship your work (compiler + tests must pass)
  giti status             Show what's changed
  giti describe <h> msg   Update a save's description
  giti sync               Push and pull remote changes
  giti init               Initialize a new giti repository
  giti serve [--port N]   Start the HTTP API server

Options:
  --help, -h              Show this help
  --version, -v           Show version
`;

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    process.stdout.write(HELP);
    return;
  }

  if (args[0] === "--version" || args[0] === "-v") {
    process.stdout.write("giti 0.1.0\n");
    return;
  }

  const commandName = args[0];
  const command = COMMANDS[commandName];

  if (!command) {
    process.stderr.write(`giti: unknown command '${commandName}'\n`);
    process.stderr.write(`Run 'giti --help' for usage.\n`);
    process.exit(1);
  }

  command(args.slice(1));
}

main();
