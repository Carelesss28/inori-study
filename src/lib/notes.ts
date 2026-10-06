import type { Block, NotePage } from "./types";

/*
 * Plain-text lesson format:
 *   # Heading          → heading
 *   $$ tex $$          → display math (single line)
 *   - item             → bullet list
 *   > text             → highlighted note
 *   ---                → page break
 *   anything else      → paragraph (inline $math$ and `code` allowed)
 */

export function parseNotes(src: string): NotePage[] {
  const pages = src
    .replace(/\r\n/g, "\n")
    .split(/^\s*---\s*$/m)
    .map((chunk) => {
      const blocks: Block[] = [];
      let list: string[] | null = null;
      const flush = () => {
        if (list) blocks.push({ t: "list", items: list });
        list = null;
      };
      for (const raw of chunk.split("\n")) {
        const line = raw.trim();
        if (!line) {
          flush();
          continue;
        }
        if (line.startsWith("- ")) {
          (list ??= []).push(line.slice(2));
          continue;
        }
        flush();
        if (line.startsWith("# ")) blocks.push({ t: "h", text: line.slice(2) });
        else if (line.startsWith("$$") && line.endsWith("$$") && line.length > 4) blocks.push({ t: "math", tex: line.slice(2, -2).trim() });
        else if (line.startsWith("> ")) blocks.push({ t: "note", text: line.slice(2) });
        else blocks.push({ t: "p", text: line });
      }
      flush();
      return { blocks };
    })
    .filter((p) => p.blocks.length > 0);
  return pages;
}

export function serializeNotes(pages: NotePage[]): string {
  return pages
    .map((p) =>
      p.blocks
        .map((b) => {
          switch (b.t) {
            case "h":
              return `# ${b.text}`;
            case "math":
              return `$$ ${b.tex} $$`;
            case "list":
              return b.items.map((i) => `- ${i}`).join("\n");
            case "note":
              return `> ${b.text}`;
            default:
              return b.text;
          }
        })
        .join("\n\n")
    )
    .join("\n\n---\n\n");
}

export const notesTemplate = `# 1.1 Introduction
Write your lesson here. Inline maths works like $E = mc^2$.

$$ \\int_0^1 x^2 \\, dx = \\frac{1}{3} $$

- Bullet points start with a dash
- Each blank line starts a new paragraph

> Notes like this are highlighted.

---

# 1.2 Next page
Three dashes on their own line start a new page.`;
