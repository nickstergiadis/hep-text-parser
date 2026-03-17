const patientNameEl = document.getElementById("patientName");
const recipientEmailEl = document.getElementById("recipientEmail");
const programTitleEl = document.getElementById("programTitle");
const programDateEl = document.getElementById("programDate");
const introTextEl = document.getElementById("introText");
const inputTextEl = document.getElementById("inputText");

const sampleBtn = document.getElementById("sampleBtn");
const generateBtn = document.getElementById("generateBtn");
const printBtn = document.getElementById("printBtn");
const emailBtn = document.getElementById("emailBtn");
const copySummaryBtn = document.getElementById("copySummaryBtn");

const editorListEl = document.getElementById("editorList");
const previewTitleEl = document.getElementById("previewTitle");
const previewPatientEl = document.getElementById("previewPatient");
const previewDateEl = document.getElementById("previewDate");
const previewIntroEl = document.getElementById("previewIntro");
const exerciseListEl = document.getElementById("exerciseList");

let parsedExercises = [];

const exerciseLibrary = [
  {
    keys: ["pelvic tilt", "pelvic tilts"],
    display: "Pelvic Tilts",
    instructions: [
      "Lie on your back with your knees bent and feet flat.",
      "Gently tilt your pelvis to flatten your low back toward the floor.",
      "Return to neutral in a slow, controlled way."
    ]
  },
  {
    keys: ["bridge", "glute bridge"],
    display: "Bridge",
    instructions: [
      "Lie on your back with your knees bent and feet flat.",
      "Tighten your glutes and lift your hips up in a controlled motion.",
      "Pause briefly, then slowly lower back down."
    ]
  },
  {
    keys: ["calf stretch", "gastroc stretch", "wall calf stretch"],
    display: "Calf Stretch",
    instructions: [
      "Stand facing a wall and place your hands on the wall for support.",
      "Step one leg back and keep the heel down.",
      "Lean forward until you feel a stretch in the calf."
    ]
  },
  {
    keys: ["clamshell", "clam shell"],
    display: "Clamshell",
    instructions: [
      "Lie on your side with your knees bent and feet together.",
      "Keep your feet touching as you lift the top knee upward.",
      "Lower the knee back down with control without rolling your trunk backward."
    ]
  },
  {
    keys: ["sls", "single leg stance", "single-leg stance"],
    display: "Single Leg Stance",
    instructions: [
      "Stand tall near a stable support if needed.",
      "Lift one foot off the ground and balance on the other leg.",
      "Keep your posture upright and maintain control throughout the hold or repetitions."
    ]
  },
  {
    keys: ["leg press"],
    display: "Leg Press",
    instructions: [
      "Place your feet on the platform about hip-width apart.",
      "Press through your feet to straighten your legs in a controlled manner.",
      "Slowly return to the starting position without letting the movement snap back."
    ]
  },
  {
    keys: ["jumping jacks", "jumping jack"],
    display: "Jumping Jacks",
    instructions: [
      "Start standing with your feet together and arms by your sides.",
      "Jump your feet out while raising your arms overhead.",
      "Continue at the prescribed pace and intensity, then return to the starting position."
    ]
  },
  {
    keys: ["wall sit", "wall squat hold"],
    display: "Wall Sit",
    instructions: [
      "Stand with your back against a wall and slide down into a partial squat.",
      "Keep your feet planted and your trunk supported by the wall.",
      "Hold the position as prescribed, then stand back up with control."
    ]
  },
  {
    keys: ["side steps", "band walks", "lateral band walk", "monster walk"],
    display: "Side Steps with Band",
    instructions: [
      "Place the band around your legs as instructed and slightly bend your knees.",
      "Step sideways while keeping steady tension on the band.",
      "Stay controlled and avoid letting your knees collapse inward."
    ]
  }
];

setDefaultDate();

