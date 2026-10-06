import { loadContent } from "../lib/content/load";
import Game from "../components/game/Game";
export default async function Page() {
  const pack = await loadContent();
  return pack ? (
    <Game pack={pack} />
  ) : (
    <main>
      <h1>By 28</h1>
      <pre role="status">
        [contentUnavailableTitle]{"\n"}[contentUnavailableBody]
      </pre>
    </main>
  );
}
