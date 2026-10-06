import { it, expect } from "vitest";
import { fixture } from "./fixtures/pack";
import { initial, replay, type State } from "../lib/game/engine";
import { decode, encode, write, KEY } from "../lib/game/persistence";
it.each(["scene", "memory", "ending"] as const)(
  "resumes %s by replay",
  (phase) => {
    const p = fixture(),
      n = phase === "ending" ? 20 : 1;
    const state: State = {
      phase,
      life: replay(
        p,
        p.scenes.slice(0, n).map((s) => s.choices[0].id),
      ),
      selected: null,
    };
    expect(decode(p, JSON.stringify(encode(p, state, 2))).state).toEqual(state);
  },
);
it("rejects incompatible, corrupt memory, phase and order", () => {
  const p = fixture();
  const s = encode(
    p,
    { phase: "memory", life: replay(p, ["s01_a"]), selected: null },
    1,
  );
  expect(() =>
    decode(p, JSON.stringify({ ...s, contentVersion: "other" })),
  ).toThrow("incompatible");
  expect(() => decode(p, JSON.stringify({ ...s, phase: "ending" }))).toThrow();
  s.history[0].memoryId = "wrong";
  expect(() => decode(p, JSON.stringify(s))).toThrow();
  expect(() => decode(p, "{")).toThrow();
});
it("checks revisions and propagates unavailable storage", () => {
  const p = fixture();
  let raw: string | null = null;
  const store = {
    getItem: () => raw,
    setItem: (_k: string, v: string) => {
      raw = v;
    },
  };
  expect(write(p, initial(), 0, store)).toBe(1);
  expect(() => write(p, initial(), 0, store)).toThrow("conflict");
  expect(() =>
    write(p, initial(), 1, {
      getItem: () => {
        throw new DOMException("blocked");
      },
      setItem: () => {},
    }),
  ).toThrow();
  expect(KEY).toBe("by28.save.v1");
});
