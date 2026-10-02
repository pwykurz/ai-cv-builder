import type { ReactNode } from 'react';

/**
 * Keeps hyphenated words ("e-commerce") and year ranges ("2021–2023") on one line.
 * A line-end break after the hyphen makes some parsers glue the word together ("ecommerce").
 */
const NO_BREAK = /(\d{4}–\d{4}|[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+)/g;

export function noBreak(text: string): ReactNode {
  return text.split(NO_BREAK).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="nb">
        {part}
      </span>
    ) : (
      part
    ),
  );
}
