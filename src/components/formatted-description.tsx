/** Small safe formatter: React escapes all text; no HTML from the CMS is executed. */
export function FormattedDescription({ text }: { text: string }) {
  return (
    <div className="description">
      {text
        .split(/\n\s*\n/)
        .filter(Boolean)
        .map((block, i) => {
          if (block.startsWith("## ")) return <h3 key={i}>{block.slice(3)}</h3>;
          const lines = block.split("\n");
          if (lines.every((l) => /^[-*] /.test(l)))
            return (
              <ul key={i}>
                {lines.map((l, n) => (
                  <li key={n}>{l.slice(2)}</li>
                ))}
              </ul>
            );
          return (
            <p key={i} style={{ whiteSpace: "pre-line" }}>
              {block}
            </p>
          );
        })}
    </div>
  );
}
