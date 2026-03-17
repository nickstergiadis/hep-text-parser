const els = {
  patientName: document.getElementById("patientName"),
  recipientEmail: document.getElementById("recipientEmail"),
  programTitle: document.getElementById("programTitle"),
  programDate: document.getElementById("programDate"),
  introText: document.getElementById("introText"),
  inputText: document.getElementById("inputText"),
  sampleBtn: document.getElementById("sampleBtn"),
  generateBtn: document.getElementById("generateBtn"),
  printBtn: document.getElementById("printBtn"),
  emailBtn: document.getElementById("emailBtn"),
  copySummaryBtn: document.getElementById("copySummaryBtn"),
  editorList: document.getElementById("editorList"),
  previewTitle: document.getElementById("previewTitle"),
  previewPatient: document.getElementById("previewPatient"),
  previewDate: document.getElementById("previewDate"),
  previewIntro: document.getElementById("previewIntro"),
  previewList: document.getElementById("previewList")
};

let exercises = [];

const EXERCISE_LIBRARY = [
  {
    key: "leg press",
    aliases: ["leg press", "lp"],
    displayName: "Leg Press",
    instructions: [
      "Sit with your feet flat on the platform about hip-width apart.",
      "Press through your feet to straighten your legs in a controlled way.",
      "Return slowly to the starting position without letting the weight drop."
    ]
  },
  {
    key: "single leg stance",
    aliases: ["sls", "single leg stance", "single leg stand", "single leg balance"],
    displayName: "Single Leg Stance",
    instructions: [
      "Stand tall near a stable surface for support if needed.",
      "Lift one foot off the floor and balance on the other leg.",
      "Keep your posture upright and control the position without leaning."
    ]
  },
  {
    key: "jumping jacks",
    aliases: ["jumping jacks", "jumping jack", "star jumps"],
    displayName: "Jumping Jacks",
    instructions: [
      "Start standing tall with your arms at your sides and feet together.",
      "Jump your feet out to the sides while raising your arms overhead.",
      "Continue at the prescribed pace and adjust intensity as tolerated."
    ]
  },
  {
    key: "calf stretch",
    aliases: ["calf stretch", "gastroc stretch", "wall calf stretch"],
    displayName: "Calf Stretch",
    instructions: [
      "Stand facing a wall and place your hands on the wall for support.",
      "Step one leg back and keep the heel down with the knee straight.",
      "Lean forward until you feel a gentle stretch in the calf."
    ]
  },
  {
    key: "bridge",
    aliases: ["bridge", "glute bridge", "bridging"],
    displayName: "Bridge",
    instructions: [
      "Lie on your back with your knees bent and feet flat on the floor.",
      "Tighten your glutes and lift your hips until your body forms a straight line.",
      "Lower back down slowly with control."
    ]
  },
  {
    key: "clamshell",
    aliases: ["clamshell", "clam", "clam shell"],
    displayName: "Clamshell",
    instructions: [
      "Lie on your side with your knees bent and feet together.",
      "Keep your feet touching and lift the top knee without rolling your hips back.",
      "Lower the knee slowly and stay in control throughout."
    ]
  }
];

setDefaultDate();

els.sampleBtn.addEventListener("click", loadSample);
els.generateBtn.addEventListener("click", generateProgram);
els.printBtn.addEventListener("click", () => {
  syncFromEditors();
  renderPreview();
  window.print();
});
els.emailBtn.addEventListener("click", openEmailDraft);
els.copySummaryBtn.addEventListener("click", copySummary);

function setDefaultDate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  els.programDate.value = `${yyyy}-${mm}-${dd}`;
}

function loadSample() {
  els.patientName.value = "Sample Patient";
  els.recipientEmail.value = "patient@example.com";
  els.programTitle.value = "Home Exercise Program";
  els.introText.value = "Perform the following exercises as prescribed. Use controlled movement and stop if symptoms significantly worsen.";
  els.inputText.value = `leg press 3x10 hold 5 sec
SLS 2x15
jumping jacks 30s different intensities
calf stretch 2x30s each side
bridge with band 3x12
Frequency: daily`;
  generateProgram();
}

function generateProgram() {
  exercises = parseInput(els.inputText.value);
  renderEditors();
  renderPreview();
}

function parseInput(text) {
  const lines = text.split("\n").map(x => x.trim()).filter(Boolean);
  const frequencyLine = lines.find(line => /^frequency\s*:/i.test(line));
  const globalFrequency = frequencyLine ? lineValueAfterColon(frequencyLine) : "";
  const exerciseLines = lines.filter(line => !/^frequency\s*:/i.test(line));

  return exerciseLines.map((raw) => buildExercise(raw, globalFrequency));
}

