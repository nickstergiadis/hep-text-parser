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

const previewTitleEl = document.getElementById("previewTitle");
const previewPatientEl = document.getElementById("previewPatient");
const previewDateEl = document.getElementById("previewDate");
const previewIntroEl = document.getElementById("previewIntro");
const exerciseListEl = document.getElementById("exerciseList");

let parsedExercises = [];

setDefaultDate();

sampleBtn.addEventListener("click", loadSample);
generateBtn.addEventListener("click", generateProgram);
printBtn.addEventListener("click", downloadOrPrintPDF);
emailBtn.addEventListener("click", openEmailDraft);
copySummaryBtn.addEventListener("click", copySummary);

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
  introTextEl.value =
    "Perform the following exercises as prescribed. Use controlled movement and stop if symptoms significantly worsen.";

  inputTextEl.value = `1) Pelvic Tilts – 2 x 10, 3-second holds
2) Bridge – 3 x 8
3) Calf Stretch – 2 x 30s each side
4) Clamshell – 2 x 12 each side
Frequency: daily`;

  generateProgram();
}

function generateProgram() {
  const rawText = inputTextEl.value.trim();

  if (!rawText) {
    exerciseListEl.innerHTML = `<p class="empty">Paste HEP text first.</p>`;
    return;
  }

  parsedExercises = parseHEP(rawText);

  const title = programTitleEl.value.trim() || "Home Exercise Program";
  const patient = patientNameEl.value.trim() || "—";
  const programDate = formatDate(programDateEl.value);
  const intro = introTextEl.value.trim() || "Perform the following exercises as prescribed.";

  previewTitleEl.textContent = title;
  previewPatientEl.textContent = `Patient: ${patient}`;
  previewDateEl.textContent = `Date: ${programDate}`;
  previewIntroEl.textContent = intro;

  if (!parsedExercises.length) {
    exerciseListEl.innerHTML = `<p class="empty">No exercises could be parsed.</p>`;
    return;
  }

  exerciseListEl.innerHTML = parsedExercises
    .map((exercise, index) => {
      const dose = buildDoseString(exercise);
      const notes = exercise.notes ? `<p class="exercise-notes"><strong>Notes:</strong> ${escapeHtml(exercise.notes)}</p>` : "";

      return `
        <article class="exercise-card">
          <div class="exercise-top">
            <div>
              <p class="exercise-name">${index + 1}. ${escapeHtml(exercise.name || "Exercise")}</p>
            </div>
            <div class="exercise-dose">${escapeHtml(dose || "")}</div>
          </div>
          ${notes}
        </article>
      `;
    })
    .join("");
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

  const setsDurationMatch = details.match(
    /(\d+)\s*x\s*(\d+)\s*(s|sec|secs|second|seconds|min|mins|minute|minutes)\b/i
  );
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

  const holdMatch = details.match(/(\d+)\s*[-]?\s*(second|seconds|sec|secs)\s*holds?/i);
  if (holdMatch) {
    hold = `${holdMatch[1]} sec`;
    notes = removeText(notes, holdMatch[0]);
  }

  const sideMatch = details.match(/each side|per side|each leg|each arm/i);
  if (sideMatch) {
    side = sideMatch[0];
    notes = removeText(notes, sideMatch[0]);
  }

  notes = notes.replace(/^,+|,+$/g, "").trim();

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

function normalizeTimeUnit(unit) {
  const value = unit.toLowerCase();
  if (["s", "sec", "secs", "second", "seconds"].includes(value)) return "sec";
  if (["min", "mins", "minute", "minutes"].includes(value)) return "min";
  return unit;
}

function removeText(base, fragment) {
  return base.replace(fragment, "").replace(/^[,\s]+|[,\s]+$/g, "").trim();
}

function buildDoseString(exercise) {
  const parts = [];

  if (exercise.sets && exercise.reps) {
    parts.push(`${exercise.sets} sets x ${exercise.reps} reps`);
  } else if (exercise.sets && exercise.duration) {
    parts.push(`${exercise.sets} sets x ${exercise.duration}`);
  } else if (exercise.duration) {
    parts.push(exercise.duration);
  }

  if (exercise.hold) {
    parts.push(`${exercise.hold} hold`);
  }

  if (exercise.side) {
    parts.push(exercise.side);
  }

  if (exercise.frequency) {
    parts.push(exercise.frequency);
  }

  return parts.join(" • ");
}

function downloadOrPrintPDF() {
  generateProgram();
  window.print();
}

function openEmailDraft() {
  generateProgram();

  const recipient = recipientEmailEl.value.trim();
  if (!recipient) {
    alert("Enter a recipient email first.");
    return;
  }

  const title = programTitleEl.value.trim() || "Home Exercise Program";
  const patient = patientNameEl.value.trim() || "Patient";
  const date = formatDate(programDateEl.value);

  const summaryLines = parsedExercises.map((exercise, index) => {
    const dose = buildDoseString(exercise);
    const noteText = exercise.notes ? ` | Notes: ${exercise.notes}` : "";
    return `${index + 1}. ${exercise.name}${dose ? " — " + dose : ""}${noteText}`;
  });

  const body = [
    `Hello ${patient},`,
    ``,
    `Attached / included is your ${title.toLowerCase()} from ${date}.`,
    ``,
    `Program summary:`,
    ...summaryLines,
    ``,
    `General instructions:`,
    introTextEl.value.trim() || "Perform the following exercises as prescribed.",
    ``,
    `Please reply if you have any questions.`
  ].join("\n");

  const subject = `${title} - ${date}`;
  const mailtoUrl =
    `mailto:${encodeURIComponent(recipient)}` +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`;

  window.location.href = mailtoUrl;
}

async function copySummary() {
  generateProgram();

  const title = programTitleEl.value.trim() || "Home Exercise Program";
  const patient = patientNameEl.value.trim() || "Patient";
  const date = formatDate(programDateEl.value);

  const summary = [
    `${title}`,
    `Patient: ${patient}`,
    `Date: ${date}`,
    ``,
    `Instructions:`,
    introTextEl.value.trim() || "Perform the following exercises as prescribed.",
    ``,
    `Exercises:`,
    ...parsedExercises.map((exercise, index) => {
      const dose = buildDoseString(exercise);
      const noteText = exercise.notes ? ` | Notes: ${exercise.notes}` : "";
      return `${index + 1}. ${exercise.name}${dose ? " — " + dose : ""}${noteText}`;
    })
  ].join("\n");

  try {
    await navigator.clipboard.writeText(summary);
    alert("Program summary copied.");
  } catch {
    alert("Could not copy summary.");
  }
}

function formatDate(value) {
  if (!value) return "—";
  const [yyyy, mm, dd] = value.split("-");
  return `${yyyy}-${mm}-${dd}`;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
