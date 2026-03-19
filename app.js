const patientNameEl = document.getElementById("patientName");
const recipientEmailEl = document.getElementById("recipientEmail");
const programTitleEl = document.getElementById("programTitle");
const programDateEl = document.getElementById("programDate");
const introTextEl = document.getElementById("introText");
const inputTextEl = document.getElementById("inputText");

const sampleBtn = document.getElementById("sampleBtn")
  || document.getElementById("loadSampleBtn")
  || Array.from(document.querySelectorAll("button")).find(btn => /load sample/i.test(btn.textContent || ""));
const generateBtn = document.getElementById("generateBtn")
  || document.getElementById("generateExercisesBtn")
  || Array.from(document.querySelectorAll("button")).find(btn => /generate\s+(program|exercises?)/i.test(btn.textContent || ""));
const printBtn = document.getElementById("printBtn");
const emailBtn = document.getElementById("emailBtn");
const copySummaryBtn = document.getElementById("copySummaryBtn");

const previewTitleEl = document.getElementById("previewTitle");
const previewPatientEl = document.getElementById("previewPatient");
const previewDateEl = document.getElementById("previewDate");
const previewIntroEl = document.getElementById("previewIntro");
const exerciseListEl = document.getElementById("exerciseList");
const editorListEl = document.getElementById("editorList");

let exercises = [];
let lastParsedInputText = "";
const TIME_UNIT_PATTERN = "(seconds?|secs?|minutes?|mins?|sec|min|s)";

