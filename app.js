const inputText = document.getElementById("inputText");
const parseBtn = document.getElementById("parseBtn");
const sampleBtn = document.getElementById("sampleBtn");
const copyJsonBtn = document.getElementById("copyJsonBtn");
const results = document.getElementById("results");

let parsedExercises = [];

sampleBtn.addEventListener("click", () => {
  inputText.value = `1) Pelvic Tilts – 2 x 10, 3-second holds
2) Bridge – 3 x 8
3) Calf Stretch – 2 x 30s each side
4) Clamshell – 2 x 12 each side
Frequency: daily`;
});

parseBtn.addEventListener("click", () => {
  parsedExercises = parseHEP(inputText.value);
  renderResults(parsedExercises);
});

copyJsonBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(JSON.stringify(parsedExercises, null, 2));
    alert("JSON copied.");
  } catch {
    alert("Could not copy JSON.");
  }
});

function parseHEP(text) {
  const lines = text
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const frequencyLine = lines.find(line => /^frequency:/i.test(line));
  const frequency = frequencyLine ? frequencyLine.replace(/^frequency:/i, "").trim() : "";

  const exerciseLines = lines.filter(line => !/^frequency:/i.test(line));

  return exerciseLines.map(line => parseLine(line, frequency));
}

function parseLine(line, frequency = "") {
  let cleaned = line
    .replace(/^\d+[\).\s-]*/, "")
    .replace(/^•\s*/, "")
    .trim();

  const dashSplit = cleaned.split(/\s+[–—-]\s+/);
  let name = cleaned;
  let details = "";

  if (dashSplit.length >= 2) {
    name = dashSplit[0].trim();
    details = dashSplit.slice(1).join(" - ").trim();
  }

  let sets = "";
  let reps = "";
  let hold = "";
  let duration = "";
  let side = "";
  let notes = details;

  const setsRepsMatch = details.match(/(\d+)\s*x\s*(\d+)/i);
  if (setsRepsMatch) {
    sets = setsRepsMatch[1];
    reps = setsRepsMatch[2];
    notes = notes.replace(setsRepsMatch[0], "").replace(/^[,\s]+|[,\s]+$/g, "");
  }

  const holdMatch = details.match(/(\d+)\s*[-]?\s*(second|seconds|sec|secs)\s*holds?/i);
  if (holdMatch) {
    hold = `${holdMatch[1]} sec`;
    notes = notes.replace(holdMatch[0], "").replace(/^[,\s]+|[,\s]+$/g, "");
  }

  const durationMatch = details.match(/(\d+)\s*(s|sec|secs|second|seconds|min|mins|minute|minutes)\b/i);
  if (durationMatch && !hold) {
    duration = `${durationMatch[1]} ${durationMatch[2]}`;
    notes = notes.replace(durationMatch[0], "").replace(/^[,\s]+|[,\s]+$/g, "");
  }

  const sideMatch = details.match(/each side|per side|each leg|each arm/i);
  if (sideMatch) {
    side = sideMatch[0];
    notes = notes.replace(sideMatch[0], "").replace(/^[,\s]+|[,\s]+$/g, "");
  }

  return {
    name,
    sets,
    reps,
    hold,
    duration,
    side,
    frequency,
    notes
  };
}

function renderResults(items) {
  if (!items.length) {
    results.innerHTML = `<p class="empty">No parsed exercises yet.</p>`;
    return;
  }

  results.innerHTML = items.map(item => `
    <div class="exercise-card">
      <div class="field"><strong>Name:</strong> ${escapeHtml(item.name || "")}</div>
      <div class="field"><strong>Sets:</strong> ${escapeHtml(item.sets || "")}</div>
      <div class="field"><strong>Reps:</strong> ${escapeHtml(item.reps || "")}</div>
      <div class="field"><strong>Hold:</strong> ${escapeHtml(item.hold || "")}</div>
      <div class="field"><strong>Duration:</strong> ${escapeHtml(item.duration || "")}</div>
      <div class="field"><strong>Side:</strong> ${escapeHtml(item.side || "")}</div>
      <div class="field"><strong>Frequency:</strong> ${escapeHtml(item.frequency || "")}</div>
      <div class="field"><strong>Notes:</strong> ${escapeHtml(item.notes || "")}</div>
    </div>
  `).join("");
}

function escapeHtml(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