function lineValueAfterColon(line) {
  return line.split(":").slice(1).join(":").trim();
}

function buildExercise(raw, globalFrequency) {
  let working = normalizeSpaces(raw.toLowerCase());

  const detected = findExercise(working);
  let displayName = detected ? detected.displayName : titleCase(cleanBaseName(working));
  let instructions = detected ? [...detected.instructions] : genericInstructions(displayName);

  const setsReps = working.match(/(\d+)\s*x\s*(\d+)(?!\s*(s|sec|secs|second|seconds|min|mins|minute|minutes))/i);
  const setsDuration = working.match(/(\d+)\s*x\s*(\d+)\s*(s|sec|secs|second|seconds|min|mins|minute|minutes)\b/i);
  let sets = "", reps = "", duration = "";

  if (setsDuration) {
    sets = setsDuration[1];
    duration = `${setsDuration[2]} ${normalizeTimeUnit(setsDuration[3])}`;
    working = removeFragment(working, setsDuration[0]);
  } else if (setsReps) {
    sets = setsReps[1];
    reps = setsReps[2];
    working = removeFragment(working, setsReps[0]);
  }

  const holdMatch = working.match(/hold\s*(for\s*)?(\d+)\s*(s|sec|secs|second|seconds|min|mins|minute|minutes)\b/i);
  let hold = "";
  if (holdMatch) {
    hold = `${holdMatch[2]} ${normalizeTimeUnit(holdMatch[3])}`;
    working = removeFragment(working, holdMatch[0]);
  }

  const standAloneDurationMatch = !duration ? working.match(/(?<!x\s)(\d+)\s*(s|sec|secs|second|seconds|min|mins|minute|minutes)\b/i) : null;
  if (standAloneDurationMatch) {
    duration = `${standAloneDurationMatch[1]} ${normalizeTimeUnit(standAloneDurationMatch[2])}`;
    working = removeFragment(working, standAloneDurationMatch[0]);
  }

  let side = "";
  const sideMatch = working.match(/each side|per side|each leg|each arm|left|right/i);
  if (sideMatch) {
    side = sideMatch[0];
    working = removeFragment(working, sideMatch[0]);
  }

  let frequency = globalFrequency;
  const inlineFreq = working.match(/\b(daily|every day|3x\/week|2x\/week|weekly)\b/i);
  if (inlineFreq) {
    frequency = inlineFreq[0];
    working = removeFragment(working, inlineFreq[0]);
  }

  const modifiers = [];
  if (/\bwith band\b|\bbanded\b|\bband\b/i.test(working) || /\bwith band\b|\bbanded\b|\bband\b/i.test(raw)) {
    if (/bridge/i.test(displayName)) {
      displayName = "Bridge with Band";
      instructions = [
        "Lie on your back with your knees bent and feet flat on the floor with the band in place.",
        "Press your knees gently out into the band and lift your hips until your body forms a straight line.",
        "Lower back down slowly with control."
      ];
    }
    modifiers.push("with band");
    working = removeFragment(working, "with band");
    working = removeFragment(working, "banded");
    working = removeFragment(working, "band");
  }

  if (/\bdifferent intensit/i.test(raw)) {
    modifiers.push("different intensities");
    working = working.replace(/\bdifferent intensit(?:y|ies)\b/gi, " ");
  }

  if (/\becc?\b|\beccentric\b/i.test(raw)) {
    modifiers.push("eccentric emphasis");
    working = working.replace(/\beccentric\b|\becc\b/gi, " ");
  }

  // Remove detected exercise aliases from residue.
  if (detected) {
    for (const alias of detected.aliases.sort((a, b) => b.length - a.length)) {
      working = removeFragment(working, alias);
    }
  }

  // Clean low-value residue/junk.
  working = working
    .replace(/\bhold\b/gi, " ")
    .replace(/\bfor\b/gi, " ")
    .replace(/[–—-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  let notes = normalizeNotes(working, modifiers, displayName);

  return {
    rawInput: raw,
    displayName,
    sets,
    reps,
    duration,
    hold,
    side,
    frequency,
    notes,
    instructions
  };
}

function normalizeNotes(residue, modifiers, displayName) {
  let text = residue || "";
  const displayWords = displayName.toLowerCase().split(/\s+/);
  displayWords.forEach(word => {
    if (word.length > 2) {
      text = text.replace(new RegExp(`\\b${escapeRegExp(word)}\\b`, "gi"), " ");
    }
  });

  text = text
    .replace(/\bec\b/gi, " ")
    .replace(/\bx\b/gi, " ")
    .replace(/\bsec\b|\bmin\b/gi, " ")
    .replace(/\d+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const parts = [];
  modifiers.forEach(m => {
    if (!parts.includes(m)) parts.push(m);
  });

  if (text && text.length > 1) {
    parts.push(text);
  }

  return parts.join(" • ");
}

function findExercise(text) {
  let best = null;
  let bestLen = 0;
  for (const item of EXERCISE_LIBRARY) {
    for (const alias of item.aliases) {
      const rx = new RegExp(`\\b${escapeRegExp(alias)}\\b`, "i");
      if (rx.test(text) && alias.length > bestLen) {
        best = item;
        bestLen = alias.length;
      }
    }
  }
  return best;
}

function cleanBaseName(text) {
  return normalizeSpaces(
    text
      .replace(/\d+/g, " ")
      .replace(/\bhold\b|\bfor\b|\beach side\b|\bper side\b|\beach leg\b|\beach arm\b|\bdaily\b|\bevery day\b/gi, " ")
      .replace(/\b(s|sec|secs|second|seconds|min|mins|minute|minutes)\b/gi, " ")
      .replace(/[x]/gi, " ")
  );
}

function genericInstructions(name) {
  return [
    `Set up for ${name.toLowerCase()} in a comfortable and controlled starting position.`,
    "Perform the movement slowly and stay within a comfortable range.",
    "Return to the starting position with control."
  ];
}

function normalizeTimeUnit(unit) {
  const u = unit.toLowerCase();
  if (["s", "sec", "secs", "second", "seconds"].includes(u)) return "sec";
  if (["min", "mins", "minute", "minutes"].includes(u)) return "min";
  return unit;
}

function removeFragment(text, fragment) {
  return normalizeSpaces(text.replace(new RegExp(escapeRegExp(fragment), "ig"), " "));
}

function normalizeSpaces(str) {
  return String(str).replace(/\s+/g, " ").trim();
}

function titleCase(str) {
  return str.replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
}

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderEditors() {
  if (!exercises.length) {
    els.editorList.innerHTML = `<p class="empty">No exercises generated.</p>`;
    return;
  }

  els.editorList.innerHTML = exercises.map((ex, i) => `
    <div class="editor-card" data-index="${i}">
      <h3>${i + 1}. ${escapeHtml(ex.displayName)}</h3>
      <div class="raw-chip">Raw input: ${escapeHtml(ex.rawInput)}</div>

      <div class="editor-grid">
        <div class="span-3">
          <span class="mini-label">Display Name</span>
          <input class="editor-displayName" value="${escapeAttr(ex.displayName)}" />
        </div>
        <div class="span-3">
          <span class="mini-label">Frequency</span>
          <input class="editor-frequency" value="${escapeAttr(ex.frequency)}" />
        </div>

        <div>
          <span class="mini-label">Sets</span>
          <input class="editor-sets" value="${escapeAttr(ex.sets)}" />
        </div>
        <div>
          <span class="mini-label">Reps</span>
          <input class="editor-reps" value="${escapeAttr(ex.reps)}" />
        </div>
        <div>
          <span class="mini-label">Duration</span>
          <input class="editor-duration" value="${escapeAttr(ex.duration)}" />
        </div>
        <div>
          <span class="mini-label">Hold</span>
          <input class="editor-hold" value="${escapeAttr(ex.hold)}" />
        </div>
        <div>
          <span class="mini-label">Side</span>
          <input class="editor-side" value="${escapeAttr(ex.side)}" />
        </div>
        <div>
          <span class="mini-label">Notes</span>
          <input class="editor-notes" value="${escapeAttr(ex.notes)}" />
        </div>

        <div class="full">
          <span class="mini-label">Instructions (one per line)</span>
          <textarea class="editor-instructions" rows="4">${escapeHtml(ex.instructions.join("\n"))}</textarea>
        </div>
      </div>
    </div>
  `).join("");

  els.editorList.querySelectorAll("input, textarea").forEach(el => {
    el.addEventListener("input", () => {
      syncFromEditors();
      renderPreview();
    });
  });
}

function syncFromEditors() {
  const cards = els.editorList.querySelectorAll(".editor-card");
  exercises = Array.from(cards).map((card, i) => {
    const raw = exercises[i]?.rawInput || "";
    const instructionsText = card.querySelector(".editor-instructions").value.trim();
    return {
      rawInput: raw,
      displayName: card.querySelector(".editor-displayName").value.trim(),
      frequency: card.querySelector(".editor-frequency").value.trim(),
      sets: card.querySelector(".editor-sets").value.trim(),
      reps: card.querySelector(".editor-reps").value.trim(),
      duration: card.querySelector(".editor-duration").value.trim(),
      hold: card.querySelector(".editor-hold").value.trim(),
      side: card.querySelector(".editor-side").value.trim(),
      notes: card.querySelector(".editor-notes").value.trim(),
      instructions: instructionsText ? instructionsText.split("\n").map(x => x.trim()).filter(Boolean) : []
    };
  });
}

function renderPreview() {
  syncMeta();
  if (!exercises.length) {
    els.previewList.innerHTML = `<p class="empty">Generate a program to see the patient-ready preview.</p>`;
    return;
  }

  els.previewList.innerHTML = exercises.map((ex, i) => `
    <div class="preview-card">
      <div class="preview-head">
        <p class="preview-name">${i + 1}. ${escapeHtml(ex.displayName || "Exercise")}</p>
        <div class="preview-dose">${escapeHtml(buildDose(ex))}</div>
      </div>
      ${ex.instructions.length ? `
      <ol>
        ${ex.instructions.map(line => `<li>${escapeHtml(line)}</li>`).join("")}
      </ol>` : ""}
      ${ex.notes ? `<div class="notes-box"><strong>Notes:</strong> ${escapeHtml(ex.notes)}</div>` : ""}
    </div>
  `).join("");
}

function syncMeta() {
  els.previewTitle.textContent = els.programTitle.value.trim() || "Home Exercise Program";
  els.previewPatient.textContent = `Patient: ${els.patientName.value.trim() || "—"}`;
  els.previewDate.textContent = `Date: ${els.programDate.value || "—"}`;
  els.previewIntro.textContent = els.introText.value.trim() || "Perform the following exercises as prescribed.";
}

function buildDose(ex) {
  const parts = [];
  if (ex.sets && ex.reps) parts.push(`${ex.sets} sets x ${ex.reps} reps`);
  else if (ex.sets && ex.duration) parts.push(`${ex.sets} sets x ${ex.duration}`);
  else if (ex.duration) parts.push(ex.duration);
  if (ex.hold) parts.push(`${ex.hold} hold`);
  if (ex.side) parts.push(ex.side);
  if (ex.frequency) parts.push(ex.frequency);
  return parts.join(" • ");
}

function openEmailDraft() {
  syncFromEditors();
  renderPreview();
  const recipient = els.recipientEmail.value.trim();
  if (!recipient) {
    alert("Enter a recipient email first.");
    return;
  }

  const subject = `${els.programTitle.value.trim() || "Home Exercise Program"} - ${els.programDate.value || ""}`;
  const bodyLines = [
    `Hello ${els.patientName.value.trim() || ""},`,
    "",
    els.introText.value.trim(),
    ""
  ];

  exercises.forEach((ex, i) => {
    bodyLines.push(`${i + 1}. ${ex.displayName}`);
    const dose = buildDose(ex);
    if (dose) bodyLines.push(`Dosage: ${dose}`);
    ex.instructions.forEach((line, idx) => bodyLines.push(`- ${line}`));
    if (ex.notes) bodyLines.push(`Notes: ${ex.notes}`);
    bodyLines.push("");
  });

  const url = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
  window.location.href = url;
}

async function copySummary() {
  syncFromEditors();
  renderPreview();
  const lines = [
    els.programTitle.value.trim() || "Home Exercise Program",
    `Patient: ${els.patientName.value.trim() || "—"}`,
    `Date: ${els.programDate.value || "—"}`,
    "",
    els.introText.value.trim(),
    ""
  ];

  exercises.forEach((ex, i) => {
    lines.push(`${i + 1}. ${ex.displayName}`);
    const dose = buildDose(ex);
    if (dose) lines.push(`Dosage: ${dose}`);
    ex.instructions.forEach(line => lines.push(`- ${line}`));
    if (ex.notes) lines.push(`Notes: ${ex.notes}`);
    lines.push("");
  });

  try {
    await navigator.clipboard.writeText(lines.join("\n"));
    alert("Summary copied.");
  } catch {
    alert("Could not copy summary.");
  }
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(str) {
  return escapeHtml(str).replaceAll("\n", "&#10;");
}