const EXERCISE_LIBRARY = [
  {
    aliases: ["sls", "single leg stance", "single-leg stance", "single leg balance"],
    name: "Single Leg Stance",
    keyNote: "Keep your pelvis level and avoid leaning your trunk to the side.",
    instructions: [
      "Stand tall near a stable surface for support if needed.",
      "Lift one foot off the floor and balance on the other leg.",
      "Keep your posture upright and control the position without leaning."
    ],
    videos: [
      "https://www.youtube.com/watch?v=5G0fNfD8i3k",
      "https://www.youtube.com/watch?v=Zq8nRYk9QwQ",
      "https://www.youtube.com/watch?v=6Q2w8j3v9vU"
    ]
  },
  {
    aliases: ["bridge", "glute bridge", "bridging", "bridge with band"],
    name: "Bridge",
    keyNote: "Squeeze your glutes first and do not arch through your lower back.",
    instructions: [
      "Lie on your back with your knees bent and feet flat on the floor.",
      "Tighten your glutes and lift your hips until your body forms a straight line.",
      "Lower back down slowly with control."
    ],
    videos: [
      "https://www.youtube.com/watch?v=m2Zx-57cSok",
      "https://www.youtube.com/watch?v=wPM8icPu6H8",
      "https://www.youtube.com/watch?v=OUgsJ8-Vi0E"
    ]
  },
  {
    aliases: ["leg press"],
    name: "Leg Press",
    keyNote: "Keep your knees tracking in line with your toes and avoid locking them out.",
    instructions: [
      "Sit with your feet flat on the platform about hip-width apart.",
      "Press through your feet to straighten your legs in a controlled way.",
      "Return slowly to the starting position without letting the weight drop."
    ],
    videos: [
      "https://www.youtube.com/watch?v=ahaJTts1f3s",
      "https://www.youtube.com/watch?v=IZxyjW7MPJQ",
      "https://www.youtube.com/watch?v=QOVaHwm-Q6U"
    ]
  },
  {
    aliases: ["calf stretch", "gastroc stretch", "gastrocnemius stretch"],
    name: "Calf Stretch",
    keyNote: "Keep your back heel down and your rear knee straight to target the calf.",
    instructions: [
      "Stand facing a wall and place your hands on the wall for support.",
      "Step one foot back and keep that heel down on the floor.",
      "Lean forward until you feel a stretch in the calf."
    ],
    videos: [
      "https://www.youtube.com/watch?v=YfjeD4BfK7I",
      "https://www.youtube.com/watch?v=YMmgqO8Jo-k",
      "https://www.youtube.com/watch?v=8YH6x9L5hXo"
    ]
  },
  {
    aliases: ["jumping jacks", "jumping jack"],
    name: "Jumping Jacks",
    keyNote: "Land softly with knees slightly bent and keep your core braced.",
    instructions: [
      "Start standing with your feet together and arms by your sides.",
      "Jump your feet out as you raise your arms overhead.",
      "Continue at a comfortable speed and adjust the intensity as tolerated."
    ],
    videos: [
      "https://www.youtube.com/watch?v=c4DAnQ6DtF8",
      "https://www.youtube.com/watch?v=UpH7rm0cYbM",
      "https://www.youtube.com/watch?v=iSSAk4XCsRA"
    ]
  },
  {
    aliases: ["clamshell", "clam shell", "clams"],
    name: "Clamshell",
    keyNote: "Keep your feet together and avoid rolling your pelvis backward.",
    instructions: [
      "Lie on your side with your knees bent and feet together.",
      "Keep your feet touching as you lift your top knee upward.",
      "Lower slowly without rolling your pelvis backward."
    ],
    videos: [
      "https://www.youtube.com/watch?v=EG5_gXcfozw",
      "https://www.youtube.com/watch?v=o8nq7Y9xQ6k",
      "https://www.youtube.com/watch?v=4Z3xN8j9PDo"
    ]
  },
  {
    aliases: ["wall sit", "wall squat hold"],
    name: "Wall Sit",
    keyNote: "Keep your back flat on the wall and your knees over your ankles.",
    instructions: [
      "Stand with your back against a wall and step your feet slightly forward.",
      "Slide down the wall into a partial squat position.",
      "Hold the position while keeping your weight even through both feet."
    ],
    videos: [
      "https://www.youtube.com/watch?v=-cdph8hv0O0",
      "https://www.youtube.com/watch?v=y-wV4Venusw",
      "https://www.youtube.com/watch?v=MMV3v4ap1Do"
    ]
  },
  {
    aliases: ["row", "band row", "cable row", "seated row"],
    name: "Row",
    keyNote: "Keep your shoulders down and squeeze your shoulder blades together.",
    instructions: [
      "Start with your arms extended in front of you.",
      "Pull your elbows back while keeping your shoulders relaxed.",
      "Return slowly to the starting position."
    ],
    videos: [
      "https://www.youtube.com/watch?v=GZbfZ033f74",
      "https://www.youtube.com/watch?v=roCP6wCXPqo",
      "https://www.youtube.com/watch?v=vT2GjY_Umpw"
    ]
  },
  {
    aliases: ["side steps", "lateral walk", "monster walk", "band walk"],
    name: "Lateral Band Walk",
    keyNote: "Maintain tension on the band and keep your knees from collapsing inward.",
    instructions: [
      "Place the band around your legs and soften your knees slightly.",
      "Step sideways with control while keeping tension on the band.",
      "Keep your trunk steady and avoid letting your knees collapse inward."
    ],
    videos: [
      "https://www.youtube.com/watch?v=Q1eC1L3k4iY",
      "https://www.youtube.com/watch?v=2YYnK2WJtNc",
      "https://www.youtube.com/watch?v=6xwGFn-J_Q8"
    ]
  }
];

setDefaultDate();
renderEditors();
renderPreview();
bindActionButtons();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bindActionButtons, { once: true });
}

