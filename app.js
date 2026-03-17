const state = {
  exerciseLibrary: [],
  clinicConfig: null,
  sampleProgram: null,
  renderedProgram: null
};

const libraryStatusEl = document.getElementById("libraryStatus");
const patientNameEl = document.getElementById("patientName");
const patientEmailEl = document.getElementById("patientEmail");
const programTitleEl = document.getElementById("programTitle");
const programDateEl = document.getElementById("programDate");
const jsonInputEl = document.getElementById("jsonInput");
const manualNotesEl = document.getElementById("manualNotes");
const programSummaryEl = document.getElementById("programSummary");
const messageBoxEl = document.getElementById("messageBox");

const loadSampleBtn = document.getElementById("loadSampleBtn");
const generateBtn = document.getElementById("generateBtn");
const printBtn = document.getElementById("printBtn");
const emailBtn = document.getElementById("emailBtn");
const copyChartBtn = document.getElementById("copyChartBtn");
const copyPatientBtn = document.getElementById("copyPatientBtn");

const clinicLogoEl = document.getElementById("clinicLogo");
const previewTitleEl = document.getElementById("previewTitle");
const previewClinicNameEl = document.getElementById("previewClinicName");
const previewPatientEl = document.getElementById("previewPatient");
const previewDateEl = document.getElementById("previewDate");
const previewFrequencyEl = document.getElementById("previewFrequency");
const previewIntroEl = document.getElementById("previewIntro");
const previewPrecautionsEl = document.getElementById("previewPrecautions");
const previewProgramNotesEl = document.getElementById("previewProgramNotes");
const previewFooterEl = document.getElementById("previewFooter");
const previewSignatureEl = document.getElementById("previewSignature");
const sectionsContainerEl = document.getElementById("sectionsContainer");

document.addEventListener("DOMContentLoaded", init);

async function init() {
  setDefaultDate();
  wireEvents();

  try {
    const [library, config, sample] = await Promise.all([
      fetchJson("data/exercise-library.json"),
      fetchJson("data/clinic-config.json"),
      fetchJson("data/sample-program.json")
    ]);

    state.exerciseLibrary = Array.isArray(library) ? library : [];
    state.clinicConfig = config || {};
    state.sampleProgram = sample || null;

    applyClinicConfig();
    setStatus(`Library loaded: ${state.exerciseLibrary.length} exercises`);
    setMessage("Library, clinic config, and sample program loaded.");
  } catch (error) {
    console.error(error);
    setStatus("Failed to load local data");
    setMessage("One or more local JSON files could not be loaded. Check file paths and GitHub Pages deployment.", true);
  }
}

