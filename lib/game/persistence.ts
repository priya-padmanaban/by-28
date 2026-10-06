import { z } from "zod";
import { type Pack } from "../content/schema";
import { replay, type State } from "./engine";
export const KEY = "by28.save.v1";
const saveSchema = z
  .object({
    schemaVersion: z.literal(1),
    contentVersion: z.string(),
    revision: z.number().int().nonnegative(),
    phase: z.enum(["welcome", "scene", "memory", "ending"]),
    history: z
      .array(
        z
          .object({
            stageId: z.string(),
            choiceId: z.string(),
            memoryId: z.string(),
          })
          .strict(),
      )
      .max(20),
  })
  .strict();
export type Save = z.infer<typeof saveSchema>;
export function encode(p: Pack, s: State, revision: number): Save {
  return {
    schemaVersion: 1,
    contentVersion: p.contentVersion,
    revision,
    phase: s.phase,
    history: s.life.history.map(({ stageId, choiceId, memoryId }) => ({
      stageId,
      choiceId,
      memoryId,
    })),
  };
}
export function decode(
  p: Pack,
  raw: string,
): { state: State; revision: number } {
  const save = saveSchema.parse(JSON.parse(raw));
  if (save.contentVersion !== p.contentVersion) throw Error("incompatible");
  const l = replay(
    p,
    save.history.map((h) => h.choiceId),
  );
  if (
    l.history.some(
      (h, i) =>
        h.stageId !== save.history[i].stageId ||
        h.memoryId !== save.history[i].memoryId,
    )
  )
    throw Error("corrupt");
  const n = l.history.length;
  if (
    (save.phase === "welcome" && n !== 0) ||
    (save.phase === "scene" && n >= 20) ||
    (save.phase === "memory" && n === 0) ||
    (save.phase === "ending" && n !== 20)
  )
    throw Error("corrupt");
  return {
    state: { phase: save.phase, life: l, selected: null },
    revision: save.revision,
  };
}
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export function write(
  p: Pack,
  s: State,
  revision: number,
  storage: StorageLike,
): number {
  const raw = storage.getItem(KEY);
  if (raw) {
    const current = saveSchema.parse(JSON.parse(raw));
    if (current.revision !== revision) throw Error("conflict");
  } else if (revision !== 0) throw Error("conflict");
  const next = revision + 1;
  storage.setItem(KEY, JSON.stringify(encode(p, s, next)));
  return next;
}
