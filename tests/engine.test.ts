import { describe, it, expect } from "vitest";
import { fixture } from "./fixtures/pack";
import {
  band,
  commit,
  empty,
  replay,
  ending,
  evidence,
  initial,
  reduce,
  matches,
} from "../lib/game/engine";
describe("engine", () => {
  it("reproduces twenty decisions and complete endings", () => {
    const p = fixture(),
      ids = p.scenes.map((s) => s.choices[0].id),
      a = replay(p, ids);
    expect(a).toEqual(replay(p, ids));
    expect(a.history).toHaveLength(20);
    expect(ending(p, a).summaries).toHaveLength(5);
    expect(ending(p, a).questions).toHaveLength(8);
    expect(ending(p, a).tensions).toHaveLength(2);
  });
  it("uses pre-decision conditions, first-match and fallback", () => {
    const p = fixture();
    p.scenes[0].choices[2].memories[0].when = {
      all: [{ kind: "score", axis: "trust", op: "gte", value: 1 }],
      any: [],
    };
    expect(commit(p, empty(), "s01_c").history[0].memoryId).toBe("s01_c_m3");
    const l = empty();
    l.scores.trust = 10;
    p.scenes[0].choices[2].memories[1].when =
      p.scenes[0].choices[2].memories[0].when;
    expect(commit(p, l, "s01_c").history[0].memoryId).toBe("s01_c_m1");
  });
  it("weights, reinforces and clamps once; tags cannot trigger own memory", () => {
    const p = fixture(),
      l = empty();
    l.scores.trust = 29;
    const c = p.scenes[0].choices[2];
    c.memories[0].when = {
      all: [{ kind: "tag", tag: "tag_0", present: true }],
      any: [],
    };
    const next = commit(p, l, c.id);
    expect(next.history[0].memoryId).toBe(c.id + "_m3");
    expect(next.scores.trust).toBe(30);
    expect(next.history[0].effective.trust).toBe(1);
    expect(next.tags).toContain("tag_0");
    expect(l.scores.trust).toBe(29);
  });
  it("handles band edges", () =>
    expect([-6, -5, 5, 6].map(band)).toEqual([
      "low",
      "middle",
      "middle",
      "high",
    ]));
  it("requires both all and any lists", () => {
    expect(
      matches(
        {
          all: [{ kind: "score", axis: "trust", op: "gte", value: 0 }],
          any: [{ kind: "tag", tag: "x", present: true }],
        },
        empty(),
      ),
    ).toBe(false);
  });
  it("ranks evidence by applied magnitude then earliest", () => {
    const p = fixture(),
      l = replay(
        p,
        p.scenes.map((s) => s.choices[2].id),
      );
    expect(evidence(l, "trust")?.stageId).toBe("s01");
    l.history[4].effective.trust = 3;
    expect(evidence(l, "trust")?.stageId).toBe("s05");
    l.scores.trust = 0;
    expect(evidence(l, "trust")?.stageId).toBe("s05");
    const z = empty();
    expect(evidence(z, "trust")).toBeUndefined();
  });
  it("duplicate confirm and continue cannot duplicate or skip", () => {
    const p = fixture();
    let s = reduce(p, initial(), { type: "start" });
    s = reduce(p, s, { type: "select", id: "s01_a" });
    s = reduce(p, s, { type: "confirm" });
    expect(reduce(p, s, { type: "confirm" })).toBe(s);
    s = reduce(p, s, { type: "continue" });
    expect(reduce(p, s, { type: "continue" })).toBe(s);
    expect(s.life.history).toHaveLength(1);
    expect(reduce(p, s, { type: "reset" })).toEqual(initial());
  });
});
