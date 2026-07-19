/**
 * Structured conflict presentation.
 *
 * Spec §4.1.3 is normative and explicit — when a conflicted file is opened giti
 * SHALL materialize the conflict in a structured format, NOT git's `<<<<<<<`
 * markers, showing:
 *   - the base (what it looked like before either side changed it)
 *   - side A's changes (as a diff from base)
 *   - side B's state (as full content)
 * "This is strictly more informative than git's markers."
 *
 * The asymmetry (A as a diff, B as content) is the spec's, not an accident: you
 * already know what you did, so your side compresses to a diff, while theirs is
 * the thing you have to actually read.
 *
 * Spec ref: giti-spec-v1.md §4.1
 */

/** Longest-common-subsequence line diff — small, dependency-free, good enough
 *  for the file sizes a single conflict spans. */
function lineDiff(baseLines, otherLines) {
  const n = baseLines.length;
  const m = otherLines.length;
  // Guard: LCS is O(n*m); fall back to a blunt summary on very large files
  // rather than stalling the terminal.
  if (n * m > 4_000_000) return null;

  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = baseLines[i] === otherLines[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const out = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (baseLines[i] === otherLines[j]) { out.push({ kind: " ", text: baseLines[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ kind: "-", text: baseLines[i] }); i++; }
    else { out.push({ kind: "+", text: otherLines[j] }); j++; }
  }
  while (i < n) out.push({ kind: "-", text: baseLines[i++] });
  while (j < m) out.push({ kind: "+", text: otherLines[j++] });
  return out;
}

/** Keep only changed lines plus a little context, so a one-line change in a
 *  400-line file prints as a few lines, not 400. */
function condense(diff, context = 2) {
  if (!diff) return null;
  const keep = new Set();
  diff.forEach((d, idx) => {
    if (d.kind === " ") return;
    for (let k = idx - context; k <= idx + context; k++) if (k >= 0 && k < diff.length) keep.add(k);
  });
  if (keep.size === 0) return [];

  const out = [];
  let last = -1;
  for (const idx of [...keep].sort((a, b) => a - b)) {
    if (last >= 0 && idx > last + 1) out.push({ kind: "…", text: "" });
    out.push(diff[idx]);
    last = idx;
  }
  return out;
}

/**
 * Build the structured view for one conflicted file.
 * @param {{ base: string, ours: string, theirs: string }} sides
 */
export function buildConflictView(path, sides) {
  const split = (s) => s.replace(/\n$/, "").split("\n");
  const baseLines = split(sides.base);
  const oursDiff = condense(lineDiff(baseLines, split(sides.ours)));
  const theirsLines = split(sides.theirs);

  const changed = (oursDiff || []).filter((d) => d.kind === "+" || d.kind === "-").length;
  return {
    path,
    baseLineCount: baseLines.length,
    oursDiff,
    oursChangedLines: changed,
    theirs: theirsLines,
    identical: sides.ours === sides.theirs,
  };
}

const MAX_THEIRS_LINES = 40;

/**
 * Render one view. `actions` is the option list from the caller — for a .scrml
 * file that the AST merger can combine, "keep both" is a real option (spec
 * §4.1 worked example, option [1]); for anything else it is not.
 */
export function formatConflictView(view, actions = []) {
  const lines = [`  ${view.path}`];

  if (view.identical) {
    lines.push("    Both sides made the same change — nothing to choose.");
    return lines.join("\n");
  }

  lines.push(`    Base:   ${view.baseLineCount} line(s) before either side changed it`);

  lines.push(`    Yours:  ${view.oursChangedLines} changed line(s) vs base`);
  if (view.oursDiff === null) {
    lines.push("      (file too large to diff inline — use `giti diff`)");
  } else if (view.oursDiff.length === 0) {
    lines.push("      (unchanged from base)");
  } else {
    for (const d of view.oursDiff) {
      lines.push(d.kind === "…" ? "        …" : `      ${d.kind} ${d.text}`);
    }
  }

  lines.push(`    Theirs: ${view.theirs.length} line(s)`);
  const shown = view.theirs.slice(0, MAX_THEIRS_LINES);
  for (const t of shown) lines.push(`      | ${t}`);
  if (view.theirs.length > shown.length) {
    lines.push(`        … ${view.theirs.length - shown.length} more line(s)`);
  }

  if (actions.length > 0) {
    lines.push("");
    lines.push("    Options:");
    actions.forEach((a, i) => lines.push(`      [${i + 1}] ${a}`));
  }
  return lines.join("\n");
}
