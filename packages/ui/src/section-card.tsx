import type { PropsWithChildren, ReactNode } from "react";

interface SectionCardProps extends PropsWithChildren {
  eyebrow: string;
  title: string;
  footer?: ReactNode;
}

export function SectionCard({
  children,
  eyebrow,
  footer,
  title,
}: SectionCardProps) {
  return (
    <section className="section-card">
      <div className="section-card__eyebrow">{eyebrow}</div>
      <h2 className="section-card__title">{title}</h2>
      <div className="section-card__content">{children}</div>
      {footer ? <div className="section-card__footer">{footer}</div> : null}
    </section>
  );
}

