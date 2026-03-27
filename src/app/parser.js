function splitRawLines(text) {
  return String(text || '').replace(/\r\n/g, '\n').replace(/\\n/g, '\n').split('\n');
}

function normalizeSectionName(label) {
  return String(label || '').trim().replace(/\s+/g, ' ');
}

function extractSectionFrequency(label) {
  const cleanLabel = normalizeSectionName(label);
  if (!cleanLabel) return { name: '', frequencyLabel: '' };

  const weeklyMatch = cleanLabel.match(/^(.*?)(?:\s+|\s*[—-]\s*)(\d+\s*(?:-\s*\d+)?\s*x\s*\/?\s*week)$/i);
  if (weeklyMatch) {
    const sectionName = normalizeSectionName(weeklyMatch[1]);
    const frequencyLabel = normalizeSectionName(weeklyMatch[2]).replace(/\s+/g, '');
    if (sectionName) return { name: sectionName, frequencyLabel };
  }

  if (/^daily\b/i.test(cleanLabel)) {
    return {
      name: cleanLabel,
      frequencyLabel: 'Daily'
    };
  }

  return {
    name: cleanLabel,
    frequencyLabel: ''
  };
}

function parseProgramTitle(line) {
  const match = String(line || '').match(/^program\s*:\s*(.+)$/i);
  if (!match) return '';
  return normalizeSectionName(match[1]);
}

function parseSectionHeader(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed) return '';

  const bracketMatch = trimmed.match(/^\[\s*(.+?)\s*]$/);
  if (bracketMatch) return normalizeSectionName(bracketMatch[1]);

  const markdownMatch = trimmed.match(/^##\s+(.+)$/);
  if (markdownMatch) return normalizeSectionName(markdownMatch[1]);

  const colonMatch = trimmed.match(/^(.+?)\s*:\s*$/);
  if (colonMatch) {
    const sectionName = normalizeSectionName(colonMatch[1]);
    if (sectionName && !/^program$/i.test(sectionName) && !/^frequency$/i.test(sectionName)) return sectionName;
  }

  return '';
}

export function parseProgramInput(text) {
  const lines = splitRawLines(text);
  const sections = [];
  let programTitle = '';
  let frequencyLine = '';
  let currentSection = null;
  let hasExplicitSections = false;

  const ensureSection = () => {
    if (!currentSection) {
      currentSection = {
        name: 'Exercises',
        frequencyLabel: '',
        lines: [],
        order: sections.length
      };
    }
    return currentSection;
  };

  const flushSection = () => {
    if (!currentSection) return;
    if (currentSection.lines.length) sections.push(currentSection);
    currentSection = null;
  };

  lines.forEach(rawLine => {
    const line = String(rawLine || '').trim();
    if (!line) return;

    const maybeTitle = parseProgramTitle(line);
    if (maybeTitle) {
      if (!programTitle) programTitle = maybeTitle;
      return;
    }

    if (!frequencyLine) {
      const frequencyMatch = line.match(/^frequency\s*:\s*(.+)$/i);
      if (frequencyMatch?.[1]) {
        frequencyLine = normalizeSectionName(frequencyMatch[1]);
        return;
      }
    }

    const header = parseSectionHeader(line);
    if (header) {
      flushSection();
      const parsed = extractSectionFrequency(header);
      currentSection = {
        name: parsed.name || header,
        rawLabel: header,
        frequencyLabel: parsed.frequencyLabel,
        lines: [],
        order: sections.length
      };
      hasExplicitSections = true;
      return;
    }

    ensureSection().lines.push(line);
  });

  flushSection();

  if (!sections.length) {
    return {
      title: programTitle,
      frequencyLine,
      hasExplicitSections: false,
      sections: []
    };
  }

  return {
    title: programTitle,
    frequencyLine,
    hasExplicitSections,
    sections
  };
}

export { extractSectionFrequency, parseSectionHeader };
