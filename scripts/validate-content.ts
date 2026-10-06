import { readFile, mkdir, writeFile } from "node:fs/promises";
import { validatePack, AXES, BANDS } from "../lib/content/schema";
import { replay, ending, band } from "../lib/game/engine";
async function main() {
  const path = "content/by-28.json";
  let p;
  try {
    p = validatePack(JSON.parse(await readFile(path, "utf8")));
  } catch (e) {
    console.error(path + ":", e instanceof Error ? e.message : e);
    process.exitCode = 1;
    return;
  }
  let seed = 280028;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const memories = new Set<string>();
  const bands = new Set<string>();
  for (let i = 0; i < 1000; i++) {
    const l = replay(
      p,
      p.scenes.map((s) => s.choices[Math.floor(random() * 3)].id),
    );
    const e = ending(p, l);
    if (e.summaries.some((s) => !s) || e.questions.length !== 8)
      throw Error("Incomplete ending");
    l.history.forEach((h) => memories.add(h.memoryId));
    AXES.forEach((a) => bands.add(a + "_" + band(l.scores[a])));
  }
  const all = p.scenes.flatMap((s) =>
    s.choices.flatMap((c) => c.memories.map((m) => m.id)),
  );
  await mkdir("reports", { recursive: true });
  await writeFile(
    "reports/reachability.json",
    JSON.stringify(
      {
        contentVersion: p.contentVersion,
        sampledLives: 1000,
        observedMemories: [...memories],
        unobservedMemories: all.filter((id) => !memories.has(id)),
        observedBands: [...bands],
        unobservedBands: AXES.flatMap((a) =>
          BANDS.map((b) => a + "_" + b),
        ).filter((id) => !bands.has(id)),
        note: "Unobserved does not mean impossible. Sampling does not establish literary quality or prove reachability.",
      },
      null,
      2,
    ),
  );
  console.log(
    path + ": valid; 1,000 seeded lives passed. reports/reachability.json",
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
