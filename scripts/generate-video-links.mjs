// Usage: node --env-file=.env.local scripts/generate-video-links.mjs <input.xlsx|csv> <base-url> [output.csv]
// Input needs a column "Startnr" (or "bib"), e.g. the XLSX export from the admin area.
import * as XLSX from "xlsx";
import { readFileSync, writeFileSync } from "node:fs";
import { videoLinkCode } from "../lib/videoLink.mjs";

const [inputPath, baseUrlArg, outputPath = "video-links.csv"] = process.argv.slice(2);

if (!inputPath || !baseUrlArg) {
  console.error("Usage: node --env-file=.env.local scripts/generate-video-links.mjs <input.xlsx|csv> <base-url> [output.csv]");
  process.exit(1);
}

const baseUrl = baseUrlArg.replace(/\/+$/, "");
const workbook = XLSX.read(readFileSync(inputPath), { type: "buffer" });
const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });

const lines = ["Startnr;Link"];
let skipped = 0;
for (const row of rows) {
  const bib = String(row.Startnr ?? row.startnr ?? row.bib ?? row.Bib ?? "").trim();
  if (!bib) {
    skipped += 1;
    continue;
  }
  lines.push(`${bib};${baseUrl}/videos?bib=${encodeURIComponent(bib)}&code=${videoLinkCode(bib)}`);
}

writeFileSync(outputPath, lines.join("\n") + "\n", "utf8");
console.log(`${lines.length - 1} Links geschrieben nach ${outputPath}${skipped ? ` (${skipped} Zeilen ohne Startnummer übersprungen)` : ""}`);