sampleBtn.addEventListener("click", loadSample);
generateBtn.addEventListener("click", generateProgram);
printBtn.addEventListener("click", () => {
  generateProgram();
  window.print();
});
emailBtn.addEventListener("click", openEmailDraft);
copySummaryBtn.addEventListener("click", copySummary);
editorListEl.addEventListener("input", handleEditorChange);

function setDefaultDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  programDateEl.value = `${yyyy}-${mm}-${dd}`;
}

function loadSample() {
  patientNameEl.value = "Sample Patient";
  recipientEmailEl.value = "patient@example.com";
  programTitleEl.value = "Home Exercise Program";
  introTextEl.value = "Perform the following exercises as prescribed. Use controlled movement and stop if symptoms significantly worsen.";
  inputTextEl.value = `1) Pelvic Tilts – 2 x 10, 3-second holds\n2) Bridge – 3 x 8\n3) Calf Stretch – 2 x 30s each side\n4) Clamshell – 2 x 12 each side\nFrequency: daily`;
  generateProgram();
}

function generateProgram() {
  const rawText = inputTextEl.value.trim();
  if (!rawText) {
    editorListEl.innerHTML = `<p class="empty">Paste HEP text first.</p>`;
    exerciseListEl.innerHTML = `<p class="empty">Paste HEP text first.</p>`;
    return;
  }

  parsedExercises = parseHEP(rawText);
  renderEditors();
  renderPreview();
}

function parseHEP(text) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const frequencyLine = lines.find((line) => /^frequency:/i.test(line));
  const frequency = frequencyLine ? frequencyLine.replace(/^frequency:/i, "").trim() : "";
  const exerciseLines = lines.filter((line) => !/^frequency:/i.test(line));

  return exerciseLines
    .map((line) => parseLine(line, frequency))
    .filter((item) => item.name);
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

  const setsDurationMatch = details.match(/(\d+)\s*x\s*(\d+)\s*(s|sec|secs|second|seconds|min|mins|minute|minutes)\b/i);
  if (setsDurationMatch) {
    sets = setsDurationMatch[1];
    duration = `${setsDurationMatch[2]} ${normalizeTimeUnit(setsDurationMatch[3])}`;
    notes = removeText(notes, setsDurationMatch[0]);
  } else {
    const setsRepsMatch = details.match(/(\d+)\s*x\s*(\d+)/i);
    if (setsRepsMatch) {
      sets = setsRepsMatch[1];
      reps = setsRepsMatch[2];
      notes = removeText(notes, setsRepsMatch[0]);
    }
  }

  const holdMatch = details.match(/(?:hold\s*)?(\d+)\s*[-]?\s*(second|seconds|sec|secs)\s*holds?/i) || details.match(/hold\s*(\d+)\s*[-]?\s*(second|seconds|sec|secs)/i);
  if (holdMatch) {
    hold = `${holdMatch[1]} sec`;
    notes = removeText(notes, holdMatch[0]);
  }

  const bareDurationMatch = !duration ? details.match(/(\d+)\s*(s|sec|secs|second|seconds|min|mins|minute|minutes)\b/i) : null;
  if (bareDurationMatch) {
    duration = `${bareDurationMatch[1]} ${normalizeTimeUnit(bareDurationMatch[2])}`;
    notes = removeText(notes, bareDurationMatch[0]);
  }

  const sideMatch = details.match(/each side|per side|each leg|each arm|each way/i);
  if (sideMatch) {
    side = sideMatch[0];
    notes = removeText(notes, sideMatch[0]);
  }

  const match = findExerciseMatch(name);
  const displayName = match ? match.display : toTitleCase(name);
  const instructions = match ? [...match.instructions] : genericInstructions(displayName);

  notes = notes.replace(/^,+|,+$/g, "").trim();

  return {
    raw_input: line,
    name: displayName,
    sets,
    reps,
    hold,
    duration,
    side,
    frequency,
    notes,
    instructions
  };
}

function findExerciseMatch(name) {
  const lower = name.toLowerCase();
  return exerciseLibrary.find((item) => item.keys.some((key) => lower.includes(key)));
}

