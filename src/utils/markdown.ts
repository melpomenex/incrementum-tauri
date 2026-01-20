/**
 * Render Markdown text to HTML
 * Supports: headers, lists, tables, code blocks, blockquotes, links, bold, italic, etc.
 */
export function renderMarkdown(text: string): string {
  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const codeBlocks: string[] = [];
  const escaped = escapeHtml(text);
  const withPlaceholders = escaped.replace(/```([\w]*)\n?([\s\S]*?)```/g, (_match, lang, code) => {
    const index = codeBlocks.length;
    const trimmed = code.trim();
    const langClass = lang ? ` data-language="${lang}"` : '';
    codeBlocks.push(
      `<pre class="mt-2 mb-2 overflow-x-auto rounded bg-muted p-3 text-sm"${langClass}><code>${trimmed}</code></pre>`
    );
    return `@@CODEBLOCK_${index}@@`;
  });

  const formatInline = (value: string) => {
    let formatted = value;
    // Inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">$1</code>');
    // Links
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a class="text-primary underline decoration-dotted underline-offset-4 hover:decoration-solid" href="$2" target="_blank" rel="noreferrer">$1</a>');
    // Bold
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    // Italic (underscore)
    formatted = formatted.replace(/\b_(.+?)_\b/g, "<em>$1</em>");
    // Italic (asterisk)
    formatted = formatted.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    return formatted;
  };

  const lines = withPlaceholders.split(/\r?\n/);
  let html = "";
  let listType: "ul" | "ol" | null = null;
  let blockquoteLines: string[] = [];

  const isTableSeparator = (line: string) =>
    /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
  const hasTablePipe = (line: string) => /\|/.test(line);

  const flushList = () => {
    if (listType) {
      html += listType === "ul" ? "</ul>" : "</ol>";
      listType = null;
    }
  };

  const flushBlockquote = () => {
    if (blockquoteLines.length > 0) {
      const content = blockquoteLines.map(formatInline).join("<br>");
      html += `<blockquote class="border-l-4 border-primary/30 pl-4 my-2 italic text-muted-foreground">${content}</blockquote>`;
      blockquoteLines = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    const blockquoteMatch = line.match(/^\s*>\s?(.*)$/);
    const unorderedMatch = line.match(/^\s*[-*+]\s+(.*)$/);
    const orderedMatch = line.match(/^\s*\d+\.\s+(.*)$/);
    const hrMatch = line.match(/^\s*((\*\s*){3,}|(-\s*){3,}|(_\s*){3,})\s*$/);

    // Headers
    if (headingMatch) {
      flushList();
      flushBlockquote();
      const level = headingMatch[1].length;
      const content = formatInline(headingMatch[2]);
      const sizeClass =
        level === 1 ? "text-xl font-bold" :
        level === 2 ? "text-lg font-semibold" :
        level === 3 ? "text-base font-semibold" :
        "text-sm font-semibold";
      html += `<h${level} class="${sizeClass} mt-4 mb-2">${content}</h${level}>`;
      continue;
    }

    // Horizontal rule
    if (hrMatch) {
      flushList();
      flushBlockquote();
      html += '<hr class="my-4 border-border" />';
      continue;
    }

    // Blockquote
    if (blockquoteMatch) {
      flushList();
      blockquoteLines.push(blockquoteMatch[1]);
      continue;
    }

    // Table
    if (hasTablePipe(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      flushList();
      flushBlockquote();
      const headerLine = line;
      i += 2; // Skip separator line
      const rows: string[] = [];
      while (i < lines.length && hasTablePipe(lines[i]) && lines[i].trim() !== "") {
        rows.push(lines[i]);
        i += 1;
      }
      i -= 1;

      const parseRow = (row: string) =>
        row
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((cell) => formatInline(cell.trim()));

      const headerCells = parseRow(headerLine);
      const bodyRows = rows.map(parseRow);

      html += '<div class="overflow-x-auto my-2"><table class="w-full border-collapse text-sm">';
      html += "<thead><tr>";
      headerCells.forEach((cell) => {
        html += `<th class="border border-border bg-muted/50 px-3 py-2 text-left font-semibold">${cell}</th>`;
      });
      html += "</tr></thead>";
      html += "<tbody>";
      bodyRows.forEach((cells) => {
        html += "<tr>";
        cells.forEach((cell) => {
          html += `<td class="border border-border px-3 py-2 align-top">${cell}</td>`;
        });
        html += "</tr>";
      });
      html += "</tbody></table></div>";
      continue;
    }

    // Unordered list
    if (unorderedMatch) {
      flushBlockquote();
      if (listType !== "ul") {
        flushList();
        listType = "ul";
        html += '<ul class="list-disc pl-6 my-2 space-y-1">';
      }
      html += `<li>${formatInline(unorderedMatch[1])}</li>`;
      continue;
    }

    // Ordered list
    if (orderedMatch) {
      flushBlockquote();
      if (listType !== "ol") {
        flushList();
        listType = "ol";
        html += '<ol class="list-decimal pl-6 my-2 space-y-1">';
      }
      html += `<li>${formatInline(orderedMatch[1])}</li>`;
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      flushList();
      flushBlockquote();
      continue;
    }

    // Regular paragraph
    flushList();
    flushBlockquote();
    html += `<p class="my-2">${formatInline(line)}</p>`;
  }

  flushList();
  flushBlockquote();

  // Restore code blocks
  codeBlocks.forEach((block, index) => {
    html = html.replace(`@@CODEBLOCK_${index}@@`, block);
  });

  return html;
}
