const fs = require("fs");
const path = require("path");
const transcript =
  "C:/Users/ROG Strix/.cursor/projects/f-myproject-insightapex/agent-transcripts/344f148a-3e2b-4e7f-aa8f-20008820ea3a/344f148a-3e2b-4e7f-aa8f-20008820ea3a.jsonl";
const lines = fs.readFileSync(transcript, "utf8").split(/\n/).filter(Boolean);
const wanted = [
  "admin-analytics-types.ts",
  "AdminSettingsPanel.tsx",
  "platform-settings.ts",
  "quiz-grading.ts",
  "sendPartnerInvitationEmail",
];
const found = new Map();

function walk(obj) {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) return obj.forEach(walk);
  if (obj.name === "Write" && obj.input?.path && typeof obj.input?.contents === "string") {
    const p = String(obj.input.path).replace(/\\/g, "/");
    for (const w of wanted) {
      if (p.endsWith("/" + w) || (w.includes("send") && p.includes(w))) {
        found.set(p, obj.input.contents);
      }
    }
  }
  for (const v of Object.values(obj)) walk(v);
}

for (const line of lines) {
  try {
    walk(JSON.parse(line));
  } catch {}
}

const root = "f:/myproject/insightapex/insightapex";
for (const [abs, contents] of found) {
  const idx = abs.lastIndexOf("/src/");
  if (idx < 0) continue;
  const dest = path.join(root, abs.slice(idx + 1));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, contents, "utf8");
  console.log("wrote", dest);
}
console.log("count", found.size);
