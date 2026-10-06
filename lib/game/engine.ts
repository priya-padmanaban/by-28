import {
  AXES,
  type Pack,
  type Scores,
  type When,
  type Axis,
  type Band,
} from "../content/schema";
export type Phase = "welcome" | "scene" | "memory" | "ending";
export type Entry = {
  stageId: string;
  choiceId: string;
  memoryId: string;
  before: Scores;
  after: Scores;
  effective: Scores;
};
export type Life = { scores: Scores; tags: string[]; history: Entry[] };
export const zero = (): Scores =>
  Object.fromEntries(AXES.map((a) => [a, 0])) as Scores;
export const empty = (): Life => ({ scores: zero(), tags: [], history: [] });
export function matches(w: When, l: Life): boolean {
  const test = (t: When["all"][number]) =>
    t.kind === "score"
      ? t.op === "gte"
        ? l.scores[t.axis] >= t.value
        : l.scores[t.axis] <= t.value
      : t.kind === "tag"
        ? l.tags.includes(t.tag) === t.present
        : l.history.some(
            (h) => h.stageId === t.stageId && h.choiceId === t.choiceId,
          );
  return w.all.every(test) && (!w.any.length || w.any.some(test));
}
export function commit(p: Pack, l: Life, choiceId: string): Life {
  const s = p.scenes[l.history.length];
  const c = s?.choices.find((c) => c.id === choiceId);
  if (!s || !c) throw Error("Invalid next choice: " + choiceId);
  const m = c.memories.find((m) => m.when === null || matches(m.when, l));
  if (!m) throw Error("Missing memory: " + c.id);
  const after = zero(),
    effective = zero();
  for (const a of AXES) {
    after[a] = Math.max(
      -30,
      Math.min(30, l.scores[a] + c.delta[a] * s.weight + m.reinforcement[a]),
    );
    effective[a] = after[a] - l.scores[a];
  }
  return {
    scores: after,
    tags: [...new Set([...l.tags, ...c.tags, ...m.tags])],
    history: [
      ...l.history,
      {
        stageId: s.id,
        choiceId: c.id,
        memoryId: m.id,
        before: { ...l.scores },
        after: { ...after },
        effective,
      },
    ],
  };
}
export function replay(p: Pack, choices: string[]): Life {
  return choices.reduce((l, c) => commit(p, l, c), empty());
}
export const band = (n: number): Band =>
  n <= -6 ? "low" : n >= 6 ? "high" : "middle";
export function evidence(l: Life, a: Axis): Entry | undefined {
  return l.history
    .map((h, i) => ({ h, i }))
    .filter(
      ({ h }) =>
        h.effective[a] !== 0 &&
        (l.scores[a] === 0 ||
          Math.sign(h.effective[a]) === Math.sign(l.scores[a])),
    )
    .sort(
      (x, y) =>
        Math.abs(y.h.effective[a]) - Math.abs(x.h.effective[a]) || x.i - y.i,
    )[0]?.h;
}
export function ending(p: Pack, l: Life) {
  return {
    summaries: AXES.map((a) =>
      p.ending.summaries.find(
        (s) => s.axis === a && s.band === band(l.scores[a]),
      )!,
    ),
    tensions: p.ending.tensions.filter((t) => matches(t.when, l)).slice(0, 2),
    questions: p.ending.questions.map((q) => ({
      ...q,
      answer: q.answers[band(l.scores[q.axis])],
    })),
  };
}
export type State = { phase: Phase; life: Life; selected: string | null };
export type Action =
  | { type: "start" }
  | { type: "select"; id: string }
  | { type: "confirm" }
  | { type: "continue" }
  | { type: "reset" };
export const initial = (): State => ({
  phase: "welcome",
  life: empty(),
  selected: null,
});
export function reduce(p: Pack, s: State, a: Action): State {
  if (a.type === "reset") return initial();
  if (a.type === "start" && s.phase === "welcome")
    return { ...s, phase: "scene" };
  if (
    a.type === "select" &&
    s.phase === "scene" &&
    p.scenes[s.life.history.length].choices.some((c) => c.id === a.id)
  )
    return { ...s, selected: a.id };
  if (a.type === "confirm" && s.phase === "scene" && s.selected)
    return {
      phase: "memory",
      life: commit(p, s.life, s.selected),
      selected: null,
    };
  if (a.type === "continue" && s.phase === "memory")
    return { ...s, phase: s.life.history.length === 20 ? "ending" : "scene" };
  return s;
}
