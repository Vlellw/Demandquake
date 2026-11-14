import { Fragment, type ReactNode } from "react";

/** Lindström-style breadcrumb strip under the header: links in ink, the current page in navy. */
export function Breadcrumbs({ trail, current }: { trail: ReactNode[]; current: ReactNode }) {
  return (
    <nav aria-label="Breadcrumb" className="border-b border-border bg-background">
      <ol className="mx-auto flex max-w-[1400px] items-center gap-2 overflow-x-auto whitespace-nowrap px-4 py-3 text-xs sm:px-6 [&_a]:font-semibold [&_a]:text-foreground [&_a]:underline-offset-4 [&_a:hover]:underline">
        {trail.map((item, i) => (
          <Fragment key={i}>
            <li className="text-muted-foreground">{item}</li>
            <li aria-hidden="true" className="text-faint">
              /
            </li>
          </Fragment>
        ))}
        <li aria-current="page" className="truncate font-semibold text-primary">
          {current}
        </li>
      </ol>
    </nav>
  );
}
