# By 28

To check the real content in the production browser, run `npm run build`, then `npx playwright test --config playwright.content.config.ts`. The regular smoke suite uses the token harness.

Local Next.js App Router implementation. No game content has been generated. The supplied authored pack is installed at `content/by-28.json`.

Use Node 20.9+ and npm. Run `npm ci`, then `npm run dev`. The only public route is `/`. Without content, `npm run dev:harness` provides a twenty-choice token-only fixture life. Fixtures stay in `tests/fixtures`; the ignored `.harness/pack.json` is read only in development. Missing-content diagnostics use IDs because authored UI strings are also absent.

Run `npm run validate:content` after inserting the pack. Strict shape and semantic validation checks counts, IDs, ages, weights, tags, earlier references, axis values, and placeholders. Editorial word lengths are guidance. Positive-history checks verify earlier declared introductions and choice references; they cannot prove complete condition reachability. Validation samples 1,000 seeded lives and writes `reports/reachability.json`, labeling unobserved memories and bands as unobserved, not impossible. Sampling does not establish literary quality.

Available checks: `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e`, `npm run validate:content`, and `npm run build`. Browser tests require Chromium (`npx playwright install chromium`). Production build deliberately fails when the real authored pack is missing or invalid. Never bypass the content gate to release fixtures. After successful integration, the owner can use Vercel's ordinary Next.js workflow. No hosting commands, commits, or account connections are performed here.

All editorial prose and UI labels come from the pack and render as escaped plain text. There are no AI requests, credentials, accounts, analytics, or remote fonts. The private brief and tag definitions are client-side and are not confidential. Change `contentVersion` whenever content or scoring changes after play.

One localStorage record (`by28.save.v1`) stores version, revision, phase, and ordered scene/choice/memory IDs. Scores and tags are reconstructed by replay. Reload offers Resume and preserves committed memory screens. Unconfirmed selections and answer exploration are transient.

Progress belongs to this browser and origin. Private browsing, clearing site data, or another device may remove or hide it. Blocked storage permits in-memory play; refreshing loses progress. Corrupt or incompatible saves require explicit reset. Cross-tab changes freeze progression until reload; ordinary writes check the last-read revision. Browser storage cannot guarantee transactional protection against simultaneous writes.

Reset uses a native modal dialog and requires confirmation. No undo is supported. Conditions read pre-decision state, first matching memory wins, and history records actual deltas after clamping. Evidence links open timeline entries without suggesting scientific causation. Raw scores are never shown.

The pure engine and phase reducer are in `lib/game/engine.ts`, save handling in `lib/game/persistence.ts`, and strict validation in `lib/content/schema.ts`. The client UI is in `components/game/Game.tsx`; route and layout are small server wrappers. Native radio inputs support keyboard navigation and the modal dialog contains focus.

Framework reference: [official Next.js installation documentation](https://nextjs.org/docs/app/getting-started/installation).