function bindActionButtons() {
  const liveGenerateBtn = document.getElementById("generateBtn") || generateBtn;
  const liveSampleBtn = document.getElementById("sampleBtn") || sampleBtn;
  const livePrintBtn = document.getElementById("printBtn") || printBtn;
  const liveEmailBtn = document.getElementById("emailBtn") || emailBtn;
  const liveCopySummaryBtn = document.getElementById("copySummaryBtn") || copySummaryBtn;

  if (liveGenerateBtn && !liveGenerateBtn.dataset.boundGenerate) {
    liveGenerateBtn.addEventListener("click", generateProgram);
    liveGenerateBtn.dataset.boundGenerate = "true";
  }
  if (liveSampleBtn && !liveSampleBtn.dataset.boundSample) {
    liveSampleBtn.addEventListener("click", () => {
      loadSample();
      generateProgram();
    });
    liveSampleBtn.dataset.boundSample = "true";
  }
  if (livePrintBtn && !livePrintBtn.dataset.boundPrint) {
    livePrintBtn.addEventListener("click", () => {
      if (!ensureProgramForActions()) return;
      window.print();
    });
    livePrintBtn.dataset.boundPrint = "true";
  }
  if (liveEmailBtn && !liveEmailBtn.dataset.boundEmail) {
    liveEmailBtn.addEventListener("click", openEmailDraft);
    liveEmailBtn.dataset.boundEmail = "true";
  }
  if (liveCopySummaryBtn && !liveCopySummaryBtn.dataset.boundCopySummary) {
    liveCopySummaryBtn.addEventListener("click", copySummary);
    liveCopySummaryBtn.dataset.boundCopySummary = "true";
  }
}

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
  inputTextEl.value = `leg press 3x10 hold 5 sec\nSLS 2x15\njumping jacks 30s different intensities\ncalf stretch 2x30s each side\nbridge with band 3x12\nFrequency: daily`;
}

function generateProgram() {
  const rawText = inputTextEl.value.trim();

  syncPreviewHeader();

  if (!rawText) {
    exercises = [];
    lastParsedInputText = "";
    renderEditors();
    renderPreview();
    return;
  }

  exercises = parseRoughInput(rawText);
  lastParsedInputText = rawText;
  renderEditors();
  renderPreview();
}

function syncPreviewHeader() {
  previewTitleEl.textContent = programTitleEl.value.trim() || "Home Exercise Program";
  previewPatientEl.textContent = `Patient: ${patientNameEl.value.trim() || "—"}`;
  previewDateEl.textContent = `Date: ${formatDate(programDateEl.value)}`;
  previewIntroEl.textContent = introTextEl.value.trim() || "Perform the following exercises as prescribed.";
}

function splitInputLines(text) {
  return String(text)
    .replace(/\r\n/g, "\n")
    .replace(/\\n/g, "\n")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);
}


function parseRoughInput(text) {
  const lines = splitInputLines(text);
  const frequencyLine = lines.find(line => /^frequency:/i.test(line));
  const frequency = frequencyLine ? frequencyLine.replace(/^frequency:/i, "").trim() : "";

  return lines
    .filter(line => !/^frequency:/i.test(line))
    .map((line, index) => buildExerciseObject(line, frequency, index));
}

