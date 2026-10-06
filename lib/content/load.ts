import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { validatePack, type Pack } from "./schema";
export async function loadContent(): Promise<Pack | null> {
  if (
    process.env.NODE_ENV === "development" &&
    process.env.BY28_HARNESS === "1"
  )
    return validatePack(
      JSON.parse(
        await readFile(join(process.cwd(), ".harness/pack.json"), "utf8"),
      ),
    );
  try {
    return validatePack(
      JSON.parse(
        await readFile(join(process.cwd(), "content/by-28.json"), "utf8"),
      ),
    );
  } catch (error) {
    console.error("content/by-28.json:", error);
    return null;
  }
}