function wireEvents() {
  loadSampleBtn.addEventListener("click", loadSampleJson);
  generateBtn.addEventListener("click", generateProgram);
  printBtn.addEventListener("click", printProgram);
  emailBtn.addEventListener("click", openEmailDraft);
  copyChartBtn.addEventListener("click", copyChartSummary);
  copyPatientBtn.addEventListener("click", copyPatientText);
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Could not load ${path}`);
  }
  return response.json();
}

function setDefaultDate() {
  const today = new Date();
  programDateEl.value = today.toISOString().slice(0, 10);
}

function applyClinicConfig() {
  const config = state.clinicConfig || {};
  const clinicName = config.clinic_name || "Clinic";
  const logoUrl = config.logo_url || "";
  previewClinicNameEl.textContent = clinicName;
  previewFooterEl.textContent = config.footer_text || "This program is intended for the named patient only.";
  previewSignatureEl.textContent = config.email_signature || clinicName;

  if (logoUrl) {
    clinicLogoEl.src = logoUrl;
    clinicLogoEl.alt = `${clinicName} logo`;
  } else {
    clinicLogoEl.style.display = "none";
  }

  const root = document.documentElement;
  if (config.brand?.primary_color) root.style.setProperty("--primary", config.brand.primary_color);
  if (config.brand?.secondary_color) root.style.setProperty("--secondary", config.brand.secondary_color);
  if (config.brand?.accent_color) root.style.setProperty("--accent", config.brand.accent_color);
}

function setStatus(message) {
  libraryStatusEl.textContent = message;
}

function setMessage(message, isError = false) {
  messageBoxEl.innerHTML = `<strong>Status:</strong> ${escapeHtml(message)}`;
  messageBoxEl.classList.toggle("warning", !isError);
}

function loadSampleJson() {
  if (!state.sampleProgram) {
    setMessage("Sample program could not be loaded.", true);
    return;
  }

  jsonInputEl.value = JSON.stringify(state.sampleProgram, null, 2);
  patientNameEl.value = state.sampleProgram.patient?.name || "";
  patientEmailEl.value = state.sampleProgram.patient?.email || "";
  programTitleEl.value = state.sampleProgram.program?.title || "";
  programDateEl.value = state.sampleProgram.program?.date || new Date().toISOString().slice(0, 10);
  programSummaryEl.value = state.sampleProgram.program?.notes || "";
  manualNotesEl.value = "";
  generateProgram();
  setMessage("Sample JSON loaded.");
}

function generateProgram() {
  const raw = jsonInputEl.value.trim();
  if (!raw) {
    setMessage("Paste valid JSON first.", true);
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.error(error);
    setMessage("Invalid JSON. Fix formatting, quotes, or commas and try again.", true);
    return;
  }

  const program = normalizeProgram(parsed);
  state.renderedProgram = program;
  renderProgram(program);
  setMessage("Program generated.");
}

function normalizeProgram(parsed) {
  const clinicConfig = state.clinicConfig || {};
  const patient = parsed.patient || {};
  const programMeta = parsed.program || {};
  const sections = Array.isArray(parsed.sections) ? parsed.sections : [];

  const normalized = {
    patient: {
      name: patientNameEl.value.trim() || patient.name || "",
      email: patientEmailEl.value.trim() || patient.email || ""
    },
    program: {
      title: programTitleEl.value.trim() || programMeta.title || "Home Exercise Program",
      date: programDateEl.value || programMeta.date || new Date().toISOString().slice(0, 10),
      frequency_summary: programMeta.frequency_summary || "As prescribed",
      general_instructions:
        programMeta.general_instructions ||
        clinicConfig.default_intro ||
        "Perform the following exercises as prescribed.",
      precautions:
        programMeta.precautions ||
        clinicConfig.default_precautions ||
        "Stop if symptoms significantly worsen.",
      notes: programSummaryEl.value.trim() || programMeta.notes || "",
      extra_delivery_note: manualNotesEl.value.trim()
    },
    sections: sections.map(section => ({
      section_title: section.section_title || "Program Section",
      section_frequency: section.section_frequency || "",
      exercises: Array.isArray(section.exercises)
        ? section.exercises.map(exercise => normalizeExercise(exercise))
        : []
    }))
  };

  return normalized;
}

function normalizeExercise(exercise) {
  return {
    exercise_name: exercise.exercise_name || "",
    library_id: exercise.library_id || "",
    sets: toNumberOrEmpty(exercise.sets),
    reps: toNumberOrEmpty(exercise.reps),
    hold_seconds: toNumberOrEmpty(exercise.hold_seconds),
    duration_seconds: toNumberOrEmpty(exercise.duration_seconds),
    side: exercise.side || "",
    tempo: exercise.tempo || "",
    rest_seconds: toNumberOrEmpty(exercise.rest_seconds),
    frequency: exercise.frequency || "",
    instructions_override: exercise.instructions_override || "",
    notes: exercise.notes || "",
    equipment: exercise.equipment || "",
    phase: exercise.phase || ""
  };
}

function toNumberOrEmpty(value) {
  if (value === "" || value === null || value === undefined) return "";
  const num = Number(value);
  return Number.isFinite(num) ? num : "";
}

function renderProgram(program) {
  previewTitleEl.textContent = program.program.title;
  previewPatientEl.textContent = `Patient: ${program.patient.name || "—"}`;
  previewDateEl.textContent = `Date: ${formatDate(program.program.date)}`;
  previewFrequencyEl.textContent = `Frequency: ${program.program.frequency_summary || "—"}`;
  previewIntroEl.textContent = program.program.general_instructions || "";
  previewPrecautionsEl.textContent = `Precautions: ${program.program.precautions || "—"}`;

  const notesChunks = [program.program.notes, program.program.extra_delivery_note].filter(Boolean);
  previewProgramNotesEl.textContent = notesChunks.length
    ? `Notes: ${notesChunks.join(" ")}`
    : "Notes: —";

  const sectionsHtml = program.sections.length
    ? program.sections.map((section, sectionIndex) => renderSection(section, sectionIndex)).join("")
    : `<div class="empty-state">No sections found in the JSON.</div>`;

  sectionsContainerEl.innerHTML = sectionsHtml;
}

function renderSection(section, sectionIndex) {
  const exercisesHtml = section.exercises.length
    ? section.exercises.map((exercise, exerciseIndex) => renderExerciseCard(section, sectionIndex, exercise, exerciseIndex)).join("")
    : `<div class="exercise-card"><p class="muted">No exercises in this section.</p></div>`;

  return `
    <section class="section-block">
      <div class="section-header">
        <p class="section-title">${escapeHtml(section.section_title)}</p>
        <p class="section-subtitle">${escapeHtml(section.section_frequency || "")}</p>
      </div>
      <div class="exercise-list">
        ${exercisesHtml}
      </div>
    </section>
  `;
}

function renderExerciseCard(section, sectionIndex, exercise, exerciseIndex) {
  const match = matchExercise(exercise);
  const displayName = exercise.exercise_name || match?.name || "Exercise";
  const instructions = getInstructions(exercise, match);
  const cues = Array.isArray(match?.cues) ? match.cues : [];
  const images = Array.isArray(match?.image_urls) ? match.image_urls.slice(0, 2) : [];
  const dose = buildDoseString(exercise, section.section_frequency);
  const notes = [exercise.notes].filter(Boolean);
  const commonMistakes = Array.isArray(match?.common_mistakes) ? match.common_mistakes : [];
  const badges = [];

  if (match) {
    badges.push(`<span class="match-badge">Library match: ${escapeHtml(match.id)}</span>`);
  } else {
    badges.push(`<span class="match-badge unmatched">Library match not found</span>`);
  }

  if (exercise.phase) {
    badges.push(`<span class="inline-note">Phase: ${escapeHtml(exercise.phase)}</span>`);
  }
  if (exercise.equipment) {
    badges.push(`<span class="inline-note">Equipment: ${escapeHtml(exercise.equipment)}</span>`);
  }

  const instructionsHtml = instructions.length
    ? `<h4>How to do it</h4><ul>${instructions.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : "";

  const cuesHtml = cues.length
    ? `<h4>Cues</h4><ul>${cues.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : "";

  const notesHtml = notes.length
    ? `<h4>Notes</h4><ul>${notes.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : "";

  const mistakesHtml = commonMistakes.length
    ? `<h4>Common mistakes</h4><ul>${commonMistakes.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : "";

  const imagesHtml = images.length
    ? `<div class="exercise-image-stack">
        ${images
          .map((src, i) => `
            <figure>
              <img src="${escapeHtml(src)}" alt="${escapeHtml(displayName)} image ${i + 1}" />
              <figcaption class="image-caption">${escapeHtml(displayName)} ${i === 0 ? "image" : `image ${i + 1}`}</figcaption>
            </figure>
          `)
          .join("")}
      </div>`
    : `<div class="exercise-image-stack"><div class="helper-card">Add exercise images in <code>images/exercises/</code> and update <code>data/exercise-library.json</code>.</div></div>`;

  return `
    <article class="exercise-card">
      <div class="exercise-header">
        <div>
          <p class="exercise-name">${sectionIndex + 1}.${exerciseIndex + 1} ${escapeHtml(displayName)}</p>
          ${badges.join("")}
        </div>
        <div class="exercise-dose">${escapeHtml(dose || "Dosage not specified")}</div>
      </div>

      <div class="exercise-grid">
        ${imagesHtml}
        <div class="exercise-copy">
          ${instructionsHtml}
          ${cuesHtml}
          ${notesHtml}
          ${mistakesHtml}
        </div>
      </div>
    </article>
  `;
}

function matchExercise(exercise) {
  if (!state.exerciseLibrary.length) return null;

  if (exercise.library_id) {
    const direct = state.exerciseLibrary.find(item => normalizeString(item.id) === normalizeString(exercise.library_id));
    if (direct) return direct;
  }

  if (exercise.exercise_name) {
    const exact = state.exerciseLibrary.find(item => normalizeString(item.name) === normalizeString(exercise.exercise_name));
    if (exact) return exact;

    const alias = state.exerciseLibrary.find(item =>
      Array.isArray(item.aliases) && item.aliases.some(aliasItem => normalizeString(aliasItem) === normalizeString(exercise.exercise_name))
    );
    if (alias) return alias;
  }

  return null;
}

function getInstructions(exercise, match) {
  if (exercise.instructions_override) {
    return splitParagraphInstructions(exercise.instructions_override);
  }

  if (match?.instructions && Array.isArray(match.instructions)) {
    return match.instructions;
  }

  return [];
}

function splitParagraphInstructions(text) {
  return text
    .split(/\n|\. /)
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => item.endsWith(".") ? item : item + ".");
}

function buildDoseString(exercise, sectionFrequency) {
  const parts = [];

  if (exercise.sets && exercise.reps) {
    parts.push(`${exercise.sets} sets x ${exercise.reps} reps`);
  } else if (exercise.sets && exercise.duration_seconds) {
    parts.push(`${exercise.sets} sets x ${exercise.duration_seconds} sec`);
  } else if (exercise.duration_seconds) {
    parts.push(`${exercise.duration_seconds} sec`);
  }

  if (exercise.hold_seconds) parts.push(`${exercise.hold_seconds} sec hold`);
  if (exercise.side) parts.push(exercise.side);
  if (exercise.tempo) parts.push(`Tempo: ${exercise.tempo}`);
  if (exercise.rest_seconds) parts.push(`Rest ${exercise.rest_seconds} sec`);
  if (exercise.frequency) {
    parts.push(exercise.frequency);
  } else if (sectionFrequency) {
    parts.push(sectionFrequency);
  }

  return parts.join(" • ");
}

function printProgram() {
  if (!state.renderedProgram) {
    generateProgram();
    if (!state.renderedProgram) return;
  }
  window.print();
}

function openEmailDraft() {
  if (!state.renderedProgram) {
    generateProgram();
    if (!state.renderedProgram) return;
  }

  const recipient = state.renderedProgram.patient.email;
  if (!recipient) {
    setMessage("Enter a patient email before opening the email draft.", true);
    return;
  }

  const subject = `${state.renderedProgram.program.title} - ${formatDate(state.renderedProgram.program.date)}`;
  const body = buildPatientText(true);
  const mailtoUrl =
    `mailto:${encodeURIComponent(recipient)}` +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`;

  window.location.href = mailtoUrl;
}

async function copyChartSummary() {
  if (!state.renderedProgram) {
    generateProgram();
    if (!state.renderedProgram) return;
  }

  const text = buildChartSummary();
  await writeToClipboard(text, "Chart summary copied.");
}

async function copyPatientText() {
  if (!state.renderedProgram) {
    generateProgram();
    if (!state.renderedProgram) return;
  }

  const text = buildPatientText(false);
  await writeToClipboard(text, "Patient text copied.");
}

async function writeToClipboard(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    setMessage(successMessage);
  } catch (error) {
    console.error(error);
    setMessage("Could not copy text to clipboard.", true);
  }
}

function buildChartSummary() {
  const program = state.renderedProgram;
  const sectionLines = program.sections.map(section => {
    const exerciseText = section.exercises.map(exercise => {
      const match = matchExercise(exercise);
      const name = exercise.exercise_name || match?.name || "Exercise";
      return `${name} ${buildShortDoseString(exercise, section.section_frequency)}`.trim();
    });
    return `${section.section_title}: ${exerciseText.join("; ")}.`;
  });

  return [
    `HEP provided:`,
    ...sectionLines,
    `General instructions reviewed. Patient educated on symptom monitoring and exercise tolerance.`
  ].join("\n");
}

function buildShortDoseString(exercise, sectionFrequency) {
  const parts = [];
  if (exercise.sets && exercise.reps) parts.push(`${exercise.sets}x${exercise.reps}`);
  else if (exercise.sets && exercise.duration_seconds) parts.push(`${exercise.sets}x${exercise.duration_seconds}s`);
  else if (exercise.duration_seconds) parts.push(`${exercise.duration_seconds}s`);
  if (exercise.hold_seconds) parts.push(`${exercise.hold_seconds}s hold`);
  if (exercise.side) parts.push(exercise.side);
  if (exercise.frequency) parts.push(exercise.frequency);
  else if (sectionFrequency) parts.push(sectionFrequency);
  return parts.join(", ");
}

function buildPatientText(includeEmailGreeting) {
  const program = state.renderedProgram;
  const lines = [];

  if (includeEmailGreeting) {
    lines.push(`Hello ${program.patient.name || "there"},`);
    lines.push("");
    lines.push(`Below is your ${program.program.title.toLowerCase()} from ${formatDate(program.program.date)}.`);
    lines.push("");
  }

  lines.push(program.program.title);
  lines.push(`Patient: ${program.patient.name || "—"}`);
  lines.push(`Date: ${formatDate(program.program.date)}`);
  lines.push(`Frequency: ${program.program.frequency_summary || "As prescribed"}`);
  lines.push("");
  lines.push(`General instructions: ${program.program.general_instructions || ""}`);
  lines.push(`Precautions: ${program.program.precautions || ""}`);

  if (program.program.notes) {
    lines.push(`Program notes: ${program.program.notes}`);
  }
  if (program.program.extra_delivery_note) {
    lines.push(`Additional note: ${program.program.extra_delivery_note}`);
  }

  lines.push("");

  program.sections.forEach(section => {
    lines.push(section.section_title + (section.section_frequency ? ` (${section.section_frequency})` : ""));
    section.exercises.forEach((exercise, index) => {
      const match = matchExercise(exercise);
      const name = exercise.exercise_name || match?.name || "Exercise";
      lines.push(`${index + 1}. ${name} — ${buildDoseString(exercise, section.section_frequency)}`);

      const instructions = getInstructions(exercise, match);
      if (instructions.length) {
        instructions.forEach(step => lines.push(`   - ${step}`));
      }
      if (exercise.notes) {
        lines.push(`   - Notes: ${exercise.notes}`);
      }
    });
    lines.push("");
  });

  const signature = state.clinicConfig?.email_signature || "Clinician";
  lines.push("Please reply if you have any questions.");
  lines.push("");
  lines.push(signature);

  return lines.join("\n");
}

function formatDate(dateValue) {
  if (!dateValue) return "—";
  const date = new Date(dateValue + "T00:00:00");
  if (Number.isNaN(date.getTime())) return dateValue;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function normalizeString(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[–—-]/g, "-");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
