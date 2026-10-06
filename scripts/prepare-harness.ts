import { mkdir, writeFile } from "node:fs/promises";
import { fixture } from "../tests/fixtures/pack";
async function main() {
  await mkdir(".harness", { recursive: true });
  await writeFile(".harness/pack.json", JSON.stringify(fixture()));
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