function genericInstructions(displayName) {
  return [
    `Set up for ${displayName.toLowerCase()} in a stable and comfortable position.`,
    "Perform the movement in a slow, controlled manner.",
    "Stay within a comfortable range and use the prescribed dosage."
  ];
}

function renderEditors() {
  if (!parsedExercises.length) {
    editorListEl.innerHTML = `<p class="empty">No exercises to edit.</p>`;
    return;
  }

  editorListEl.innerHTML = parsedExercises.map((exercise, index) => `
    <div class="editor-card" data-index="${index}">
      <div class="editor-grid">
        <div>
          <div class="editor-label">Exercise name</div>
          <input data-field="name" value="${escapeAttr(exercise.name)}" />
        </div>
        <div>
          <div class="editor-label">Sets</div>
          <input data-field="sets" value="${escapeAttr(exercise.sets)}" />
        </div>
        <div>
          <div class="editor-label">Reps</div>
          <input data-field="reps" value="${escapeAttr(exercise.reps)}" />
        </div>
        <div>
          <div class="editor-label">Duration / Hold</div>
          <input data-field="durationHold" value="${escapeAttr(joinDurationHold(exercise))}" />
        </div>
      </div>
      <div class="editor-subgrid">
        <div>
          <div class="editor-label">Side / Frequency</div>
          <input data-field="sideFrequency" value="${escapeAttr(joinSideFrequency(exercise))}" />
        </div>
        <div>
          <div class="editor-label">Notes</div>
          <input data-field="notes" value="${escapeAttr(exercise.notes)}" />
        </div>
      </div>
      <div style="margin-top:10px;">
        <div class="editor-label">Instructions (one per line)</div>
        <textarea data-field="instructions">${escapeHtml(exercise.instructions.join("\n"))}</textarea>
      </div>
    </div>
  `).join("");
}

function handleEditorChange(event) {
  const target = event.target;
  const card = target.closest(".editor-card");
  if (!card) return;
  const index = Number(card.dataset.index);
  const field = target.dataset.field;
  if (Number.isNaN(index) || !field) return;

  const ex = parsedExercises[index];
  const value = target.value;

  if (field === "name") ex.name = value;
  if (field === "sets") ex.sets = value;
  if (field === "reps") ex.reps = value;
  if (field === "notes") ex.notes = value;
  if (field === "instructions") ex.instructions = value.split("\n").map(s => s.trim()).filter(Boolean);
  if (field === "durationHold") {
    ex.duration = "";
    ex.hold = "";
    const holdMatch = value.match(/hold\s*:?\s*(.+)$/i);
    if (holdMatch) {
      ex.hold = holdMatch[1].trim();
    } else if (/sec|min|second|minute/i.test(value)) {
      ex.duration = value.trim();
    }
  }
  if (field === "sideFrequency") {
    ex.side = "";
    ex.frequency = "";
    const parts = value.split(",").map(s => s.trim()).filter(Boolean);
    if (parts[0]) ex.side = parts[0];
    if (parts[1]) ex.frequency = parts[1];
    if (parts.length === 1 && /(daily|week|x\/)/i.test(parts[0])) {
      ex.frequency = parts[0];
      ex.side = "";
    }
  }

  renderPreview();
}

function renderPreview() {
  const title = programTitleEl.value.trim() || "Home Exercise Program";
  const patient = patientNameEl.value.trim() || "—";
  const date = formatDate(programDateEl.value);
  const intro = introTextEl.value.trim() || "Perform the following exercises as prescribed.";

  previewTitleEl.textContent = title;
  previewPatientEl.textContent = `Patient: ${patient}`;
  previewDateEl.textContent = `Date: ${date}`;
  previewIntroEl.textContent = intro;

  if (!parsedExercises.length) {
    exerciseListEl.innerHTML = `<p class="empty">No exercises could be generated.</p>`;
    return;
  }

  exerciseListEl.innerHTML = parsedExercises.map((exercise, index) => {
    const dose = buildDoseString(exercise);
    const notes = exercise.notes ? `<p class="exercise-notes"><strong>Notes:</strong> ${escapeHtml(exercise.notes)}</p>` : "";
    const instructions = exercise.instructions?.length ? `
      <ol class="instruction-list">
        ${exercise.instructions.map(item => `<li>${escapeHtml(item)}</li>`).join("")}
      </ol>` : "";

    return `
      <article class="exercise-card">
        <div class="exercise-top">
          <div>
            <p class="exercise-name">${index + 1}. ${escapeHtml(exercise.name || "Exercise")}</p>
          </div>
          <div class="exercise-dose">${escapeHtml(dose || "")}</div>
        </div>
        ${instructions}
        ${notes}
      </article>
    `;
  }).join("");
}