function buildExerciseObject(line, frequency, index) {
  const normalizedLine = line.toLowerCase();
  const setsDurationMatch = normalizedLine.match(new RegExp(`(\\d+)\\s*x\\s*(\\d+)\\s*${TIME_UNIT_PATTERN}\\b`, "i"));
  const setsRepsMatch = normalizedLine.match(/(\d+)\s*x\s*(\d+)/i);
  const holdMatch = normalizedLine.match(new RegExp(`hold\\s*(\\d+)\\s*${TIME_UNIT_PATTERN}\\b`, "i"));
  const durationMatch = normalizedLine.match(new RegExp(`(?:^|\\s)(\\d+)\\s*${TIME_UNIT_PATTERN}\\b`, "i"));
  const sideMatch = normalizedLine.match(/each side|per side|each leg|each arm|left|right/i);
  const freqInlineMatch = normalizedLine.match(/daily|\d+\s*x\s*\/\s*week|\d+x\/week|\d+ times per week/i);

  const libraryMatch = matchExercise(normalizedLine);
  const displayName = libraryMatch?.name || titleCase(guessExerciseName(line));
  let instructions = libraryMatch?.instructions ? [...libraryMatch.instructions] : genericInstructions(displayName);

  let notes = line;
  if (setsDurationMatch) notes = removeText(notes, setsDurationMatch[0]);
  else if (setsRepsMatch) notes = removeText(notes, setsRepsMatch[0]);
  if (holdMatch) notes = removeText(notes, holdMatch[0]);
  if (sideMatch) notes = removeText(notes, sideMatch[0]);
  if (freqInlineMatch) notes = removeText(notes, freqInlineMatch[0]);

  let duration = setsDurationMatch ? `${setsDurationMatch[2]} ${normalizeTimeUnit(setsDurationMatch[3])}` : "";
  if (!duration && durationMatch) {
    const looksLikeSetsRepsDuration = setsRepsMatch && durationMatch.index !== undefined && durationMatch.index <= (setsRepsMatch.index + setsRepsMatch[0].length);
    if (!holdMatch && !looksLikeSetsRepsDuration) {
      duration = `${durationMatch[1]} ${normalizeTimeUnit(durationMatch[2])}`;
      notes = removeText(notes, durationMatch[0]);
    }
  }

  const qualifiers = extractQualifiers(line);
  if (qualifiers.length) {
    instructions = applyQualifiersToInstructions(instructions, qualifiers);
  }

  if (libraryMatch) {
    libraryMatch.aliases.forEach(alias => {
      const aliasPattern = new RegExp(`\\b${escapeRegExp(alias)}\\b`, "ig");
      notes = notes.replace(aliasPattern, " ");
    });
  }

  notes = cleanupNotes(notes);
  if (isLikelyParsingArtifact(notes)) {
    notes = "";
  }

  const normalizedNotes = normalizeNoteComparison(notes);
  const normalizedDisplayName = normalizeNoteComparison(displayName);
  const looksLikeNameOnly = normalizedNotes && normalizedDisplayName && normalizedNotes === normalizedDisplayName;
  const looksLikeAliasOnly = libraryMatch?.aliases?.some(alias => normalizeNoteComparison(alias) === normalizedNotes);

  if ((!notes || looksLikeNameOnly || looksLikeAliasOnly) && libraryMatch?.keyNote) {
    notes = libraryMatch.keyNote;
  }

  const looksLikeNameOnly = notes && displayName && notes.toLowerCase() === displayName.toLowerCase();
  if ((!notes || looksLikeNameOnly) && libraryMatch?.keyNote) {
    notes = libraryMatch.keyNote;
  }

  return {
    id: `ex-${index}-${Date.now()}`,
    raw_input: line,
    display_name: displayName,
    sets: setsDurationMatch ? setsDurationMatch[1] : (setsRepsMatch ? setsRepsMatch[1] : ""),
    reps: setsDurationMatch ? "" : (setsRepsMatch ? setsRepsMatch[2] : ""),
    duration,
    hold: holdMatch ? `${holdMatch[1]} ${normalizeTimeUnit(holdMatch[2])}` : "",
    side: sideMatch ? sideMatch[0] : "",
    frequency: freqInlineMatch ? freqInlineMatch[0] : frequency,
    instructions,
    notes,
    video_links: libraryMatch?.videos ? [...libraryMatch.videos] : []
  };
}

function matchExercise(line) {
  return EXERCISE_LIBRARY.find(item => item.aliases.some(alias => {
    const normalizedAlias = escapeRegExp(alias.toLowerCase()).replace(/\s+/g, "\\s+");
    const aliasPattern = new RegExp(`(^|\\b)${normalizedAlias}(\\b|$)`, "i");
    return aliasPattern.test(line);
  }));
}

function guessExerciseName(line) {
  let name = line
    .replace(/^\d+[\).\s-]*/, "")
    .replace(/(\d+)\s*x\s*(\d+)/ig, "")
    .replace(new RegExp(`hold\\s*\\d+\\s*${TIME_UNIT_PATTERN}\\b`, "ig"), "")
    .replace(new RegExp(`\\b\\d+\\s*${TIME_UNIT_PATTERN}\\b`, "ig"), "")
    .replace(/each side|per side|each leg|each arm|left|right|daily|\d+x\/week/ig, "")
    .trim();

  if (!name) return "Exercise";
  return name;
}

function extractQualifiers(line) {
  const qualifiers = [];
  const lower = line.toLowerCase();
  ["with band", "slow", "different intensities", "modified", "on knees", "pain-free range"].forEach(q => {
    if (lower.includes(q)) qualifiers.push(q);
  });
  return qualifiers;
}

