import { productModules, supportedPlatforms } from "@creator-cfo/schemas";
import { SectionCard } from "@creator-cfo/ui";
import { moduleCount, platformCount } from "../src/lib/platforms";
import { siteMetadata } from "../src/lib/site";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero__copy">
          <p className="eyebrow">Project foundation</p>
          <h1>{siteMetadata.headline}</h1>
          <p className="hero__summary">{siteMetadata.subheadline}</p>
        </div>

        <div className="hero__stats">
          <div>
            <span className="stat__value">{moduleCount}</span>
            <span className="stat__label">core modules staged</span>
          </div>
          <div>
            <span className="stat__value">{platformCount}</span>
            <span className="stat__label">creator platforms mapped</span>
          </div>
        </div>
      </section>

      <div className="grid">
        <SectionCard
          eyebrow="Product scope"
          title="Operating modules"
          footer={<span>Backed by shared domain constants in packages/schemas.</span>}
        >
          <ul className="list">
            {productModules.map((module) => (
              <li key={module.slug}>
                <strong>{module.title}</strong>
                <span>{module.summary}</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard
          eyebrow="Go-to-market"
          title="Initial creator channels"
          footer={<span>Aligned with the bootstrap summary contract in the API.</span>}
        >
          <ul className="pill-list">
            {supportedPlatforms.map((platform) => (
              <li key={platform}>{platform}</li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard
          eyebrow="Quality gates"
          title="Agent-friendly guardrails"
          footer={<span>Review contracts and system behavior, not isolated commits.</span>}
        >
          <ul className="list">
            {siteMetadata.guardrails.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </main>
  );
}

