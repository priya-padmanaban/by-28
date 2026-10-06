import {
  AXES,
  BANDS,
  CHAPTERS,
  AGES,
  UI_KEYS,
  type Pack,
  type Scores,
} from "../../lib/content/schema";
const token = (id: string) => "[" + id + "]";
const score = (n: number): Scores =>
  Object.fromEntries(AXES.map((a) => [a, n])) as Scores;
export function fixture(): Pack {
  const ui = Object.fromEntries(UI_KEYS.map((k) => [k, token("ui." + k)]));
  ui.ageLabel += " {age}";
  ui.memoryAnnouncement += " {age}";
  for (const k of ["progressLabel", "progressAria"])
    ui[k] += " {current}/{total}";
  return {
    schemaVersion: 1,
    contentVersion: "fixture_1",
    title: "By 28",
    subtitle: token("subtitle"),
    intro: token("intro"),
    character: {
      id: "character",
      name: token("character.name"),
      pronouns: token("character.pronouns"),
      privateBrief: token("character.privateBrief"),
      publicSetup: token("character.publicSetup"),
    },
    tags: Array.from({ length: 12 }, (_, i) => ({
      id: "tag_" + i,
      definition: token("tag_" + i),
    })),
    axes: AXES.map((id) => ({
      id,
      displayName: token(id),
      bands: Object.fromEntries(
        BANDS.map((b) => [b, token(id + "." + b)]),
      ) as Record<(typeof BANDS)[number], string>,
    })),
    chapters: CHAPTERS.map((id, i) => ({
      id,
      title: token(id + ".title"),
      transitionAfter: i === 3 ? null : token(id + ".transition"),
    })),
    scenes: AGES.map((age, i) => {
      const id = "s" + String(i + 1).padStart(2, "0");
      return {
        id,
        age,
        chapterId: CHAPTERS[Math.floor(i / 5)],
        title: token(id + ".title"),
        prompt: token(id + ".prompt"),
        weight: i % 4 === 0 ? 2 : 1,
        choices: ["a", "b", "c"].map((letter, j) => {
          const cid = id + "_" + letter;
          return {
            id: cid,
            label: token(cid + ".label"),
            outcome: token(cid + ".outcome"),
            delta: score(j - 1),
            tags: ["tag_" + (i % 12)],
            memories: [1, 2, 3].map((k) => ({
              id: cid + "_m" + k,
              text: token(cid + "_m" + k + ".text"),
              reinforcement: score(k === 1 ? 1 : 0),
              tags: [],
              when:
                k === 3
                  ? null
                  : k === 1 && i > 0
                    ? {
                        all: [
                          {
                            kind: "choice" as const,
                            stageId: "s" + String(i).padStart(2, "0"),
                            choiceId: "s" + String(i).padStart(2, "0") + "_a",
                          },
                        ],
                        any: [],
                      }
                    : {
                        all: [
                          {
                            kind: "score" as const,
                            axis: "trust" as const,
                            op: k === 1 ? ("gte" as const) : ("lte" as const),
                            value: k === 1 ? 6 : -6,
                          },
                        ],
                        any: [],
                      },
            })),
          };
        }),
      };
    }),
    ending: {
      arrival: token("arrival"),
      summaries: AXES.flatMap((axis) =>
        BANDS.map((band) => ({
          id: axis + "_" + band,
          axis,
          band,
          text: token(axis + "_" + band),
        })),
      ),
      tensions: Array.from({ length: 10 }, (_, i) => ({
        id: "t" + String(i + 1).padStart(2, "0"),
        text: token("t" + (i + 1)),
        when: {
          all: [{ kind: "tag" as const, tag: "tag_" + i, present: true }],
          any: [],
        },
      })),
      questions: (
        [
          "trust",
          "guarded",
          "tender",
          "ambition",
          "curiosity",
          "trust",
          "guarded",
          "ambition",
        ] as const
      ).map((axis, i) => {
        const id = "q" + String(i + 1).padStart(2, "0");
        return {
          id,
          axis,
          label: token(id + ".label"),
          answers: Object.fromEntries(
            BANDS.map((b) => [
              b,
              { id: id + "_" + b, text: token(id + "_" + b + ".text") },
            ]),
          ) as Pack["ending"]["questions"][number]["answers"],
        };
      }),
    },
    ui,
  };
}