function applyQualifiersToInstructions(instructions, qualifiers) {
  const updated = [...instructions];

  if (qualifiers.includes("with band")) {
    updated[0] = updated[0].replace(/\.$/, "") + " with the band in place.";
  }
  if (qualifiers.includes("slow")) {
    updated[updated.length - 1] = "Move slowly and stay controlled throughout each repetition.";
  }
  if (qualifiers.includes("different intensities")) {
    updated[updated.length - 1] = "Adjust the speed or intensity to match your tolerance."
  }
  if (qualifiers.includes("modified")) {
    updated.push("Use the modified version shown by your physiotherapist.");
  }
  if (qualifiers.includes("on knees")) {
    updated.push("Use the knees-down variation if prescribed.");
  }
  if (qualifiers.includes("pain-free range")) {
    updated.push("Stay within a comfortable pain-free range.");
  }

  return updated.slice(0, 4);
}

function genericInstructions(name) {
  return [
    `Set up for ${name.toLowerCase()} as shown by your physiotherapist.`,
    "Perform the movement in a slow and controlled way.",
    "Stay within a comfortable range and stop if symptoms significantly worsen."
  ];
}

function normalizeTimeUnit(unit) {
  const value = unit.toLowerCase();
  if (["s", "sec", "secs", "second", "seconds"].includes(value)) return "sec";
  if (["min", "mins", "minute", "minutes"].includes(value)) return "min";
  return unit;
}

function removeText(base, fragment) {
  return base.replace(new RegExp(escapeRegExp(fragment), "ig"), " ");
}

function cleanupNotes(text) {
  return text
    .replace(/\b(?:ec|sc)\b/ig, " ")
    .replace(/\s+/g, " ")
    .replace(/^[,;:\-\s]+|[,;:\-\s]+$/g, "")
    .trim();
}

