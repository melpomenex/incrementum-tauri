import { useMemo } from "react";
import handbookMarkdown from "../../../docs/USER_HANDBOOK.md?raw";
import { renderMarkdown } from "../../utils/markdown";

type Heading = {
  level: number;
  title: string;
  id: string;
};

const stripInlineMarkdown = (value: string) =>
  value
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_]+/g, "")
    .trim();

const slugify = (value: string) => {
  const trimmed = value.toLowerCase().replace(/[^\w\s-]/g, "").trim();
  const slug = trimmed.replace(/\s/g, "-");
  return slug || "section";
};

const parseHeadings = (text: string): Heading[] => {
  const lines = text.split(/\r?\n/);
  const seen = new Map<string, number>();
  const headings: Heading[] = [];
  let inCodeBlock = false;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      return;
    }
    if (inCodeBlock) return;

    const match = line.match(/^(#{1,6})\s+(.*)$/);
    if (!match) return;

    const level = match[1].length;
    const title = stripInlineMarkdown(match[2]);
    const base = slugify(title);
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    const id = count > 1 ? `${base}-${count}` : base;
    headings.push({ level, title, id });
  });

  return headings;
};

const addHeadingIds = (html: string, headings: Heading[]) => {
  let index = 0;
  return html.replace(/<h([1-6]) class="([^"]*)">([\s\S]*?)<\/h\1>/g, (_match, level, className, content) => {
    const heading = headings[index++];
    if (!heading) {
      return `<h${level} class="${className}">${content}</h${level}>`;
    }
    return `<h${level} id="${heading.id}" class="${className} scroll-mt-24">${content}</h${level}>`;
  });
};

const fixInternalLinks = (html: string) =>
  html.replace(/<a([^>]*?)href="(#.*?)"([^>]*?)>/g, (_match, before, href, after) => {
    const cleaned = `${before}${after}`
      .replace(/\s*target="_blank"/g, "")
      .replace(/\s*rel="noreferrer"/g, "");
    return `<a${cleaned} href="${href}">`;
  });

export function HandbookSettings() {
  const headings = useMemo(() => parseHeadings(handbookMarkdown), []);
  const rendered = useMemo(() => {
    const html = renderMarkdown(handbookMarkdown);
    return fixInternalLinks(addHeadingIds(html, headings));
  }, [headings]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Handbook</p>
        <h3 className="text-2xl font-semibold text-foreground mt-2">Incrementum User Handbook</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Browse chapters and jump between sections like a printed guide.
        </p>
      </div>

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <aside className="md:sticky md:top-6 md:w-60 md:shrink-0 self-start">
          <div className="border border-border rounded-lg bg-muted/30 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Contents
            </div>
            <nav className="space-y-1 text-sm">
              {headings
                .filter((heading) => heading.level >= 2 && heading.level <= 3)
                .map((heading) => (
                  <a
                    key={heading.id}
                    href={`#${heading.id}`}
                    className={`block rounded px-2 py-1 text-foreground/80 hover:text-foreground hover:bg-muted transition-colors ${
                      heading.level === 3 ? "ml-3 text-xs" : ""
                    }`}
                  >
                    {heading.title}
                  </a>
                ))}
            </nav>
          </div>
        </aside>

        <article className="border border-border rounded-xl bg-card p-6 md:p-8 shadow-sm md:flex-1">
          <div
            className="prose prose-sm sm:prose-base max-w-none prose-headings:font-semibold prose-h1:text-3xl prose-h1:tracking-tight prose-h1:mt-0 prose-h1:pb-4 prose-h1:border-b prose-h1:border-border prose-h2:text-2xl prose-h2:mt-10 prose-h2:pb-2 prose-h2:border-b prose-h2:border-border/60 prose-h3:text-lg prose-h3:mt-6 prose-hr:my-8 prose-p:leading-relaxed prose-a:font-medium"
            dangerouslySetInnerHTML={{ __html: rendered }}
          />
        </article>
      </div>
    </div>
  );
}
