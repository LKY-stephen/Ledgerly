import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import {
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const databaseName = "creator-cfo-local.db";
const rootDirectoryName = "creator-cfo-vault";
const sourceSystem = "sample_package_generator";
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixturesRoot = join(rootDir, "tests", "fixtures", "sample-database-packages");
const tables = [
  `CREATE TABLE IF NOT EXISTS entities (
    entity_id TEXT PRIMARY KEY NOT NULL,
    legal_name TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    base_currency TEXT NOT NULL,
    default_timezone TEXT NOT NULL,
    created_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS counterparties (
    counterparty_id TEXT PRIMARY KEY NOT NULL,
    entity_id TEXT NOT NULL,
    counterparty_type TEXT NOT NULL,
    display_name TEXT NOT NULL,
    raw_reference TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (entity_id) REFERENCES entities(entity_id)
  );`,
  `CREATE TABLE IF NOT EXISTS records (
    record_id TEXT PRIMARY KEY NOT NULL,
    entity_id TEXT NOT NULL,
    record_status TEXT NOT NULL,
    source_system TEXT NOT NULL,
    description TEXT NOT NULL,
    memo TEXT,
    occurred_on TEXT NOT NULL,
    currency TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    source_label TEXT NOT NULL,
    target_label TEXT NOT NULL,
    source_counterparty_id TEXT,
    target_counterparty_id TEXT,
    record_kind TEXT NOT NULL,
    category_code TEXT,
    subcategory_code TEXT,
    tax_category_code TEXT,
    tax_line_code TEXT,
    business_use_bps INTEGER NOT NULL DEFAULT 10000,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (entity_id) REFERENCES entities(entity_id),
    FOREIGN KEY (source_counterparty_id) REFERENCES counterparties(counterparty_id),
    FOREIGN KEY (target_counterparty_id) REFERENCES counterparties(counterparty_id)
  );`,
  `CREATE TABLE IF NOT EXISTS record_entry_classifications (
    record_id TEXT PRIMARY KEY NOT NULL,
    entry_mode TEXT NOT NULL,
    user_classification TEXT NOT NULL,
    classification_status TEXT NOT NULL,
    resolver_code TEXT,
    resolver_note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (record_id) REFERENCES records(record_id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS tax_year_profiles (
    entity_id TEXT NOT NULL,
    tax_year INTEGER NOT NULL,
    accounting_method TEXT NOT NULL DEFAULT 'cash',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (entity_id, tax_year),
    FOREIGN KEY (entity_id) REFERENCES entities(entity_id)
  );`,
  `CREATE TABLE IF NOT EXISTS evidences (
    evidence_id TEXT PRIMARY KEY NOT NULL,
    entity_id TEXT NOT NULL,
    evidence_kind TEXT NOT NULL,
    file_path TEXT NOT NULL DEFAULT '',
    parse_status TEXT NOT NULL DEFAULT 'pending',
    extracted_data TEXT,
    captured_date TEXT NOT NULL,
    captured_amount_cents INTEGER NOT NULL,
    captured_source TEXT NOT NULL,
    captured_target TEXT NOT NULL,
    captured_description TEXT NOT NULL,
    source_system TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (entity_id) REFERENCES entities(entity_id)
  );`,
  `CREATE TABLE IF NOT EXISTS evidence_files (
    evidence_file_id TEXT PRIMARY KEY NOT NULL,
    evidence_id TEXT NOT NULL,
    vault_collection TEXT NOT NULL,
    relative_path TEXT NOT NULL,
    original_file_name TEXT NOT NULL,
    mime_type TEXT,
    size_bytes INTEGER,
    sha256_hex TEXT NOT NULL,
    captured_at TEXT NOT NULL,
    is_primary INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (evidence_id) REFERENCES evidences(evidence_id)
  );`,
  `CREATE TABLE IF NOT EXISTS record_evidence_links (
    record_id TEXT NOT NULL,
    evidence_id TEXT NOT NULL,
    link_role TEXT NOT NULL,
    is_primary INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL,
    PRIMARY KEY (record_id, evidence_id, link_role),
    FOREIGN KEY (record_id) REFERENCES records(record_id),
    FOREIGN KEY (evidence_id) REFERENCES evidences(evidence_id)
  );`,
];
const bootstrapManifest = {
  databaseName,
  fileCollections: [
    {
      slug: "evidence-objects",
      title: "Evidence Objects",
      summary: "Canonical evidence binaries stored once by content hash.",
      defaultExtension: "bin",
      samplePath: "evidence-objects/entity-main/uploads/2026/04/sample-receipt.pdf",
    },
    {
      slug: "evidence-manifests",
      title: "Evidence Manifests",
      summary: "Per-evidence manifest files that describe linked documents and metadata.",
      defaultExtension: "json",
      samplePath: "evidence-manifests/sample-evidence.json",
    },
    {
      slug: "evidence-derived",
      title: "Evidence Derived",
      summary: "Generated previews or future sidecar files derived from canonical evidence.",
      defaultExtension: "jpg",
      samplePath: "evidence-derived/sample-evidence/preview-1.jpg",
    },
    {
      slug: "invoice-exports",
      title: "Invoice Exports",
      summary: "Generated invoice PDFs or shareable drafts for clients.",
      defaultExtension: "pdf",
      samplePath: "invoice-exports/2026/sample-record.pdf",
    },
    {
      slug: "tax-support",
      title: "Tax Support",
      summary: "Exports reserved for period-close, tax packaging, and audit support.",
      defaultExtension: "zip",
      samplePath: "tax-support/2026-q1/evidence-package.zip",
    },
  ],
  schemaObjects: {
    indexes: [
      "counterparties_entity_name_idx",
      "records_entity_occurred_status_idx",
      "records_entity_tax_line_occurred_status_idx",
      "evidences_entity_parse_status_created_idx",
      "evidence_files_sha_idx",
      "record_evidence_primary_idx",
    ],
    tables: [
      "entities",
      "counterparties",
      "records",
      "record_entry_classifications",
      "tax_year_profiles",
      "evidences",
      "evidence_files",
      "record_evidence_links",
    ],
    views: [],
  },
  version: 4,
};
const packageSpecs = [
  {
    directoryName: "package-a-clean",
    entityLegalName: "North Star Creator Studio",
    packageTitle: "Package A Clean",
    records: [
      incomeRecord("pkg-a-record-01", "2025-01-15", "reconciled", "YouTube AdSense January payout", 280000, "YouTube AdSense", "North Star Business Checking", "platform-adsense", "youtube-adsense-january", "January advertising revenue batch from YouTube AdSense."),
      expenseRecord("pkg-a-record-02", "2025-01-22", "posted", "Paid Meta ads campaign for launch week", 64000, "North Star Business Checking", "Meta Ads", "line8", "advertising", "launch-campaign-meta-ads", "Meta Ads receipt covering the January launch campaign."),
      incomeRecord("pkg-a-record-03", "2025-02-14", "posted", "Patreon supporter memberships payout", 145000, "Patreon", "North Star Business Checking", "membership-income", "patreon-memberships-payout", "Monthly Patreon creator payout statement."),
      expenseRecord("pkg-a-record-04", "2025-02-18", "reconciled", "Agency commission for sponsor sourcing", 72000, "North Star Business Checking", "Brightline Talent Agency", "line10", "commissions-fees", "agency-commission-brightline", "Agency invoice for campaign sourcing commission."),
      expenseRecord("pkg-a-record-05", "2025-02-26", "reconciled", "Freelance video editor retainer", 125000, "North Star Business Checking", "Jordan Video Editing", "line11", "contract-labor", "freelance-video-editor", "Contract labor invoice for short-form editing services."),
      incomeRecord("pkg-a-record-06", "2025-03-20", "reconciled", "Brand sponsorship payment from Aurora Audio", 325000, "Aurora Audio", "North Star Business Checking", "brand-sponsorship", "aurora-audio-sponsorship", "Signed sponsorship payout statement from Aurora Audio."),
      expenseRecord("pkg-a-record-07", "2025-03-10", "posted", "Annual equipment insurance premium", 54000, "North Star Business Checking", "Founders Shield", "line15", "insurance-other-than-health", "equipment-insurance-premium", "Insurance certificate and premium receipt for filming gear."),
      expenseRecord("pkg-a-record-08", "2025-04-01", "posted", "Business card interest charge", 18000, "North Star Business Checking", "Mercury Credit", "line16b", "other-interest", "business-card-interest-charge", "Monthly statement excerpt showing business interest charge."),
      expenseRecord("pkg-a-record-09", "2025-04-22", "reconciled", "CPA tax planning session", 95000, "North Star Business Checking", "Rivera CPA Group", "line17", "legal-professional-services", "cpa-tax-planning-session", "Professional services invoice for creator tax planning."),
      incomeRecord("pkg-a-record-10", "2025-05-01", "posted", "Affiliate network payout", 98000, "Impact Affiliate", "North Star Business Checking", "affiliate-income", "impact-affiliate-payout", "Affiliate network payout detail for April conversions."),
      expenseRecord("pkg-a-record-11", "2025-05-17", "reconciled", "Studio office supply run", 43000, "North Star Business Checking", "Staples", "line18", "office-expense", "studio-office-supply-run", "Office supply receipt for printer ink, labels, and storage bins."),
      expenseRecord("pkg-a-record-12", "2025-06-02", "posted", "Camera lease for travel shoot", 86000, "North Star Business Checking", "LensRentals", "line20a", "rent-lease-equipment", "camera-lease-travel-shoot", "Equipment rental invoice for travel filming kit.", "USD", 7500),
      expenseRecord("pkg-a-record-13", "2025-06-21", "reconciled", "Studio sublease rent", 210000, "North Star Business Checking", "Grand Avenue Studios", "line20b", "rent-lease-other-property", "studio-sublease-rent", "Monthly studio sublease invoice for creator workspace."),
      incomeRecord("pkg-a-record-14", "2025-07-12", "reconciled", "Shopify merch settlement", 182000, "Shopify Payments", "North Star Business Checking", "merch-income", "shopify-merch-settlement", "Shopify settlement report for merch orders."),
      expenseRecord("pkg-a-record-15", "2025-07-05", "posted", "Microphone repair service", 26000, "North Star Business Checking", "Echo Electronics Repair", "line21", "repairs-maintenance", "microphone-repair-service", "Repair invoice for damaged studio microphone."),
      expenseRecord("pkg-a-record-16", "2025-08-09", "reconciled", "Packaging and production supplies", 37000, "North Star Business Checking", "Uline", "line22", "supplies", "packaging-production-supplies", "Supply receipt for packaging materials and tape."),
      incomeRecord("pkg-a-record-17", "2025-09-03", "posted", "Course launch proceeds", 410000, "Podia", "North Star Business Checking", "course-income", "course-launch-proceeds", "Course platform payout for prerecorded class launch."),
      expenseRecord("pkg-a-record-18", "2025-09-11", "reconciled", "City business license renewal", 14000, "North Star Business Checking", "Los Angeles City Clerk", "line23", "taxes-licenses", "city-business-license-renewal", "Receipt for city business license renewal."),
      expenseRecord("pkg-a-record-19", "2025-10-04", "posted", "Creator convention travel lodging", 132000, "North Star Business Checking", "Delta Conferences", "line24a", "travel", "creator-convention-travel", "Travel receipt packet for creator convention attendance."),
      incomeRecord("pkg-a-record-20", "2025-11-08", "reconciled", "Direct consulting retainer", 220000, "Lumen Fitness", "North Star Business Checking", "consulting-income", "direct-consulting-retainer", "Client remittance advice for consulting retainer."),
      expenseRecord("pkg-a-record-21", "2025-11-15", "reconciled", "Fiber internet and upload plan", 69000, "North Star Business Checking", "Spectrum Business", "line25", "utilities", "fiber-internet-upload-plan", "Business internet bill for upload and livestream service.", "USD", 9000),
      incomeRecord("pkg-a-record-22", "2025-12-28", "posted", "TikTok creator fund payout", 167000, "TikTok Creator Rewards", "North Star Business Checking", "platform-bonus-income", "tiktok-creator-fund-payout", "Platform payout report for TikTok creator rewards."),
      expenseRecord("pkg-a-record-23", "2025-12-05", "reconciled", "Chargeback admin fee", 29000, "North Star Business Checking", "Stripe", "line27a", "other-expense", "chargeback-admin-fee", "Platform fee notice for disputed merch order."),
      personalRecord("pkg-a-record-24", "2026-01-09", "posted", "Owner dinner during family trip", 18000, "North Star Business Checking", "Harbor Grill", "owner-draw", "owner-dinner-family-trip", "Personal spending receipt intentionally excluded from tax totals."),
    ],
  },
  {
    directoryName: "package-b-mixed",
    entityLegalName: "Moonrise Studio Books",
    packageTitle: "Package B Mixed",
    records: [
      incomeRecord("pkg-b-record-01", "2024-08-06", "reconciled", "Autumn brand partnership payment", 300000, "Polaris Outdoor", "Moonrise Business Checking", "brand-partnership-income", "autumn-brand-partnership", "Brand payment advice for seasonal campaign."),
      incomeRecord("pkg-b-record-02", "2024-09-14", "posted", "Twitch stream payout", 175000, "Twitch", "Moonrise Business Checking", "livestream-income", "twitch-stream-payout", "Platform payout summary for livestream subscriptions."),
      expenseRecord("pkg-b-record-03", "2024-10-01", "reconciled", "Google Ads retargeting spend", 88000, "Moonrise Business Checking", "Google Ads", "line8", "advertising", "google-ads-retargeting-spend", "Advertising receipt for retargeting spend."),
      expenseRecord("pkg-b-record-04", "2024-11-19", "posted", "Packaging inserts for merch orders", 25000, "Moonrise Business Checking", "Sticker Mule", "line22", "supplies", "packaging-inserts-merch-orders", "Supply receipt for merch package inserts."),
      personalRecord("pkg-b-record-05", "2024-12-12", "reconciled", "Holiday gifts for family", 42000, "Moonrise Business Checking", "Target", "owner-draw", "holiday-gifts-family", "Personal spending kept outside business totals."),
      incomeRecord("pkg-b-record-06", "2025-01-09", "reconciled", "Licensing payment for archive footage", 210000, "Atlas Licensing", "Moonrise Business Checking", "licensing-income", "licensing-payment-archive-footage", "Licensing remittance for archive footage usage."),
      expenseRecord("pkg-b-record-07", "2025-02-18", "posted", "Affiliate manager commission", 46000, "Moonrise Business Checking", "Fable Partnerships", "line10", "commissions-fees", "affiliate-manager-commission", "Commission invoice from affiliate partnerships manager."),
      expenseRecord("pkg-b-record-08", "2025-03-23", "reconciled", "Rehearsal space rent", 98000, "Moonrise Business Checking", "Stagehouse LA", "line20b", "rent-lease-other-property", "rehearsal-space-rent", "Monthly rehearsal space rental invoice."),
      expenseRecord("pkg-b-record-09", "2025-04-15", "posted", "Phone and hotspot plan", 36000, "Moonrise Business Checking", "T-Mobile Business", "line25", "utilities", "phone-hotspot-plan", "Business mobile plan statement.", "USD", 8500),
      expenseRecord("pkg-b-record-10", "2025-05-21", "reconciled", "Bookkeeping cleanup project", 67000, "Moonrise Business Checking", "Ledger Lane", "line27a", "other-expense", "bookkeeping-cleanup-project", "Project invoice for historical bookkeeping cleanup."),
      incomeRecord("pkg-b-record-11", "2025-06-11", "reconciled", "Workshop ticket sales payout", 184000, "Eventbrite", "Moonrise Business Checking", "event-income", "workshop-ticket-sales-payout", "Event ticket payout for in-person creator workshop."),
      expenseRecord("pkg-b-record-12", "2025-07-02", "posted", "Conference flight and hotel", 94000, "Moonrise Business Checking", "TravelPerk", "line24a", "travel", "conference-flight-hotel", "Travel receipt for conference attendance."),
      expenseRecord("pkg-b-record-13", "2025-08-27", "reconciled", "State filing fee", 19000, "Moonrise Business Checking", "California SOS", "line23", "taxes-licenses", "state-filing-fee", "Receipt for annual state filing."),
      expenseRecord("pkg-b-record-14", "2025-09-08", "reconciled", "Counsel review for contract update", 78000, "Moonrise Business Checking", "Bennett Legal", "line17", "legal-professional-services", "counsel-review-contract-update", "Legal invoice for contract review."),
      incomeRecord("pkg-b-record-15", "2025-10-30", "posted", "Client retainer for branded mini-series", 255000, "North Fork Foods", "Moonrise Business Checking", "client-service-income", "client-retainer-branded-mini-series", "Client remittance advice for branded mini-series retainer."),
      expenseRecord("pkg-b-record-16", "2025-11-14", "reconciled", "Editor subcontractor invoice", 112000, "Moonrise Business Checking", "Cutline Editorial", "line11", "contract-labor", "editor-subcontractor-invoice", "Contract labor invoice for series edit support."),
      expenseRecord("pkg-b-record-17", "2025-12-22", "posted", "Liability policy renewal", 49000, "Moonrise Business Checking", "Simply Business", "line15", "insurance-other-than-health", "liability-policy-renewal", "Insurance renewal receipt for creator liability coverage."),
      incomeRecord("pkg-b-record-18", "2026-01-05", "reconciled", "Sponsorship renewal payment", 340000, "Nimbus Audio", "Moonrise Business Checking", "brand-sponsorship-income", "sponsorship-renewal-payment", "Brand sponsor remittance for renewal campaign."),
      incomeRecord("pkg-b-record-19", "2026-01-28", "posted", "Affiliate payout for January placements", 126000, "PartnerStack", "Moonrise Business Checking", "affiliate-income", "affiliate-payout-january-placements", "Affiliate network payout statement for January placements."),
      expenseRecord("pkg-b-record-20", "2026-02-13", "reconciled", "European editing suite subscription", 52000, "Moonrise Business Checking", "EditFlow EU", "line18", "office-expense", "european-editing-suite-subscription", "EUR-denominated subscription receipt that remains review-blocked in the current tax query path.", "EUR"),
      expenseRecord("pkg-b-record-21", "2026-03-07", "posted", "Camera gimbal repair", 31000, "Moonrise Business Checking", "Frame Fix Lab", "line21", "repairs-maintenance", "camera-gimbal-repair", "Repair invoice for creator camera gimbal."),
      expenseRecord("pkg-b-record-22", "2026-04-19", "reconciled", "Filming van rental", 118000, "Moonrise Business Checking", "City Motion Rentals", "line20a", "rent-lease-equipment", "filming-van-rental", "Vehicle rental invoice for branded campaign shoot.", "USD", 6000),
      expenseRecord("pkg-b-record-23", "2026-05-03", "posted", "Chargeback investigation fee", 24000, "Moonrise Business Checking", "PayPal", "line27a", "other-expense", "chargeback-investigation-fee", "Platform fee notice for chargeback investigation."),
      personalRecord("pkg-b-record-24", "2026-05-29", "reconciled", "Home furniture purchase", 85000, "Moonrise Business Checking", "West Elm", "owner-draw", "home-furniture-purchase", "Personal spending receipt intentionally excluded from business and tax totals."),
    ],
  },
];

main();

function main() {
  rmSync(fixturesRoot, { force: true, recursive: true });
  mkdirSync(fixturesRoot, { recursive: true });
  writeFixturesReadme();

  for (const spec of packageSpecs) {
    generatePackage(spec);
  }

  process.stdout.write(
    `Generated ${packageSpecs.length} sample database packages under ${fixturesRoot}\n`,
  );
}

function generatePackage(spec) {
  const packageDirectory = join(fixturesRoot, spec.directoryName);
  const packageRoot = join(packageDirectory, rootDirectoryName);
  const evidenceObjectsRoot = join(packageRoot, "evidence-objects");
  const evidenceManifestRoot = join(packageRoot, "evidence-manifests");
  const databasePath = join(packageRoot, databaseName);
  const entityId = "entity-main";
  const entityCreatedAt = "2024-08-01T08:00:00.000Z";

  mkdirSync(evidenceObjectsRoot, { recursive: true });
  mkdirSync(evidenceManifestRoot, { recursive: true });

  const database = new DatabaseSync(databasePath);

  try {
    database.exec("PRAGMA foreign_keys = ON;");

    for (const statement of tables) {
      database.exec(statement);
    }

    const insertEntity = database.prepare(
      `INSERT INTO entities (
        entity_id,
        legal_name,
        entity_type,
        base_currency,
        default_timezone,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?);`,
    );
    const insertCounterparty = database.prepare(
      `INSERT INTO counterparties (
        counterparty_id,
        entity_id,
        counterparty_type,
        display_name,
        raw_reference,
        notes,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
    );
    const insertRecord = database.prepare(
      `INSERT INTO records (
        record_id,
        entity_id,
        record_status,
        source_system,
        description,
        memo,
        occurred_on,
        currency,
        amount_cents,
        source_label,
        target_label,
        source_counterparty_id,
        target_counterparty_id,
        record_kind,
        category_code,
        subcategory_code,
        tax_category_code,
        tax_line_code,
        business_use_bps,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    );
    const insertClassification = database.prepare(
      `INSERT INTO record_entry_classifications (
        record_id,
        entry_mode,
        user_classification,
        classification_status,
        resolver_code,
        resolver_note,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    );
    const insertTaxYearProfile = database.prepare(
      `INSERT INTO tax_year_profiles (
        entity_id,
        tax_year,
        accounting_method,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?);`,
    );
    const insertEvidence = database.prepare(
      `INSERT INTO evidences (
        evidence_id,
        entity_id,
        evidence_kind,
        file_path,
        parse_status,
        extracted_data,
        captured_date,
        captured_amount_cents,
        captured_source,
        captured_target,
        captured_description,
        source_system,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    );
    const insertEvidenceFile = database.prepare(
      `INSERT INTO evidence_files (
        evidence_file_id,
        evidence_id,
        vault_collection,
        relative_path,
        original_file_name,
        mime_type,
        size_bytes,
        sha256_hex,
        captured_at,
        is_primary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    );
    const insertLink = database.prepare(
      `INSERT INTO record_evidence_links (
        record_id,
        evidence_id,
        link_role,
        is_primary,
        notes,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?);`,
    );

    insertEntity.run(
      entityId,
      spec.entityLegalName,
      "sole_proprietorship",
      "USD",
      "America/Los_Angeles",
      entityCreatedAt,
    );

    const counterpartyMap = buildCounterpartyMap(spec.directoryName, spec.records);

    for (const counterparty of counterpartyMap.values()) {
      insertCounterparty.run(
        counterparty.counterpartyId,
        entityId,
        counterparty.counterpartyType,
        counterparty.displayName,
        counterparty.displayName,
        "Auto-generated for the sample portable package.",
        entityCreatedAt,
      );
    }

    const years = [...new Set(spec.records.map((record) => Number(record.occurredOn.slice(0, 4))))].sort();

    for (const year of years) {
      insertTaxYearProfile.run(
        entityId,
        year,
        "cash",
        `${year}-01-01T00:00:00.000Z`,
        `${year}-01-01T00:00:00.000Z`,
      );
    }

    for (const record of spec.records) {
      const sourceCounterparty = counterpartyMap.get(record.sourceLabel);
      const targetCounterparty = counterpartyMap.get(record.targetLabel);
      const evidenceId = `${record.recordId}-evidence`;
      const evidenceFileId = `${record.recordId}-file`;
      const originalFileName = `${record.fileStem}.pdf`;
      const capturedAt = buildCapturedAt(record.occurredOn);
      const relativePath = buildEvidenceUploadPath(entityId, capturedAt, originalFileName);
      const absoluteEvidencePath = join(packageRoot, relativePath);
      const evidenceLines = [
        spec.packageTitle,
        `Record: ${record.recordId}`,
        `Type: ${record.evidenceKind}`,
        `Date: ${record.occurredOn}`,
        `Amount: ${formatCurrency(record.currency, record.amountCents)}`,
        `Description: ${record.description}`,
        `From: ${record.sourceLabel}`,
        `To: ${record.targetLabel}`,
        `Memo: ${record.memo}`,
      ];
      const pdfBuffer = createPdfBuffer(evidenceLines);
      const sha256Hex = createHash("sha256").update(pdfBuffer).digest("hex");
      const manifestPath = buildEvidenceManifestPath(evidenceId);
      const extractedData = JSON.stringify(
        {
          candidates: {
            amountCents: record.amountCents,
            category: record.categoryCode,
            date: record.occurredOn,
            description: record.description,
            notes: record.memo,
            source: record.sourceLabel,
            target: record.targetLabel,
            taxCategory: record.taxCategoryCode,
          },
          fields: {
            amountCents: record.amountCents,
            category: record.categoryCode,
            date: record.occurredOn,
            description: record.description,
            notes: record.memo,
            source: record.sourceLabel,
            target: record.targetLabel,
            taxCategory: record.taxCategoryCode,
          },
          model: null,
          parser: "rule_fallback",
          rawLines: evidenceLines,
          rawSummary: `${record.description} evidence package`,
          rawText: evidenceLines.join("\n"),
          sourceLabel: sourceSystem,
          warnings:
            record.currency === "USD"
              ? []
              : ["Current local Schedule C queries require USD-backed line mappings for authoritative downstream tax preview support."],
        },
        null,
        2,
      );

      ensureDirectory(dirname(absoluteEvidencePath));
      writeFileSync(absoluteEvidencePath, pdfBuffer);
      writeJson(join(packageRoot, manifestPath), {
        evidenceId,
        evidenceKind: record.evidenceKind,
        originalFileName,
        packageDirectory: spec.directoryName,
        recordId: record.recordId,
        relativePath,
        summary: record.description,
      });

      insertRecord.run(
        record.recordId,
        entityId,
        record.recordStatus,
        sourceSystem,
        record.description,
        record.memo,
        record.occurredOn,
        record.currency,
        record.amountCents,
        record.sourceLabel,
        record.targetLabel,
        sourceCounterparty?.counterpartyId ?? null,
        targetCounterparty?.counterpartyId ?? null,
        record.recordKind,
        record.categoryCode,
        record.subcategoryCode,
        record.taxCategoryCode,
        record.taxLineCode,
        record.businessUseBps,
        buildCreatedAt(record.occurredOn),
        buildUpdatedAt(record.occurredOn),
      );
      insertClassification.run(
        record.recordId,
        "manual",
        record.userClassification,
        "resolved",
        `sample_package_${record.userClassification}`,
        "Deterministic sample package fixture.",
        buildCreatedAt(record.occurredOn),
        buildUpdatedAt(record.occurredOn),
      );
      insertEvidence.run(
        evidenceId,
        entityId,
        record.evidenceKind,
        relativePath,
        "parsed",
        extractedData,
        record.occurredOn,
        record.amountCents,
        record.sourceLabel,
        record.targetLabel,
        record.description,
        sourceSystem,
        capturedAt,
      );
      insertEvidenceFile.run(
        evidenceFileId,
        evidenceId,
        "evidence-objects",
        relativePath,
        originalFileName,
        "application/pdf",
        pdfBuffer.byteLength,
        sha256Hex,
        capturedAt,
        1,
      );
      insertLink.run(
        record.recordId,
        evidenceId,
        "primary",
        1,
        "Primary evidence generated for the sample package.",
        capturedAt,
      );
    }

    database.exec("VACUUM;");
  } finally {
    if (typeof database.close === "function") {
      database.close();
    }
  }

  writeJson(join(packageRoot, "bootstrap-manifest.json"), bootstrapManifest);
  writeJson(join(packageDirectory, "package-summary.json"), buildPackageSummary(spec));
}

function buildPackageSummary(spec) {
  const years = [...new Set(spec.records.map((record) => Number(record.occurredOn.slice(0, 4))))].sort();

  return {
    databaseName,
    packageDirectory: spec.directoryName,
    packageTitle: spec.packageTitle,
    recordCount: spec.records.length,
    evidenceCount: spec.records.length,
    taxYears: years,
  };
}

function buildCounterpartyMap(packageId, records) {
  const labels = new Set();

  for (const record of records) {
    labels.add(record.sourceLabel);
    labels.add(record.targetLabel);
  }

  const map = new Map();

  for (const label of labels) {
    map.set(label, {
      counterpartyId: `${packageId}-${sanitizeVaultPathSegment(label)}`,
      counterpartyType: inferCounterpartyType(label),
      displayName: label,
    });
  }

  return map;
}

function inferCounterpartyType(label) {
  const normalized = label.toLowerCase();

  if (
    normalized.includes("checking") ||
    normalized.includes("credit") ||
    normalized.includes("bank") ||
    normalized.includes("card")
  ) {
    return "financial_account";
  }

  if (
    normalized.includes("youtube") ||
    normalized.includes("patreon") ||
    normalized.includes("tiktok") ||
    normalized.includes("twitch") ||
    normalized.includes("partnerstack") ||
    normalized.includes("impact") ||
    normalized.includes("shopify") ||
    normalized.includes("podia") ||
    normalized.includes("eventbrite")
  ) {
    return "platform";
  }

  if (
    normalized.includes("audio") ||
    normalized.includes("fitness") ||
    normalized.includes("foods") ||
    normalized.includes("outdoor") ||
    normalized.includes("licensing")
  ) {
    return "client";
  }

  return "vendor";
}

function incomeRecord(recordId, occurredOn, recordStatus, description, amountCents, sourceLabel, targetLabel, subcategoryCode, fileStem, memo) {
  return {
    amountCents,
    businessUseBps: 10000,
    categoryCode: "income",
    currency: "USD",
    description,
    evidenceKind: "payout_statement",
    fileStem,
    memo,
    occurredOn,
    recordId,
    recordKind: "income",
    recordStatus,
    sourceLabel,
    subcategoryCode,
    targetLabel,
    taxCategoryCode: "schedule-c-gross-receipts",
    taxLineCode: "line1",
    userClassification: "income",
  };
}

function expenseRecord(recordId, occurredOn, recordStatus, description, amountCents, sourceLabel, targetLabel, taxLineCode, subcategoryCode, fileStem, memo, currency = "USD", businessUseBps = 10000) {
  return {
    amountCents,
    businessUseBps,
    categoryCode: "expense",
    currency,
    description,
    evidenceKind: "receipt",
    fileStem,
    memo,
    occurredOn,
    recordId,
    recordKind: "expense",
    recordStatus,
    sourceLabel,
    subcategoryCode,
    targetLabel,
    taxCategoryCode: `schedule-c-${taxLineCode}`,
    taxLineCode,
    userClassification: "expense",
  };
}

function personalRecord(recordId, occurredOn, recordStatus, description, amountCents, sourceLabel, targetLabel, subcategoryCode, fileStem, memo) {
  return {
    amountCents,
    businessUseBps: 0,
    categoryCode: "personal-spending",
    currency: "USD",
    description,
    evidenceKind: "receipt",
    fileStem,
    memo,
    occurredOn,
    recordId,
    recordKind: "personal_spending",
    recordStatus,
    sourceLabel,
    subcategoryCode,
    targetLabel,
    taxCategoryCode: null,
    taxLineCode: null,
    userClassification: "personal_spending",
  };
}

function buildCreatedAt(dateValue) {
  return `${dateValue}T08:00:00.000Z`;
}

function buildUpdatedAt(dateValue) {
  return `${dateValue}T08:30:00.000Z`;
}

function buildCapturedAt(dateValue) {
  return `${dateValue}T09:00:00.000Z`;
}

function writeFixturesReadme() {
  const lines = [
    "# Sample Database Packages",
    "",
    "These fixtures are deterministic portable CFO packages generated by `node scripts/generate_sample_database_packages.mjs`.",
    "",
    "Import one of these databases by selecting the SQLite file inside the matching package root:",
    "",
    "- `package-a-clean/creator-cfo-vault/creator-cfo-local.db`",
    "- `package-b-mixed/creator-cfo-vault/creator-cfo-local.db`",
    "",
    "The sibling `evidence-objects/` and `evidence-manifests/` directories are part of each portable package and are required by the current integrity checks.",
  ];

  writeFileSync(join(fixturesRoot, "README.md"), `${lines.join("\n")}\n`);
}

function buildEvidenceUploadPath(entityId, capturedAt, fileName) {
  const timestamp = new Date(capturedAt);
  const year = Number.isNaN(timestamp.getTime()) ? "unknown-year" : String(timestamp.getUTCFullYear());
  const month = Number.isNaN(timestamp.getTime())
    ? "unknown-month"
    : String(timestamp.getUTCMonth() + 1).padStart(2, "0");

  return `evidence-objects/${sanitizeVaultPathSegment(entityId)}/uploads/${year}/${month}/${sanitizeVaultFileName(fileName)}`;
}

function buildEvidenceManifestPath(evidenceId) {
  return `evidence-manifests/${sanitizeVaultPathSegment(evidenceId)}.json`;
}

function sanitizeVaultFileName(fileName) {
  const normalized = fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!normalized || normalized.replace(/\./g, "").length === 0) {
    return "file";
  }

  return normalized;
}

function sanitizeVaultPathSegment(segment) {
  const normalized = segment
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized.length > 0 ? normalized : "item";
}

function ensureDirectory(pathValue) {
  mkdirSync(pathValue, { recursive: true });
}

function writeJson(pathValue, data) {
  ensureDirectory(dirname(pathValue));
  writeFileSync(pathValue, `${JSON.stringify(data, null, 2)}\n`);
}

function createPdfBuffer(lines) {
  const stream = [
    "BT",
    "/F1 12 Tf",
    "72 760 Td",
    ...lines.map((line, index) => `${index === 0 ? "" : "0 -18 Td " }(${escapePdfText(line)}) Tj`).map((line, index) => (index === 0 ? line.trimStart() : line)),
    "ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(pdf, "utf8");
}

function escapePdfText(text) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function formatCurrency(currency, amountCents) {
  const amount = (amountCents / 100).toFixed(2);
  return `${currency} ${amount}`;
}
