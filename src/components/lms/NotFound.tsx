"use client";

import Link from "next/link";
import { Bear } from "@/components/art/Illustrations";
import { EmptyState, buttonClass } from "@/components/ui/primitives";
import { PageHeader } from "@/components/shell/Shell";

export function NotFound({ what, back }: { what: string; back: { href: string; label: string } }) {
  return (
    <>
      <PageHeader back={back} title={`${what[0].toUpperCase()}${what.slice(1)} not found`} />
      <EmptyState
        art={<Bear pose="peek" className="w-28" />}
        title={`We couldn't find that ${what}`}
        body="It may have been deleted, or the link is out of date."
        action={
          <Link href={back.href} className={buttonClass()}>
            {back.label}
          </Link>
        }
      />
    </>
  );
}