function buildDoseString(exercise) {
  const parts = [];
  if (exercise.sets && exercise.reps) parts.push(`${exercise.sets} sets x ${exercise.reps} reps`);
  else if (exercise.sets && exercise.duration) parts.push(`${exercise.sets} sets x ${exercise.duration}`);
  else if (exercise.duration) parts.push(exercise.duration);
  if (exercise.hold) parts.push(`${exercise.hold} hold`);
  if (exercise.side) parts.push(exercise.side);
  if (exercise.frequency) parts.push(exercise.frequency);
  return parts.join(" • ");
}

async function copySummary() {
  generateProgram();
  const summary = buildProgramSummary();
  try {
    await navigator.clipboard.writeText(summary);
    alert("Program summary copied.");
  } catch {
    alert("Could not copy summary.");
  }
}

function openEmailDraft() {
  generateProgram();
  const recipient = recipientEmailEl.value.trim();
  if (!recipient) {
    alert("Enter a recipient email first.");
    return;
  }
  const title = programTitleEl.value.trim() || "Home Exercise Program";
  const date = formatDate(programDateEl.value);
  const body = buildProgramSummary(true);
  const subject = `${title} - ${date}`;
  const mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailtoUrl;
}

function buildProgramSummary(includeGreeting = false) {
  const title = programTitleEl.value.trim() || "Home Exercise Program";
  const patient = patientNameEl.value.trim() || "Patient";
  const date = formatDate(programDateEl.value);
  const intro = introTextEl.value.trim() || "Perform the following exercises as prescribed.";

  const lines = [];
  if (includeGreeting) lines.push(`Hello ${patient},`, "");
  lines.push(title, `Patient: ${patient}`, `Date: ${date}`, "", "Instructions:", intro, "", "Exercises:");

  parsedExercises.forEach((exercise, index) => {
    lines.push(`${index + 1}. ${exercise.name}`);
    const dose = buildDoseString(exercise);
    if (dose) lines.push(`Dosage: ${dose}`);
    if (exercise.instructions?.length) {
      lines.push("How to do it:");
      exercise.instructions.forEach(step => lines.push(`- ${step}`));
    }
    if (exercise.notes) lines.push(`Notes: ${exercise.notes}`);
    lines.push("");
  });

  if (includeGreeting) lines.push("Please reply if you have any questions.");
  return lines.join("\n");
}

function normalizeTimeUnit(unit) {
  const value = unit.toLowerCase();
  if (["s", "sec", "secs", "second", "seconds"].includes(value)) return "sec";
  if (["min", "mins", "minute", "minutes"].includes(value)) return "min";
  return unit;
}

function removeText(base, fragment) {
  return base.replace(fragment, "").replace(/^[,\s]+|[,\s]+$/g, "").trim();
}

function formatDate(value) {
  if (!value) return "—";
  const [yyyy, mm, dd] = value.split("-");
  return `${yyyy}-${mm}-${dd}`;
}

function toTitleCase(str) {
  return String(str).toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function joinDurationHold(exercise) {
  if (exercise.hold) return `hold: ${exercise.hold}`;
  return exercise.duration || "";
}

function joinSideFrequency(exercise) {
  return [exercise.side, exercise.frequency].filter(Boolean).join(", ");
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
