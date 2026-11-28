const fs = require("fs");
const path = require("path");

function walk(dir) {
  let files = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      files = files.concat(walk(full));
    } else if (/\.(tsx|ts|css|html)$/.test(f)) {
      files.push(full);
    }
  }
  return files;
}

const files = walk("src");
const tsxFiles = files.filter(f => f.endsWith(".tsx"));

const counts = {
  ui: {},
  pages: {},
  components: {},
  other: {}
};

const risks = {
  reactFlow: [],
  dayPickerOrCalendar: [],
  dirLtr: [],
  dirRtl: [],
  darkMode: [],
  contradictions: [],
  fixedWidths: []
};

let detailedTextXs = {
  labels: [],
  tableHeaders: [],
  cardTitles: [],
  tableCells: [],
  buttons: [],
  badgesOrMeta: [],
  other: 0
};

tsxFiles.forEach(file => {
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");

  const rtlMatches = content.match(/\b(ml|mr|pl|pr|left|right|rounded-l|rounded-r|border-l|border-r|space-x)-[0-9a-zA-Z_\[\]]+|\b(text-left|text-right)\b/g) || [];
  const textXsMatches = content.match(/\btext-xs\b/g) || [];
  const hexMatches = content.match(/#[0-9a-fA-F]{3,8}/g) || [];
  
  const score = rtlMatches.length + textXsMatches.length + hexMatches.length;

  const item = {
    file,
    totalIssues: score,
    rtlCount: rtlMatches.length,
    textXsCount: textXsMatches.length,
    hexCount: hexMatches.length
  };

  if (file.startsWith("src/components/ui/")) {
    counts.ui[file] = item;
  } else if (file.startsWith("src/pages/")) {
    counts.pages[file] = item;
  } else if (file.startsWith("src/components/")) {
    counts.components[file] = item;
  } else {
    counts.other[file] = item;
  }

  // Check risks
  if (/reactflow|react-flow|@xyflow/i.test(content)) {
    risks.reactFlow.push(file);
  }
  if (/daypicker|react-day-picker|calendar/i.test(content)) {
    risks.dayPickerOrCalendar.push(file);
  }
  if (/dir\s*=\s*["']ltr["']/i.test(content) || /\[dir=["']ltr["']\]/i.test(content)) {
    risks.dirLtr.push(file);
  }
  if (/dir\s*=\s*["']rtl["']/i.test(content)) {
    risks.dirRtl.push(file);
  }
  if (/\bdark:/i.test(content) || /\.dark\b/i.test(content)) {
    risks.darkMode.push(file);
  }

  // Fixed widths w-[...px]
  const fw = content.match(/\b(w|min-w|max-w)-\[[0-9]+px\]/g);
  if (fw) {
    risks.fixedWidths.push({ file, widths: Array.from(new Set(fw)), count: fw.length });
  }

  // Check contradictions in same line
  lines.forEach((line, lineIdx) => {
    if (/\btext-left\b/.test(line) && /\btext-right\b/.test(line)) {
      risks.contradictions.push({ file, line: lineIdx + 1, type: "text-left + text-right", text: line.trim() });
    }
    if (/\bml-\d+\b/.test(line) && /\bmr-\d+\b/.test(line) && !line.includes("mx-")) {
      risks.contradictions.push({ file, line: lineIdx + 1, type: "ml + mr sur même élément", text: line.trim() });
    }
  });

  // Detailed analysis of text-xs
  lines.forEach((line, lineIdx) => {
    if (/\btext-xs\b/.test(line)) {
      const lower = line.toLowerCase();
      if (lower.includes("label") || lower.includes("formlabel") || lower.includes("<label")) {
        detailedTextXs.labels.push({ file, line: lineIdx + 1, text: line.trim() });
      } else if (lower.includes("<th") || lower.includes("tablehead") || lower.includes("tableheader")) {
        detailedTextXs.tableHeaders.push({ file, line: lineIdx + 1, text: line.trim() });
      } else if (lower.includes("cardtitle") || (lower.includes("title") && lower.includes("card"))) {
        detailedTextXs.cardTitles.push({ file, line: lineIdx + 1, text: line.trim() });
      } else if (lower.includes("<td") || lower.includes("tablecell") || lower.includes("tablerow")) {
        detailedTextXs.tableCells.push({ file, line: lineIdx + 1, text: line.trim() });
      } else if (lower.includes("<button") || lower.includes("btn") || lower.includes("button")) {
        detailedTextXs.buttons.push({ file, line: lineIdx + 1, text: line.trim() });
      } else if (lower.includes("badge") || lower.includes("tag") || lower.includes("date") || lower.includes("time") || lower.includes("meta")) {
        detailedTextXs.badgesOrMeta.push({ file, line: lineIdx + 1, text: line.trim() });
      } else {
        detailedTextXs.other++;
      }
    }
  });
});

const report = {
  topUi: Object.values(counts.ui).sort((a,b) => b.totalIssues - a.totalIssues).slice(0, 10),
  topPages: Object.values(counts.pages).sort((a,b) => b.totalIssues - a.totalIssues).slice(0, 20),
  topComponents: Object.values(counts.components).sort((a,b) => b.totalIssues - a.totalIssues).slice(0, 10),
  topOverall: [...Object.values(counts.ui), ...Object.values(counts.pages), ...Object.values(counts.components), ...Object.values(counts.other)]
    .sort((a,b) => b.totalIssues - a.totalIssues).slice(0, 25),
  risks: {
    reactFlowFiles: risks.reactFlow,
    dayPickerFiles: risks.dayPickerOrCalendar,
    dirLtrFiles: risks.dirLtr,
    dirRtlFiles: risks.dirRtl,
    darkModeFilesCount: risks.darkMode.length,
    darkModeSample: risks.darkMode.slice(0, 5),
    contradictionsCount: risks.contradictions.length,
    contradictions: risks.contradictions,
    fixedWidthsTotal: risks.fixedWidths.reduce((acc, f) => acc + f.count, 0),
    fixedWidthsFilesCount: risks.fixedWidths.length,
    topFixedWidths: risks.fixedWidths.sort((a,b) => b.count - a.count).slice(0, 10)
  },
  detailedTextXsCounts: {
    labels: detailedTextXs.labels.length,
    tableHeaders: detailedTextXs.tableHeaders.length,
    cardTitles: detailedTextXs.cardTitles.length,
    tableCells: detailedTextXs.tableCells.length,
    buttons: detailedTextXs.buttons.length,
    badgesOrMeta: detailedTextXs.badgesOrMeta.length,
    other: detailedTextXs.other
  }
};

fs.writeFileSync("/tmp/phase0_detailed.json", JSON.stringify(report, null, 2));
console.log("Analysis done! Check /tmp/phase0_detailed.json");
