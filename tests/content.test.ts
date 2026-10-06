import { it, expect } from "vitest";
import { validatePack } from "../lib/content/schema";
import { fixture } from "./fixtures/pack";
it("validates ID-only contract fixture", () =>
  expect(validatePack(fixture()).scenes).toHaveLength(20));
it.each([
  "count",
  "duplicate",
  "tag",
  "future",
  "delta",
  "age",
  "ui",
  "extra",
  "fallback",
])("rejects %s violations", (kind) => {
  const p = fixture();
  switch (kind) {
    case "count":
      p.scenes.pop();
      break;
    case "duplicate":
      p.tags[1].id = p.tags[0].id;
      break;
    case "tag":
      p.scenes[0].choices[0].tags = ["unknown"];
      break;
    case "future":
      p.scenes[1].choices[0].memories[0].when = {
        all: [{ kind: "choice", stageId: "s20", choiceId: "s20_a" }],
        any: [],
      };
      break;
    case "delta":
      p.scenes[0].choices[0].delta.trust = 4;
      break;
    case "age":
      p.scenes[0].age = 99;
      break;
    case "ui":
      delete p.ui.start;
      break;
    case "extra":
      Object.assign(p.character, { extra: "x" });
      break;
    case "fallback":
      p.scenes[0].choices[0].memories[2].when = {
        all: [{ kind: "score", axis: "trust", op: "gte", value: 0 }],
        any: [],
      };
  }
  expect(() => validatePack(p)).toThrow();
});
