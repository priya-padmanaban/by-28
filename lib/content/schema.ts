import { z } from "zod";
export const AXES = [
  "trust",
  "guarded",
  "tender",
  "ambition",
  "curiosity",
] as const;
export const BANDS = ["low", "middle", "high"] as const;
export const CHAPTERS = [
  "childhood",
  "school",
  "adolescence",
  "adulthood",
] as const;
export const AGES = [
  4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 26, 27,
];
export const UI_KEYS =
  "start resume reset confirmChoice continue selected choiceGroupLabel ageLabel progressLabel estimatedDuration rememberedHeading outcomeHeading endingHeading questionsHeading answerPrompt inspectHeading timelineHeading showActual hideActual evidenceLink anotherLife resetTitle resetBody resetConfirm resetCancel loading storageUnavailable saveCorruptTitle saveCorruptBody saveIncompatibleTitle saveIncompatibleBody saveConflictTitle saveConflictBody reloadSave memoryAnnouncement endingAnnouncement answerAnnouncement progressAria closeDialog characterSetupHeading noUndoNote fictionNote axesHeading traitsNote chapterLabel chosenLabel questionGroupLabel expandInspect collapseInspect expandTimeline collapseTimeline confirmHelp offlineSaveNote contentUnavailableTitle contentUnavailableBody".split(
    " ",
  );
const text = z
  .string()
  .refine((s) => s.trim().length > 0, "Nonempty text required")
  .refine((s) => !/<[^>]*>|\*\*|\]\(|\{[^}]*\}/.test(s), "Plain text required");
const id = z.string().regex(/^[a-z][a-z0-9_]*$/);
const scores = (n: number) =>
  z
    .object(
      Object.fromEntries(
        AXES.map((a) => [a, z.number().int().min(-n).max(n)]),
      ) as Record<(typeof AXES)[number], z.ZodNumber>,
    )
    .strict();
const test = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("score"),
      axis: z.enum(AXES),
      op: z.enum(["gte", "lte"]),
      value: z.number().int().min(-30).max(30),
    })
    .strict(),
  z.object({ kind: z.literal("tag"), tag: id, present: z.boolean() }).strict(),
  z.object({ kind: z.literal("choice"), stageId: id, choiceId: id }).strict(),
]);
export const whenSchema = z
  .object({ all: z.array(test).max(3), any: z.array(test).max(3) })
  .strict()
  .refine((w) => w.all.length + w.any.length > 0, "Condition cannot be empty");
const memory = z
  .object({
    id,
    when: whenSchema.nullable(),
    text,
    reinforcement: scores(1),
    tags: z.array(id),
  })
  .strict();
const choice = z
  .object({
    id,
    label: text,
    outcome: text,
    delta: scores(3),
    tags: z.array(id),
    memories: z.array(memory).length(3),
  })
  .strict();
const answer = z.object({ id, text }).strict();
const bandText = z.object({ low: text, middle: text, high: text }).strict();
const ui = z
  .object(
    Object.fromEntries(
      UI_KEYS.map((k) => [
        k,
        z.string().refine((s) => !!s.trim(), "Nonempty UI text required"),
      ]),
    ),
  )
  .strict();
export const packSchema = z
  .object({
    schemaVersion: z.literal(1),
    contentVersion: text,
    title: z.literal("By 28"),
    subtitle: text,
    intro: text,
    character: z
      .object({
        id,
        name: text,
        pronouns: text,
        privateBrief: text,
        publicSetup: text,
      })
      .strict(),
    tags: z
      .array(z.object({ id, definition: text }).strict())
      .min(12)
      .max(20),
    axes: z
      .array(
        z
          .object({ id: z.enum(AXES), displayName: text, bands: bandText })
          .strict(),
      )
      .length(5),
    chapters: z
      .array(
        z
          .object({
            id: z.enum(CHAPTERS),
            title: text,
            transitionAfter: text.nullable(),
          })
          .strict(),
      )
      .length(4),
    scenes: z
      .array(
        z
          .object({
            id,
            age: z.number().int(),
            chapterId: z.enum(CHAPTERS),
            title: text,
            prompt: text,
            weight: z.union([z.literal(1), z.literal(2)]),
            choices: z.array(choice).length(3),
          })
          .strict(),
      )
      .length(20),
    ending: z
      .object({
        arrival: text,
        summaries: z
          .array(
            z
              .object({ id, axis: z.enum(AXES), band: z.enum(BANDS), text })
              .strict(),
          )
          .length(15),
        tensions: z
          .array(z.object({ id, when: whenSchema, text }).strict())
          .length(10),
        questions: z
          .array(
            z
              .object({
                id,
                label: text,
                axis: z.enum(AXES),
                answers: z
                  .object({ low: answer, middle: answer, high: answer })
                  .strict(),
              })
              .strict(),
          )
          .length(8),
      })
      .strict(),
    ui,
  })
  .strict();
