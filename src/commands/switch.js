/**
 * giti switch <name>
 *
 * Switch to a different line of work. If the name doesn't exist,
 * offer to create it.
 *
 * Spec ref: giti-spec-v1.md §2.2
 */

import { getEngine } from "../engine/index.js";

export async function switch_(args) {
  const engine = getEngine();

  if (args.length === 0) {
    // No name given — list available branches
    const branches = await engine.listBranches();
    if (!branches.ok) {
      process.stderr.write(`giti: ${branches.error}\n`);
      process.exit(1);
    }
    if (branches.data.length === 0) {
      process.stdout.write("No other lines of work. Use 'giti switch <name>' to create one.\n");
      return;
    }
    process.stdout.write("Lines of work:\n");
    for (const b of branches.data) {
      const marker = b.active ? " *" : "  ";
      process.stdout.write(`${marker} ${b.name}\n`);
    }
    return;
  }

  const name = args[0];
  const result = await engine.switchTo(name);

  if (!result.ok) {
    // Branch doesn't exist — create it
    const create = await engine.createBranch(name);
    if (!create.ok) {
      process.stderr.write(`giti: ${create.error}\n`);
      process.exit(1);
    }
    process.stdout.write(`Created and switched to: ${name}\n`);
    return;
  }

  process.stdout.write(`Switched to: ${name}\n`);
}
