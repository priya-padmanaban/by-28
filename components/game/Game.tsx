"use client";
import { useEffect, useRef, useState } from "react";
import { AXES, type Pack, type Axis } from "../../lib/content/schema";
import {
  initial,
  reduce,
  ending,
  band,
  evidence,
  type State,
  type Action,
} from "../../lib/game/engine";
import { KEY, decode, write } from "../../lib/game/persistence";
function Prose({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n\n/).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </>
  );
}
export default function Game({ pack: p }: { pack: Pack }) {
  const [state, setState] = useState<State>(initial);
  const current = useRef(state);
  const revision = useRef(0);
  const [loaded, setLoaded] = useState(false),
    [resume, setResume] = useState(false);
  const [issue, setIssue] = useState<
    null | "corrupt" | "incompatible" | "conflict" | "unavailable"
  >(null);
  const [question, setQuestion] = useState<string | null>(null),
    [inspect, setInspect] = useState(false),
    [timeline, setTimeline] = useState(false),
    [actual, setActual] = useState<string[]>([]),
    [dialog, setDialog] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null),
    modal = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLElement | null>(null);
  const ui = (key: string, values: Record<string, number> = {}) =>
    Object.entries(values).reduce(
      (s, [k, v]) => s.replace("{" + k + "}", String(v)),
      p.ui[key],
    );
  const assign = (s: State) => {
    current.current = s;
    setState(s);
  };
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = decode(p, raw);
        revision.current = saved.revision;
        assign(saved.state);
        setResume(true);
      } else {
        revision.current = 0;
        assign(initial());
        setResume(false);
      }
      setIssue(null);
    } catch (e) {
      setIssue(
        e instanceof Error && e.message === "incompatible"
          ? "incompatible"
          : e instanceof DOMException
            ? "unavailable"
            : "corrupt",
      );
    }
    setLoaded(true);
  }
  useEffect(() => {
    load();
    const listener = (e: StorageEvent) => {
      if (e.key === KEY) {
        setIssue("conflict");
      }
    };
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  }, []); // content is fixed for this mounted game
  useEffect(() => {
    if (loaded && !resume) heading.current?.focus();
  }, [state.phase, loaded, resume]);
  useEffect(() => {
    if (dialog) {
      trigger.current = document.activeElement as HTMLElement;
      modal.current?.showModal();
    } else if (modal.current?.open) {
      modal.current.close();
      trigger.current?.focus();
    }
  }, [dialog]);
  function act(a: Action) {
    if (issue && issue !== "unavailable") return;
    const next = reduce(p, current.current, a);
    if (next === current.current) return;
    if (a.type !== "select" && issue !== "unavailable") {
      try {
        revision.current = write(p, next, revision.current, localStorage);
      } catch (e) {
        if (e instanceof DOMException) {
          setIssue("unavailable");
        } else {
          setIssue("conflict");
          return;
        }
      }
    }
    assign(next);
  }
  function reset() {
    try {
      const raw = localStorage.getItem(KEY);
      let rev = 0;
      try {
        rev = raw ? JSON.parse(raw).revision : 0;
      } catch {}
      revision.current =
        Number.isInteger(rev) && rev >= 0 ? rev : revision.current;
      // Explicit reset authorizes replacing a corrupt or incompatible record.
      const next = initial();
      const nextRevision = revision.current + 1;
      localStorage.setItem(
        KEY,
        JSON.stringify({
          schemaVersion: 1,
          contentVersion: p.contentVersion,
          revision: nextRevision,
          phase: "welcome",
          history: [],
        }),
      );
      revision.current = nextRevision;
      assign(next);
      setIssue(null);
    } catch {
      assign(initial());
      setIssue("unavailable");
    }
    setResume(false);
    setQuestion(null);
    setInspect(false);
    setTimeline(false);
    setActual([]);
    setDialog(false);
  }
  const l = state.life,
    scene =
      p.scenes[
        state.phase === "memory" ? l.history.length - 1 : l.history.length
      ],
    last = l.history.at(-1);
  const chosen = scene?.choices.find((c) => c.id === last?.choiceId),
    memory = chosen?.memories.find((m) => m.id === last?.memoryId);
  const end = ending(p, l);
  const answer = end.questions.find((q) => q.id === question);
  const blocked = issue !== null && issue !== "unavailable";
  function openEvidence(axis: Axis) {
    const h = evidence(l, axis);
    if (!h) return;
    setInspect(true);
    setTimeline(true);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => document.getElementById(h.stageId)?.focus()),
    );
  }
  const link = (axis: Axis) =>
    evidence(l, axis) ? (
      <button className="text-button" onClick={() => openEvidence(axis)}>
        {ui("evidenceLink")}
      </button>
    ) : null;
  if (!loaded)
    return (
      <main aria-busy="true">
        <p>{ui("loading")}</p>
      </main>
    );
  return (
    <main>
      <header className="masthead">
        <span>{p.title}</span>
        {state.phase !== "welcome" && (
          <button className="text-button" onClick={() => setDialog(true)}>
            {ui("reset")}
          </button>
        )}
      </header>
      {issue && (
        <aside role="alert">
          {issue === "unavailable" ? (
            ui("storageUnavailable")
          ) : (
            <>
              <h2>
                {ui(
                  issue === "corrupt"
                    ? "saveCorruptTitle"
                    : issue === "incompatible"
                      ? "saveIncompatibleTitle"
                      : "saveConflictTitle",
                )}
              </h2>
              <Prose
                text={ui(
                  issue === "corrupt"
                    ? "saveCorruptBody"
                    : issue === "incompatible"
                      ? "saveIncompatibleBody"
                      : "saveConflictBody",
                )}
              />
              {issue === "conflict" ? (
                <button onClick={load}>{ui("reloadSave")}</button>
              ) : (
                <button onClick={() => setDialog(true)}>{ui("reset")}</button>
              )}
            </>
          )}
        </aside>
      )}
      {state.phase === "welcome" || resume ? (
        <section>
          <h1 ref={heading} tabIndex={-1}>
            {p.title}
          </h1>
          <p className="subtitle">{p.subtitle}</p>
          <Prose text={p.intro} />
          <h2>{ui("characterSetupHeading")}</h2>
          <Prose text={p.character.publicSetup} />
          <p className="note">{ui("estimatedDuration")}</p>
          {resume ? (
            <>
              <button disabled={blocked} onClick={() => setResume(false)}>
                {ui("resume")}
              </button>
              <button onClick={() => setDialog(true)}>{ui("reset")}</button>
            </>
          ) : (
            <button disabled={blocked} onClick={() => act({ type: "start" })}>
              {ui("start")}
            </button>
          )}
          <p className="note">{ui("fictionNote")}</p>
          <p className="note">{ui("offlineSaveNote")}</p>
        </section>
      ) : state.phase === "scene" ? (
        <section>
          <div className="eyebrow">
            {ui("chapterLabel")} ·{" "}
            {p.chapters.find((c) => c.id === scene.chapterId)?.title}
          </div>
          <div className="meta">
            <span>{ui("ageLabel", { age: scene.age })}</span>
            <span>
              {ui("progressLabel", {
                current: l.history.length + 1,
                total: 20,
              })}
            </span>
          </div>
          <progress
            max={20}
            value={l.history.length}
            aria-label={ui("progressAria", {
              current: l.history.length + 1,
              total: 20,
            })}
          />
          <h1 ref={heading} tabIndex={-1}>
            {scene.title}
          </h1>
          <Prose text={scene.prompt} />
          <fieldset disabled={blocked}>
            <legend>{ui("choiceGroupLabel")}</legend>
            {scene.choices.map((c) => (
              <label
                className={
                  "choice " + (state.selected === c.id ? "chosen" : "")
                }
                key={c.id}
              >
                <input
                  type="radio"
                  name={scene.id}
                  value={c.id}
                  checked={state.selected === c.id}
                  onChange={() => act({ type: "select", id: c.id })}
                />
                <span>
                  {c.label}
                  {state.selected === c.id && <small>{ui("selected")}</small>}
                </span>
              </label>
            ))}
          </fieldset>
          <p className="note" id="confirm-help">
            {ui("confirmHelp")}
          </p>
          <button
            disabled={!state.selected || blocked}
            aria-describedby="confirm-help"
            onClick={() => act({ type: "confirm" })}
          >
            {ui("confirmChoice")}
          </button>
          <p className="note">{ui("noUndoNote")}</p>
        </section>
      ) : state.phase === "memory" && chosen && memory ? (
        <section>
          <div className="eyebrow">{ui("ageLabel", { age: scene.age })}</div>
          <h1 ref={heading} tabIndex={-1}>
            {ui("rememberedHeading")}
          </h1>
          <p className="selected-choice">
            {ui("chosenLabel")} · {chosen.label}
          </p>
          <h2>{ui("outcomeHeading")}</h2>
          <Prose text={chosen.outcome} />
          <div className="memory">
            <h2>{ui("rememberedHeading")}</h2>
            <Prose text={memory.text} />
          </div>
          {l.history.length % 5 === 0 && l.history.length < 20 && (
            <Prose
              text={
                p.chapters[Math.floor(l.history.length / 5) - 1]
                  .transitionAfter!
              }
            />
          )}
          <button disabled={blocked} onClick={() => act({ type: "continue" })}>
            {ui("continue")}
          </button>
        </section>
      ) : (
        <section>
          <div className="eyebrow">{ui("ageLabel", { age: 28 })}</div>
          <h1 ref={heading} tabIndex={-1}>
            {ui("endingHeading")}
          </h1>
          <Prose text={p.ending.arrival} />
          {end.summaries.map((s) => (
            <div key={s.id}>
              <Prose text={s.text} />
              {link(s.axis)}
            </div>
          ))}
          {end.tensions.map((t) => (
            <Prose key={t.id} text={t.text} />
          ))}
          <h2>{ui("questionsHeading")}</h2>
          <div
            className="questions"
            role="group"
            aria-label={ui("questionGroupLabel")}
          >
            {end.questions.map((q) => (
              <button
                key={q.id}
                aria-pressed={q.id === question}
                onClick={() => setQuestion(q.id)}
              >
                {q.label}
              </button>
            ))}
          </div>
          {answer ? (
            <article className="memory" data-answer-id={answer.answer.id}>
              <h3>{p.character.name}</h3>
              <Prose text={answer.answer.text} />
              {link(answer.axis)}
            </article>
          ) : (
            <p>{ui("answerPrompt")}</p>
          )}
          <h2>{ui("inspectHeading")}</h2>
          <button aria-expanded={inspect} onClick={() => setInspect(!inspect)}>
            {ui(inspect ? "collapseInspect" : "expandInspect")}
          </button>
          {inspect && (
            <section>
              <h3>{ui("axesHeading")}</h3>
              <p className="note">{ui("traitsNote")}</p>
              <dl>
                {AXES.map((a) => (
                  <div key={a}>
                    <dt>{p.axes.find((x) => x.id === a)!.displayName}</dt>
                    <dd>
                      {p.axes.find((x) => x.id === a)!.bands[band(l.scores[a])]}
                    </dd>
                  </div>
                ))}
              </dl>
              <h3>{ui("timelineHeading")}</h3>
              <button
                aria-expanded={timeline}
                onClick={() => setTimeline(!timeline)}
              >
                {ui(timeline ? "collapseTimeline" : "expandTimeline")}
              </button>
              {timeline && (
                <ol className="timeline">
                  {l.history.map((h) => {
                    const s = p.scenes.find((s) => s.id === h.stageId)!,
                      c = s.choices.find((c) => c.id === h.choiceId)!,
                      m = c.memories.find((m) => m.id === h.memoryId)!;
                    return (
                      <li key={h.stageId} id={h.stageId} tabIndex={-1}>
                        <h3>
                          {ui("ageLabel", { age: s.age })} · {s.title}
                        </h3>
                        <p>
                          {ui("chosenLabel")} · {c.label}
                        </p>
                        <h4>{ui("rememberedHeading")}</h4>
                        <Prose text={m.text} />
                        <button
                          aria-expanded={actual.includes(h.stageId)}
                          onClick={() =>
                            setActual(
                              actual.includes(h.stageId)
                                ? actual.filter((id) => id !== h.stageId)
                                : [...actual, h.stageId],
                            )
                          }
                        >
                          {ui(
                            actual.includes(h.stageId)
                              ? "hideActual"
                              : "showActual",
                          )}
                        </button>
                        {actual.includes(h.stageId) && (
                          <div>
                            <h4>{ui("outcomeHeading")}</h4>
                            <Prose text={c.outcome} />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          )}
          <button onClick={() => setDialog(true)}>{ui("anotherLife")}</button>
        </section>
      )}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {!resume &&
          (state.phase === "memory"
            ? ui("memoryAnnouncement", { age: scene.age })
            : state.phase === "ending"
              ? answer
                ? ui("answerAnnouncement") + " " + answer.label
                : ui("endingAnnouncement")
              : "")}
      </div>
      <dialog
        ref={modal}
        aria-labelledby="reset-title"
        onCancel={(e) => {
          e.preventDefault();
          setDialog(false);
        }}
      >
        <h2 id="reset-title">{ui("resetTitle")}</h2>
        <Prose text={ui("resetBody")} />
        <button autoFocus onClick={() => setDialog(false)}>
          {ui("resetCancel")}
        </button>
        <button onClick={reset}>{ui("resetConfirm")}</button>
        <button aria-label={ui("closeDialog")} onClick={() => setDialog(false)}>
          ×
        </button>
      </dialog>
    </main>
  );
}