export type Pack = z.infer<typeof packSchema>;
export type When = z.infer<typeof whenSchema>;
export type Axis = (typeof AXES)[number];
export type Band = (typeof BANDS)[number];
export type Scores = Record<Axis, number>;
export function validatePack(input: unknown): Pack {
  const p = packSchema.parse(input);
  const errors: string[] = [];
  const ids = new Set<string>();
  const tags = new Set(p.tags.map((t) => t.id));
  const add = (v: string) => {
    if (ids.has(v)) errors.push(v + ": duplicate ID");
    ids.add(v);
  };
  add(p.character.id);
  p.tags.forEach((t) => add(t.id));
  p.axes.forEach((a, i) => {
    add(a.id);
    if (a.id !== AXES[i]) errors.push("axes: order");
  });
  p.chapters.forEach((c, i) => {
    add(c.id);
    if (
      c.id !== CHAPTERS[i] ||
      (i === 3 ? c.transitionAfter !== null : c.transitionAfter === null)
    )
      errors.push(c.id + ": chapter structure");
  });
  const introduced = new Map<string, number>();
  p.scenes.forEach((s, i) =>
    s.choices.forEach((c) =>
      [...c.tags, ...c.memories.flatMap((m) => m.tags)].forEach((t) => {
        if (!introduced.has(t)) introduced.set(t, i);
      }),
    ),
  );
  let historical = 0,
    priorChoices = 0;
  const historyScenes = new Set<number>();
  const check = (w: When, index: number, owner: string) => {
    let positive = false,
      prior = false;
    for (const t of [...w.all, ...w.any]) {
      if (t.kind === "tag") {
        if (!tags.has(t.tag)) errors.push(owner + ": unknown tag " + t.tag);
        if (t.present) {
          if ((introduced.get(t.tag) ?? 99) >= index)
            errors.push(owner + ": tag has no earlier introduction " + t.tag);
          else positive = true;
        }
      }
      if (t.kind === "choice") {
        const j = p.scenes.findIndex((s) => s.id === t.stageId);
        if (
          j < 0 ||
          j >= index ||
          !p.scenes[j]?.choices.some((c) => c.id === t.choiceId)
        )
          errors.push(owner + ": invalid prior choice");
        else {
          positive = true;
          prior = true;
        }
      }
    }
    return { positive, prior };
  };
  p.scenes.forEach((s, i) => {
    add(s.id);
    if (
      s.id !== "s" + String(i + 1).padStart(2, "0") ||
      s.age !== AGES[i] ||
      s.chapterId !== CHAPTERS[Math.floor(i / 5)]
    )
      errors.push(s.id + ": scene assignment");
    s.choices.forEach((c, j) => {
      add(c.id);
      if (c.id !== s.id + "_" + "abc"[j]) errors.push(c.id + ": choice ID");
      for (const list of [c.tags, ...c.memories.map((m) => m.tags)]) {
        if (new Set(list).size !== list.length)
          errors.push(c.id + ": duplicate tags");
        list.forEach((t) => {
          if (!tags.has(t)) errors.push(c.id + ": unknown tag " + t);
        });
      }
      c.memories.forEach((m, k) => {
        add(m.id);
        if (
          m.id !== c.id + "_m" + (k + 1) ||
          (k === 2 ? m.when !== null : m.when === null)
        )
          errors.push(m.id + ": memory structure");
        if (m.when) {
          const r = check(m.when, i, m.id);
          if (r.positive) {
            historical++;
            historyScenes.add(i);
          }
          if (r.prior) priorChoices++;
        }
      });
      if (
        JSON.stringify(c.memories[0].when) ===
        JSON.stringify(c.memories[1].when)
      )
        errors.push(c.id + ": identical conditions");
    });
  });
  if (p.scenes.filter((s) => s.weight === 2).length !== 5)
    errors.push("scenes: exactly five weight-2 scenes required");
  if (historical < 20 || priorChoices < 8 || historyScenes.size < 8)
    errors.push(
      "memories: insufficient positive historical references (20 / 8 choices / 8 scenes)",
    );
  AXES.forEach((a) =>
    BANDS.forEach((b) => {
      if (
        p.ending.summaries.filter(
          (s) => s.axis === a && s.band === b && s.id === a + "_" + b,
        ).length !== 1
      )
        errors.push("summaries: " + a + "_" + b);
    }),
  );
  p.ending.summaries.forEach((s) => add(s.id));
  let tensionHistory = 0;
  p.ending.tensions.forEach((t, i) => {
    add(t.id);
    if (t.id !== "t" + String(i + 1).padStart(2, "0"))
      errors.push(t.id + ": tension ID");
    check(t.when, 20, t.id);
    if ([...t.when.all, ...t.when.any].some((x) => x.kind !== "score"))
      tensionHistory++;
  });
  if (tensionHistory < 4)
    errors.push("tensions: four historical conditions required");
  const qa: Axis[] = [
    "trust",
    "guarded",
    "tender",
    "ambition",
    "curiosity",
    "trust",
    "guarded",
    "ambition",
  ];
  p.ending.questions.forEach((q, i) => {
    add(q.id);
    if (q.id !== "q" + String(i + 1).padStart(2, "0") || q.axis !== qa[i])
      errors.push(q.id + ": question assignment");
    BANDS.forEach((b) => {
      add(q.answers[b].id);
      if (q.answers[b].id !== q.id + "_" + b) errors.push(q.id + ": answer ID");
    });
  });
  const placeholders: Record<string, string[]> = {
    ageLabel: ["age"],
    progressLabel: ["current", "total"],
    progressAria: ["current", "total"],
    memoryAnnouncement: ["age"],
  };
  Object.entries(p.ui).forEach(([k, v]) => {
    const found = [...v.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]).sort();
    if (
      JSON.stringify(found) !==
        JSON.stringify((placeholders[k] ?? []).slice().sort()) ||
      /<[^>]*>/.test(v)
    )
      errors.push("ui." + k + ": invalid placeholders or HTML");
  });
  if (errors.length) throw new Error(errors.join("\n"));
  return p;
}