function normalizeNoteComparison(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function isLikelyParsingArtifact(text) {
  const normalized = normalizeNoteComparison(text);
  if (!normalized) return false;
  if (normalized.length > 3) return false;
  return /^[secmin]+$/.test(normalized);
}

function renderEditors() {
  if (!exercises.length) {
    editorListEl.innerHTML = `<p class="empty">Generate a program to review editable exercise cards.</p>`;
    return;
  }

  editorListEl.innerHTML = exercises.map((exercise, index) => `
    <article class="editor-card" data-id="${exercise.id}">
      <div class="editor-header">
        <div>
          <h3>${index + 1}. ${escapeHtml(exercise.display_name)}</h3>
          <span class="raw-chip">Raw input: ${escapeHtml(exercise.raw_input)}</span>
        </div>
      </div>

      <div class="grid two-col">
        <div>
          <label class="small-label">Display name</label>
          <input data-field="display_name" value="${escapeAttribute(exercise.display_name)}" />
        </div>
        <div>
          <label class="small-label">Frequency</label>
          <input data-field="frequency" value="${escapeAttribute(exercise.frequency)}" />
        </div>
      </div>

      <div class="grid three-col">
        <div>
          <label class="small-label">Sets</label>
          <input data-field="sets" value="${escapeAttribute(exercise.sets)}" />
        </div>
        <div>
          <label class="small-label">Reps</label>
          <input data-field="reps" value="${escapeAttribute(exercise.reps)}" />
        </div>
        <div>
          <label class="small-label">Duration</label>
          <input data-field="duration" value="${escapeAttribute(exercise.duration)}" />
        </div>
        <div>
          <label class="small-label">Hold</label>
          <input data-field="hold" value="${escapeAttribute(exercise.hold)}" />
        </div>
        <div>
          <label class="small-label">Side</label>
          <input data-field="side" value="${escapeAttribute(exercise.side)}" />
        </div>
        <div>
          <label class="small-label">Notes</label>
          <input data-field="notes" value="${escapeAttribute(exercise.notes)}" />
        </div>
      </div>

      <div class="field-block">
        <label class="small-label">Instructions (one per line)</label>
        <textarea data-field="instructions" rows="4">${escapeHtml(exercise.instructions.join("\n"))}</textarea>
      </div>

      <div class="field-block">
        <label class="small-label">Instructional videos (one URL per line)</label>
        <textarea data-field="video_links" rows="3">${escapeHtml((exercise.video_links || []).join("\n"))}</textarea>
      </div>
    </article>
  `).join("");

  editorListEl.querySelectorAll("input, textarea").forEach(field => {
    field.addEventListener("input", handleEditorChange);
  });
}

function handleEditorChange(event) {
  const card = event.target.closest(".editor-card");
  const id = card.dataset.id;
  const field = event.target.dataset.field;
  const exercise = exercises.find(item => item.id === id);
  if (!exercise) return;

  if (field === "instructions") {
    exercise.instructions = splitInputLines(event.target.value);
  } else if (field === "video_links") {
    exercise.video_links = splitInputLines(event.target.value);
  } else {
    exercise[field] = event.target.value;
  }

  renderPreview();
}

function renderPreview() {
  syncPreviewHeader();

  if (!exercises.length) {
    exerciseListEl.innerHTML = `<p class="empty">Generate a program to see the patient-ready preview.</p>`;
    return;
  }

  exerciseListEl.innerHTML = exercises.map((exercise, index) => {
    const dose = buildDoseString(exercise);
    const notes = exercise.notes ? `<div class="note-box"><strong>Notes:</strong> ${escapeHtml(exercise.notes)}</div>` : "";
    const instructions = exercise.instructions.length
      ? `<ol class="instructions-list">${exercise.instructions.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ol>`
      : "";
    const videos = (exercise.video_links || []).length
      ? `<div class="video-links"><strong>Instructional videos:</strong><ul>${exercise.video_links.map((url, i) => `<li><a href="${escapeAttribute(url)}" target="_blank" rel="noopener noreferrer">Option ${i + 1}</a></li>`).join("")}</ul></div>`
      : "";

    return `
      <article class="exercise-card">
        <div class="exercise-top">
          <p class="exercise-name">${index + 1}. ${escapeHtml(exercise.display_name || "Exercise")}</p>
          <div class="exercise-dose">${escapeHtml(dose)}</div>
        </div>
        ${instructions}
        ${videos}
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

function ensureProgramForActions() {
  const rawText = inputTextEl.value.trim();
  if (!exercises.length || rawText !== lastParsedInputText) {
    generateProgram();
  }
  if (!exercises.length) {
    alert("Add at least one exercise before printing, emailing, or copying the summary.");
    return false;
  }

  renderPreview();
  return true;
}

function openEmailDraft() {
  if (!ensureProgramForActions()) return;

  const recipient = recipientEmailEl.value.trim();
  if (!recipient) {
    alert("Enter a recipient email first.");
    return;
  }

  const subject = `${programTitleEl.value.trim() || "Home Exercise Program"} - ${formatDate(programDateEl.value)}`;
  const body = buildSummaryText(true);
  window.location.href = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

async function copySummary() {
  if (!ensureProgramForActions()) return;

  try {
    await navigator.clipboard.writeText(buildSummaryText(false));
    alert("Program summary copied.");
  } catch {
    alert("Could not copy summary.");
  }
}

function buildSummaryText(forEmail) {
  const patient = patientNameEl.value.trim() || "Patient";
  const title = programTitleEl.value.trim() || "Home Exercise Program";
  const date = formatDate(programDateEl.value);
  const lines = [];

  if (forEmail) lines.push(`Hello ${patient},`, "");
  lines.push(title, `Patient: ${patient}`, `Date: ${date}`, "", "Instructions:", introTextEl.value.trim(), "", "Exercises:");

  exercises.forEach((exercise, index) => {
    lines.push(`${index + 1}. ${exercise.display_name}${buildDoseString(exercise) ? " — " + buildDoseString(exercise) : ""}`);
    exercise.instructions.forEach(step => lines.push(`   - ${step}`));
    if ((exercise.video_links || []).length) {
      lines.push("   - Instructional videos:");
      exercise.video_links.forEach((url, idx) => lines.push(`      ${idx + 1}) ${url}`));
    }
    if (exercise.notes) lines.push(`   - Notes: ${exercise.notes}`);
  });

  if (forEmail) lines.push("", "Please reply if you have any questions.");
  return lines.join("\n");
}

function formatDate(value) {
  if (!value) return "—";
  const [yyyy, mm, dd] = value.split("-");
  return `${yyyy}-${mm}-${dd}`;
}

function titleCase(str) {
  return str.replace(/\w\S*/g, word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(str) {
  return escapeHtml(String(str ?? ""));
}
