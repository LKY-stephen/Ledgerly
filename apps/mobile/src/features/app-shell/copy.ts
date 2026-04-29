import type {
  LocalePreference,
  ResolvedLocale,
  ThemePreference,
} from "./types";

export interface AppCopy {
  common: {
    appName: string;
    dark: string;
    english: string;
    guest: string;
    language: string;
    light: string;
    loading: string;
    me: string;
    signOut: string;
    system: string;
    theme: string;
    zhCN: string;
  };
  discover: {
    backToFeed: string;
    calculatedBadge: string;
    cards: Array<{ summary: string; title: string }>;
    emptySummary: string;
    emptyTitle: string;
    eyebrow: string;
    form1099Nec: {
      acknowledge: string;
      closePreview: string;
      databaseBadge: string;
      disclaimerTitle: string;
      emptyRecipients: string;
      footerNative: string;
      footerWeb: string;
      intro: string;
      launcherHint: string;
      noInstructionNote: string;
      openPreview: string;
      recipientPickerHint: string;
      recipientPickerTitle: string;
      sourceLabel: string;
      slotGuideTitle: string;
      title: string;
      unlockNote: string;
      webPreviewLabel: string;
    };
    formScheduleC: {
      acknowledge: string;
      closePreview: string;
      databaseBadge: string;
      disclaimerTitle: string;
      footerNative: string;
      footerWeb: string;
      intro: string;
      launcherHint: string;
      noInstructionNote: string;
      openPreview: string;
      pageOneLabel: string;
      pageSwitcherTitle: string;
      pageTwoLabel: string;
      sourceLabel: string;
      slotGuideTitle: string;
      taxYearTitle: string;
      title: string;
      unlockNote: string;
      webPreviewLabel: string;
    };
    formScheduleSE: {
      acknowledge: string;
      closePreview: string;
      databaseBadge: string;
      disclaimerTitle: string;
      footerNative: string;
      footerWeb: string;
      intro: string;
      launcherHint: string;
      noInstructionNote: string;
      openPreview: string;
      pageOneLabel: string;
      pageSwitcherTitle: string;
      pageTwoLabel: string;
      sourceLabel: string;
      slotGuideTitle: string;
      taxYearTitle: string;
      title: string;
      unlockNote: string;
      webPreviewLabel: string;
    };
    form1040: {
      acknowledge: string;
      closePreview: string;
      databaseBadge: string;
      disclaimerTitle: string;
      footerNative: string;
      footerWeb: string;
      intro: string;
      launcherHint: string;
      noInstructionNote: string;
      openPreview: string;
      pageOneLabel: string;
      pageSwitcherTitle: string;
      pageTwoLabel: string;
      sourceLabel: string;
      slotGuideTitle: string;
      title: string;
      unlockNote: string;
      webPreviewLabel: string;
    };
    latestLabel: string;
    latestTitle: string;
    loadMore: string;
    loadingMore: string;
    manualBadge: string;
    missingArticleSummary: string;
    missingArticleTitle: string;
    openArticle: string;
    publishedLabel: string;
    readTimeLabel: string;
    refreshHint: string;
    sourceLabel: string;
    summary: string;
    title: string;
  };
  homeScreen: {
    balance: string;
    emptySummary: string;
    emptyTitle: string;
    expenses: string;
    income: string;
    loadMore: string;
    loadingMore: string;
    loadingTitle: string;
    monthlyProfit: string;
    net: string;
    newRecords: string;
    outflow: string;
    profitAndLoss: string;
    recentActivitySubtitle: string;
    recentActivityTitle: string;
    seeAll: string;
    trendEmptySummary: string;
    trendEmptyTitle: string;
    trendSubtitle: string;
    trendTitle: string;
  };
  journalScreen: {
    account: string;
    amount: string;
    credit: string;
    date: string;
    debit: string;
    description: string;
    emptySummary: string;
    emptyTitle: string;
    subtitle: string;
    title: string;
  };
  home: {
    cashTitle: string;
    cashValue: string;
    collectionsLabel: string;
    collectionsTitle: string;
    focusCards: Array<{ summary: string; title: string }>;
    focusTitle: string;
    heroSummary: string;
    metricBootstrapIdle: string;
    metricBootstrapLabel: string;
    metricBootstrapReady: string;
    metricBootstrapSummary: string;
    metricModulesLabel: string;
    metricModulesSummary: string;
    metricPlatformsLabel: string;
    metricPlatformsSummary: string;
    moduleFooter: string;
    moduleTitle: string;
    persistenceEyebrow: string;
    sessionApple: string;
    sessionGuest: string;
    sessionSignedOut: string;
    signalTitle: string;
    storageDeviceLabel: string;
    storageDeviceTitle: string;
    storageLabel: string;
    storageTitle: string;
    storageViewsLabel: string;
    storageViewsTitle: string;
    workflowEyebrow: string;
    workflowFooter: string;
    workflowTitle: string;
  };
  ledger: {
    cards: Array<{ summary: string; title: string }>;
    parse: {
      approvalFailed: string;
      approve: string;
      backToLedger: string;
      backToUpload: string;
      categoryBusinessIncome: string;
      categoryExpense: string;
      categoryLabel: string;
      categoryNonBusinessIncome: string;
      categoryPersonalSpending: string;
      descriptionField: string;
      detectedDocsTitle: string;
      editRecordTitle: string;
      emptySummary: string;
      emptyTitle: string;
      errorTitle: string;
      fieldAmount: string;
      fieldDate: string;
      fieldDescription: string;
      fieldSource: string;
      fieldTarget: string;
      heroEyebrow: string;
      heroTitle: string;
      heroTitleSuffix: string;
      mergeCurrentCandidateTitle: string;
      mergeExistingTargetTitle: string;
      mergeKeepChoiceLabel: string;
      mergeKeepExisting: string;
      mergeKeepNew: string;
      mergeMatchedReceiptLabel: string;
      mergeMatchedRecordsTitle: string;
      mergeOverlapEntriesLabel: string;
      mapToRecords: string;
      mapping: string;
      modelLabel: string;
      noData: string;
      parsedJsonTitle: string;
      plannerErrorTitle: string;
      plannerFailed: string;
      preparingReviewSummary: string;
      preparingReviewTitle: string;
      plannerSummaryTitle: string;
      progressTitle: string;
      proposalStateApproved: string;
      proposalStateBlocked: string;
      proposalStateExecuted: string;
      proposalStateFailed: string;
      proposalStatePendingApproval: string;
      proposalStateRejected: string;
      proposalTypeCreateCounterparty: string;
      proposalTypeMergeCounterparty: string;
      proposalTypePersistCandidateRecord: string;
      proposalTypeResolveDuplicateReceipt: string;
      proposalTypeUpdateCandidateRecord: string;
      proposalTypeUpdateWorkflowState: string;
      recordSavedSummary: string;
      recordSavedTitle: string;
      reject: string;
      rejectionFailed: string;
      retry: string;
      reviewStateApproved: string;
      reviewStateCandidate: string;
      reviewStateDuplicate: string;
      reviewStateFailed: string;
      reviewStateNeedsReview: string;
      reviewStatePersistedDraft: string;
      reviewStatePersistedFinal: string;
      reviewStateProposedWritePending: string;
      reviewStateRejected: string;
      reviewStateValidated: string;
      statCandidates: string;
      statProposals: string;
      statReadTasks: string;
      summary: string;
      title: string;
      totalsTitle: string;
      unknownFile: string;
      writeProposalsTitle: string;
    };
    primaryAction: string;
    secondaryAction: string;
    eyebrow: string;
    summary: string;
    title: string;
    upload: {
      backAction: string;
      cameraPermissionDenied: string;
      continue: string;
      emptySelection: string;
      eyebrow: string;
      errorFallback: string;
      hint: string;
      parseAction: string;
      parsing: string;
      parsingStatusPrefix: string;
      previewSummary: string;
      previewTitle: string;
      selectFiles: string;
      selectPhotos: string;
      sourceTitle: string;
      summary: string;
      takePhoto: string;
      title: string;
      uploadCardSummary: string;
      uploadCardTitle: string;
    };
  };
  ledgerScreen: {
    badge: {
      business: string;
      personal: string;
    };
    footer: {
      emptyBusiness: string;
      emptyPersonal: string;
      personalRange: string;
      reportingRange: string;
    };
    journalList: {
      back: string;
      emptySummary: string;
      emptyTitle: string;
      eyebrow: string;
      loadingSummary: string;
      loadingTitle: string;
      summary: string;
      title: string;
    };
    modal: {
      chooseRange: string;
      month: string;
      monthHint: string;
      monthTitle: string;
      openMonths: string;
      openQuarters: string;
      pickerEyebrow: string;
      quarter: string;
      quarterHint: string;
      quarterTitle: string;
      reviewFullQuarter: string;
      reviewFullYear: string;
      stepMonth: string;
      stepQuarter: string;
      stepYear: string;
      year: string;
      yearTitle: string;
    };
    range: {
      fullQuarter: string;
      fullYear: string;
      noBusiness: string;
      noPersonal: string;
      reportingRange: string;
      selectedRange: string;
      yearsAvailablePlural: string;
      yearsAvailableSingular: string;
    };
    recordCard: {
      amount: string;
      close: string;
      date: string;
      description: string;
      equationResult: string;
      equationTitle: string;
      emptyValue: string;
      memo: string;
      negative: string;
      nonOwnerRule: string;
      positive: string;
      recordId: string;
      side: string;
      source: string;
      target: string;
      title: string;
      ownerRule: string;
    };
    scopes: {
      business: string;
      businessA11y: string;
      personal: string;
      personalA11y: string;
    };
    sections: {
      assets: string;
      balanceOnlyBody: string;
      balanceOnlyTitle: string;
      credit: string;
      debit: string;
      equity: string;
      equation: string;
      expenses: string;
      generalLedgerEquationNet: string;
      generalLedgerEquationOtherRule: string;
      generalLedgerEquationOtherTotal: string;
      generalLedgerEquationOwnerRule: string;
      generalLedgerEquationTitle: string;
      journalPersonal: string;
      journalRecent: string;
      liabilities: string;
      netIncome: string;
      netIncomeSummary: string;
      noBusinessBody: string;
      noBusinessTitle: string;
      noPersonalBody: string;
      noPersonalTitle: string;
      pnlOnlyBody: string;
      pnlOnlyTitle: string;
      preparingBody: string;
      preparingTitle: string;
      retry: string;
      retrying: string;
      revenue: string;
      unavailableTitle: string;
      viewBalance: string;
      viewJournal: string;
      viewPnl: string;
    };
  };
  login: {
    appleButton: string;
    appleCancelled: string;
    appleHint: string;
    appleUnavailable: string;
    brandSubtitle: string;
    body: string;
    caption: string;
    eyebrow: string;
    googleButton: string;
    googleCancelled: string;
    googleHint: string;
    googleUnavailable: string;
    poemLines: [string, string, string, string];
    privacyEyebrow: string;
    privacyMetrics: [string, string];
    privacySummary: string;
    signals: [string, string, string];
    skip: string;
    title: string;
  };
  meScreen: {
    aiProviderGemini: string;
    aiProviderInfer: string;
    aiProviderLabel: string;
    aiProviderOpenAi: string;
    apiBaseUrlLabel: string;
    apiBaseUrlPlaceholder: string;
    apiClear: string;
    apiGeminiKeyLabel: string;
    apiGeminiKeyPlaceholder: string;
    apiInferBaseUrlLabel: string;
    apiInferBaseUrlPlaceholder: string;
    apiInferKeyLabel: string;
    apiInferKeyPlaceholder: string;
    apiInferModelLabel: string;
    apiInferModelPlaceholder: string;
    apiKeyLabel: string;
    apiKeyPlaceholder: string;
    apiSave: string;
    apiSectionDescription: string;
    apiSectionEyebrow: string;
    apiSectionTitle: string;
    databaseDescription: string;
    databaseDemoAction: string;
    databaseDemoDescription: string;
    databaseDemoFailure: string;
    databaseDemoInProgress: string;
    databaseDemoRecordSuffix: string;
    databaseDemoSuccess: string;
    databaseImportAction: string;
    databaseImportCheckedSuffix: string;
    databaseImportFailure: string;
    databaseImportInProgress: string;
    databaseImportSuccess: string;
    databaseTitle: string;
    geminiKeyRequiredAlert: string;
    hideApiKey: string;
    inferBaseUrlRequiredAlert: string;
    inferKeyRequiredAlert: string;
    localeDescription: string;
    logoutDescription: string;
    openAiKeyRequiredAlert: string;
    profileDescription: string;
    profileEmailLabel: string;
    profileEmailPlaceholder: string;
    profileEyebrow: string;
    profileNameLabel: string;
    profileNamePlaceholder: string;
    profilePhoneLabel: string;
    profilePhonePlaceholder: string;
    profileSave: string;
    profileTitle: string;
    geminiOAuthConnected: string;
    geminiOAuthConnecting: string;
    geminiOAuthDisconnect: string;
    geminiOAuthOrLabel: string;
    sessionApple: string;
    sessionDescription: string;
    sessionGoogle: string;
    sessionGuest: string;
    sessionNone: string;
    sessionTitle: string;
    showApiKey: string;
    storageEyebrow: string;
    themeDescription: string;
    title: string;
  };
  storageSetup: {
    eyebrow: string;
    importAction: string;
    importInProgress: string;
    initializeAction: string;
    initializeInProgress: string;
    missingSummary: string;
    missingTitle: string;
    recoverySummary: string;
    recoveryTitle: string;
  };
  tabs: {
    discover: string;
    home: string;
    ledger: string;
    profile: string;
  };
}

export const appCopy: Record<ResolvedLocale, AppCopy> = {
  en: {
    common: {
      appName: "Ledgerly",
      dark: "Dark",
      english: "English",
      guest: "Guest",
      language: "Language",
      light: "Light",
      loading: "Preparing your local workspace...",
      me: "Me",
      signOut: "Sign out",
      system: "System",
      theme: "Theme",
      zhCN: "Chinese",
    },
    discover: {
      backToFeed: "Back to feed",
      calculatedBadge: "Calculated from the form",
      cards: [
        {
          title: "Creator benchmarks",
          summary:
            "Preview runway, take-rate, and tax reserve signals before deeper sync arrives.",
        },
        {
          title: "Template vault",
          summary:
            "Keep future invoice drafts, receipts, and filing kits in one device-local command center.",
        },
      ],
      emptySummary:
        "Pull to refresh or come back later to reload the current curated creator-finance feed.",
      emptyTitle: "No articles loaded yet",
      eyebrow: "Discover",
      form1099Nec: {
        acknowledge: "I understand",
        closePreview: "Close preview",
        databaseBadge: "Database-backed",
        disclaimerTitle: "1099-NEC disclaimer",
        emptyRecipients:
          "No counterparties are stored locally yet. The preview keeps the official form visible and marks every unsupported slot as manual.",
        footerNative:
          "Native preview reads partial payer, recipient, and amount data from local SQLite when those fields exist.",
        footerWeb:
          "Web preview keeps the exact form layout but does not mount live SQLite reads in the static export.",
        intro:
          "This preview keeps the official IRS layout visible, highlights every supported slot, and shows where current local records stop being sufficient.",
        launcherHint:
          "Open the popup to review the disclaimer first, then inspect the recommended 1099-NEC form and slot-by-slot instructions.",
        noInstructionNote:
          "No dedicated paragraph for this labeled line was found in the downloaded i1099mec page, so this slot stays tied to the official form label and current schema coverage.",
        openPreview: "Open recommended 1099-NEC",
        recipientPickerHint:
          "Form 1099-NEC is issued per recipient. Pick a local counterparty to see which values the current schema can preview.",
        recipientPickerTitle: "Recipient preview",
        sourceLabel: "Instruction source",
        slotGuideTitle: "Slot guidance",
        title: "Form 1099-NEC exact-layout preview",
        unlockNote:
          "Acknowledge the disclaimer to reveal the official-form preview.",
        webPreviewLabel: "Static web preview",
      },
      formScheduleC: {
        acknowledge: "I understand",
        closePreview: "Close preview",
        databaseBadge: "Database-backed",
        disclaimerTitle: "Schedule C disclaimer",
        footerNative:
          "Native preview reads only the narrow local fields currently stored in SQLite and leaves unsupported Schedule C slots manual.",
        footerWeb:
          "Web preview keeps the exact two-page layout, but static export does not mount live SQLite reads.",
        intro:
          "This preview keeps the official IRS Schedule C layout visible, draws the form directly in the frontend, and shows which slots are database-backed, calculated, or still manual.",
        launcherHint:
          "Open the popup to review the disclaimer first, then inspect the rendered Schedule C pages and field-by-field guidance.",
        noInstructionNote:
          "No dedicated paragraph for this labeled line was found in the downloaded i1040sc page, so this slot stays tied to the official form label and current schema coverage.",
        openPreview: "Open recommended Schedule C",
        pageOneLabel: "Page 1",
        pageSwitcherTitle: "Rendered form pages",
        pageTwoLabel: "Page 2",
        sourceLabel: "Instruction source",
        slotGuideTitle: "Field guidance",
        taxYearTitle: "Tax year",
        title: "Schedule C exact-layout preview",
        unlockNote:
          "Acknowledge the disclaimer to reveal the frontend-drawn Schedule C preview.",
        webPreviewLabel: "Static web preview",
      },
      formScheduleSE: {
        acknowledge: "I understand",
        closePreview: "Close preview",
        databaseBadge: "Database-backed",
        disclaimerTitle: "Schedule SE disclaimer",
        footerNative:
          "Native preview uses only the narrow Schedule C-backed support that can be traced from the current SQLite mappings and leaves the rest manual.",
        footerWeb:
          "Web preview keeps the exact two-page Schedule SE layout, but static export does not mount live SQLite reads.",
        intro:
          "This preview keeps the official IRS Schedule SE layout visible, renders the form directly in the frontend, and shows where the current Schedule C-backed data stops being sufficient.",
        launcherHint:
          "Open the popup to review the disclaimer first, then inspect the rendered Schedule SE pages and grouped field guidance.",
        noInstructionNote:
          "No dedicated paragraph for this labeled area was found in the current i1040sse material, so this slot stays tied to the official form label and current schema coverage.",
        openPreview: "Open recommended Schedule SE",
        pageOneLabel: "Page 1",
        pageSwitcherTitle: "Rendered form pages",
        pageTwoLabel: "Page 2",
        sourceLabel: "Instruction source",
        slotGuideTitle: "Field guidance",
        taxYearTitle: "Tax year",
        title: "Schedule SE exact-layout preview",
        unlockNote:
          "Acknowledge the disclaimer to reveal the frontend-drawn Schedule SE preview.",
        webPreviewLabel: "Static web preview",
      },
      form1040: {
        acknowledge: "I understand",
        closePreview: "Close preview",
        databaseBadge: "Database-backed",
        disclaimerTitle: "Form 1040 disclaimer",
        footerNative:
          "Native preview keeps Form 1040 honest: most fields remain manual because the current local schema does not model a full individual return.",
        footerWeb:
          "Web preview keeps the exact two-page Form 1040 layout, but static export does not mount live SQLite reads.",
        intro:
          "This preview keeps the official IRS Form 1040 main pages visible, renders them directly in the frontend, and distinguishes manual field groups from the few arithmetic totals that are form-derived.",
        launcherHint:
          "Open the popup to review the disclaimer first, then inspect the rendered Form 1040 pages and grouped field guidance.",
        noInstructionNote:
          "No dedicated paragraph for this labeled area was found in the current i1040gi material, so this slot stays tied to the official form label and current schema coverage.",
        openPreview: "Open recommended Form 1040",
        pageOneLabel: "Page 1",
        pageSwitcherTitle: "Rendered form pages",
        pageTwoLabel: "Page 2",
        sourceLabel: "Instruction source",
        slotGuideTitle: "Field guidance",
        title: "Form 1040 exact-layout preview",
        unlockNote:
          "Acknowledge the disclaimer to reveal the frontend-drawn Form 1040 preview.",
        webPreviewLabel: "Static web preview",
      },
      latestLabel: "Latest briefings",
      latestTitle: "Creator finance signals",
      loadMore: "Load more articles",
      loadingMore: "Loading more...",
      manualBadge: "Manual input required",
      missingArticleSummary:
        "This article is no longer in the local feed snapshot. Return to the discover list and choose another briefing.",
      missingArticleTitle: "Article unavailable",
      openArticle: "Open article",
      publishedLabel: "Published",
      readTimeLabel: "min read",
      refreshHint:
        "Pull to refresh or load more to extend the local article feed.",
      sourceLabel: "Source",
      summary:
        "Scan the latest operating signals, then open a detail page when you want the full context.",
      title: "Discover",
    },
    homeScreen: {
      balance: "Balance",
      emptySummary:
        "Upload and confirm a receipt to populate Home with real totals and activity.",
      emptyTitle: "No records yet",
      expenses: "Expenses",
      income: "Income",
      loadMore: "Load More",
      loadingMore: "Loading...",
      loadingTitle: "Loading records...",
      monthlyProfit: "Monthly Profit",
      net: "Net",
      newRecords: "New Records",
      outflow: "Outflow",
      profitAndLoss: "Profit & Loss",
      recentActivitySubtitle: "Newest records synced from the local ledger",
      recentActivityTitle: "Journal",
      seeAll: "See All",
      trendEmptySummary:
        "Add a posted income record to start the 30-day trend view.",
      trendEmptyTitle: "No income in the last 30 days",
      trendSubtitle: "Built from 30 days of local ledger activity",
      trendTitle: "30-Day Income & Expense",
    },
    journalScreen: {
      account: "Account",
      amount: "Amount",
      credit: "Credit",
      date: "Date",
      debit: "Debit",
      description: "Description",
      emptySummary:
        "Upload and confirm receipts to populate the journal with posted entries.",
      emptyTitle: "No journal entries yet",
      subtitle: "All posted records",
      title: "Journal",
    },
    home: {
      cashTitle: "Cash confidence",
      cashValue: "14 days",
      collectionsLabel: "Vault collections",
      collectionsTitle: "Document vault",
      focusCards: [
        {
          title: "Revenue handoff",
          summary:
            "Track which platforms are paid out, delayed, or waiting for reconciliation.",
        },
        {
          title: "Tax reserve",
          summary:
            "Keep the next filing window visible without leaving the dashboard shell.",
        },
        {
          title: "Guest-safe setup",
          summary:
            "Try the product before connecting any identity or remote service.",
        },
      ],
      focusTitle: "Today at a glance",
      heroSummary:
        "The shell is live, contracts are local, and the next actions stay easy to scan.",
      metricBootstrapIdle: "Syncing",
      metricBootstrapLabel: "Bootstrap",
      metricBootstrapReady: "Ready",
      metricBootstrapSummary: "SQLite and vault contracts on this device",
      metricModulesLabel: "Modules",
      metricModulesSummary: "Core finance surfaces already mapped",
      metricPlatformsLabel: "Platforms",
      metricPlatformsSummary: "Creator revenue sources supported in the shell",
      moduleFooter: "Shared via @ledgerly/schemas.",
      moduleTitle: "Operating modules",
      persistenceEyebrow: "Persistence",
      sessionApple: "Signed in with Apple ID",
      sessionGuest: "Exploring in guest mode",
      sessionSignedOut: "Waiting for a local session",
      signalTitle: "Signal rail",
      storageDeviceLabel: "AsyncStorage preferences ready",
      storageDeviceTitle: "Device state",
      storageLabel: "Structured tables + local preference keys",
      storageTitle: "Storage contract pulse",
      storageViewsLabel: "SQLite compatibility views ready",
      storageViewsTitle: "Derived views",
      workflowEyebrow: "Workflow",
      workflowFooter: "No backend until a later PRD says so.",
      workflowTitle: "Guardrails for the next slice",
    },
    ledger: {
      cards: [
        {
          title: "Expense intake",
          summary:
            "Start from mobile receipts, then attach local notes, tags, and vault documents.",
        },
        {
          title: "Spending watchlist",
          summary:
            "Keep outgoing bills, vendors, and payment timing visible even before full CRUD lands.",
        },
      ],
      parse: {
        approvalFailed: "Approval failed.",
        approve: "Approve",
        backToLedger: "Back to Ledger",
        backToUpload: "Back to Upload",
        categoryBusinessIncome: "Business Income",
        categoryExpense: "Expense",
        categoryLabel: "Category",
        categoryNonBusinessIncome: "Non-Business Income",
        categoryPersonalSpending: "Personal Spending",
        descriptionField: "Description",
        detectedDocsTitle: "Detected documents",
        editRecordTitle: "Edit Record",
        emptySummary:
          "Upload a file from the upload screen to see the OpenAI response here.",
        emptyTitle: "No parse result",
        errorTitle: "Error",
        fieldAmount: "Amount",
        fieldDate: "Date",
        fieldDescription: "Description",
        fieldSource: "Source",
        fieldTarget: "Target",
        heroEyebrow: "Parse result",
        heroTitle: "OpenAI Response",
        heroTitleSuffix: "Response",
        mergeCurrentCandidateTitle: "Current Candidate",
        mergeExistingTargetTitle: "Existing Target",
        mergeKeepChoiceLabel: "When merging, keep",
        mergeKeepExisting: "Keep Existing",
        mergeKeepNew: "Keep New",
        mergeMatchedReceiptLabel: "Matched Receipt",
        mergeMatchedRecordsTitle: "Existing Records",
        mergeOverlapEntriesLabel: "Overlapping Entries",
        mapToRecords: "Map to Records",
        mapping: "Mapping...",
        modelLabel: "Model",
        noData: "No data",
        parsedJsonTitle: "Parsed JSON",
        plannerErrorTitle: "Planner Error",
        plannerFailed: "Planner failed.",
        preparingReviewSummary:
          "Parsing and review preparation are running. You will not need to map this record again manually.",
        preparingReviewTitle: "Preparing review",
        plannerSummaryTitle: "Planner Summary",
        progressTitle: "Parser timeline",
        proposalStateApproved: "Approved",
        proposalStateBlocked: "Blocked",
        proposalStateExecuted: "Executed",
        proposalStateFailed: "Failed",
        proposalStatePendingApproval: "Pending Approval",
        proposalStateRejected: "Rejected",
        proposalTypeCreateCounterparty: "Create Counterparty",
        proposalTypeMergeCounterparty: "Merge Counterparty",
        proposalTypePersistCandidateRecord: "Persist Candidate Record",
        proposalTypeResolveDuplicateReceipt: "Resolve Duplicate Receipt",
        proposalTypeUpdateCandidateRecord: "Update Candidate Record",
        proposalTypeUpdateWorkflowState: "Update Workflow State",
        recordSavedSummary:
          "All proposals have been approved and the record has been persisted.",
        recordSavedTitle: "Record Saved",
        reject: "Reject",
        rejectionFailed: "Rejection failed.",
        retry: "Retry",
        reviewStateApproved: "Approved",
        reviewStateCandidate: "Candidate",
        reviewStateDuplicate: "Duplicate",
        reviewStateFailed: "Failed",
        reviewStateNeedsReview: "Needs Review",
        reviewStatePersistedDraft: "Persisted Draft",
        reviewStatePersistedFinal: "Persisted Final",
        reviewStateProposedWritePending: "Write Pending",
        reviewStateRejected: "Rejected",
        reviewStateValidated: "Validated",
        statCandidates: "Candidates",
        statProposals: "Proposals",
        statReadTasks: "Read Tasks",
        summary:
          "Review parser checkpoints and mock totals before wiring any OCR or tax logic.",
        title: "Parsing review",
        totalsTitle: "Structured output preview",
        unknownFile: "Unknown file",
        writeProposalsTitle: "Write Proposals",
      },
      primaryAction: "Upload records",
      secondaryAction: "Open parser demo",
      eyebrow: "Ledger",
      summary:
        "Use this skeleton to prove navigation, visual rhythm, and future module boundaries before wiring deeper forms.",
      title:
        "The accounting shell is ready for the first local-first workflows.",
      upload: {
        backAction: "Back",
        cameraPermissionDenied:
          "Camera access is required to take a photo. Please enable it in Settings.",
        continue: "Continue to parser",
        emptySelection: "No files were selected.",
        eyebrow: "Upload center",
        errorFallback: "Upload import failed.",
        hint: "No real files are uploaded in this phase. Source cards are UI-only placeholders.",
        parseAction: "Parse",
        parsing: "Parsing...",
        parsingStatusPrefix: "Parsing",
        previewSummary: "Confirm the selected file before starting parse and review.",
        previewTitle: "Selected file",
        selectFiles: "Select Files",
        selectPhotos: "Select Photos",
        sourceTitle: "Upload source",
        summary:
          "Upload receipts, PDFs, or photos. The file is sent to OpenAI for parsing and the raw JSON result is displayed on the next screen.",
        takePhoto: "Take Photo",
        title: "Upload workspace",
        uploadCardSummary:
          "Select a file, send it to OpenAI, and view the raw JSON response.",
        uploadCardTitle: "Upload & Parse",
      },
    },
    ledgerScreen: {
      badge: {
        business: "Business",
        personal: "Personal",
      },
      footer: {
        emptyBusiness: "Add records to populate this business view",
        emptyPersonal: "Add records to populate this personal view",
        personalRange: "Personal range",
        reportingRange: "Reporting range",
      },
      journalList: {
        back: "Back",
        emptySummary:
          "Add posted or reconciled records to populate the full journal list.",
        emptyTitle: "No journal records yet",
        eyebrow: "Full Journal",
        loadingSummary:
          "Loading the newest journal records from local storage.",
        loadingTitle: "Preparing journal list",
        summary:
          "Review every journal record from newest to oldest without switching into the General Ledger view.",
        title: "All Journals",
      },
      modal: {
        chooseRange: "Choose range",
        month: "Month",
        monthHint: "Or keep the full quarter.",
        monthTitle: "Month",
        openMonths: "Open available months",
        openQuarters: "Open available quarters",
        pickerEyebrow: "Period picker",
        quarter: "Quarter",
        quarterHint: "Or keep the full year.",
        quarterTitle: "Quarter",
        reviewFullQuarter: "Review the complete quarter.",
        reviewFullYear: "Review the complete year.",
        stepMonth: "Month",
        stepQuarter: "Quarter",
        stepYear: "Year",
        year: "Year",
        yearTitle: "Year",
      },
      range: {
        fullQuarter: "Full Quarter",
        fullYear: "Full Year",
        noBusiness: "No business ranges available yet",
        noPersonal: "No personal ranges available yet",
        reportingRange: "Reporting Range",
        selectedRange: "Selected Range",
        yearsAvailablePlural: "years available",
        yearsAvailableSingular: "year available",
      },
      recordCard: {
        amount: "Amount",
        close: "Close",
        date: "Date",
        description: "Detail",
        equationResult: "Displayed amount",
        equationTitle: "Balance Equation",
        emptyValue: "Not available",
        memo: "Memo",
        negative: "Negative",
        nonOwnerRule:
          "Other groups use credit as positive and debit as negative.",
        positive: "Positive",
        recordId: "Record ID",
        side: "Posting side",
        source: "Source",
        target: "Target",
        title: "Journal record",
        ownerRule:
          "Cash & Bank uses debit as positive and credit as negative.",
      },
      scopes: {
        business: "Business",
        businessA11y: "Business scope",
        personal: "Personal",
        personalA11y: "Personal scope",
      },
      sections: {
        assets: "Assets",
        balanceOnlyBody:
          "Switch to Business to review assets, liabilities, and owner equity.",
        balanceOnlyTitle: "Balance is business-only",
        credit: "Credit",
        debit: "Debit",
        equity: "Equity",
        equation: "Equation",
        expenses: "Expenses",
        generalLedgerEquationNet: "Net grouped balance",
        generalLedgerEquationOtherRule:
          "Other groups use credit minus debit for the displayed amount.",
        generalLedgerEquationOtherTotal: "Other groups total",
        generalLedgerEquationOwnerRule:
          "Cash & Bank uses debit minus credit for the displayed amount.",
        generalLedgerEquationTitle: "Balance Equation",
        journalPersonal: "Recent personal entries",
        journalRecent: "General ledger entries",
        liabilities: "Liabilities",
        netIncome: "Net income",
        netIncomeSummary: "Revenue minus expenses for the selected range.",
        noBusinessBody:
          "No posted or reconciled business records were found in this range.",
        noBusinessTitle: "No business records",
        noPersonalBody: "No personal spending was found in this range.",
        noPersonalTitle: "No personal spending",
        pnlOnlyBody:
          "Personal mode separates non-deductible spending from the business P&L.",
        pnlOnlyTitle: "P&L is business-only",
        preparingBody: "Loading the latest posted records from local storage.",
        preparingTitle: "Preparing ledger",
        retry: "Retry",
        retrying: "Retrying...",
        revenue: "Revenue",
        unavailableTitle: "Ledger data unavailable",
        viewBalance: "Balance",
        viewJournal: "General Ledger",
        viewPnl: "P&L",
      },
    },
    login: {
      appleButton: "Continue with Apple",
      appleCancelled: "Sign-in canceled. Retry or continue as a guest.",
      appleHint: "Apple sign-in works on supported iPhone and iPad devices.",
      appleUnavailable:
        "Apple sign-in is unavailable here. Continue as a guest.",
      brandSubtitle: "Your local-first financial workbench.",
      body: "You become governable, not by others but by yourself.",
      caption: "Theme and language stay in sync with your device.",
      eyebrow: "Local-first login",
      googleButton: "Continue with Google",
      googleCancelled: "Google sign-in canceled. Retry or continue as a guest.",
      googleHint: "Sign in with Google to use Gemini AI without an API key.",
      googleUnavailable: "Google sign-in is not available right now.",
      poemLines: [
        "The moment you start tracking your money,",
        "you stop being random.",
        "You become governable,",
        "not by others but by yourself.",
      ],
      privacyEyebrow: "Privacy first",
      privacyMetrics: ["AES-256 local encryption", "Zero cloud sync default"],
      privacySummary: "Your records stay organized on-device first.",
      signals: ["On-device first", "Guest ready", "Theme aware"],
      skip: "Try now",
      title: "The moment you start tracking your money, you stop being random.",
    },
    meScreen: {
      aiProviderGemini: "Google AI Studio Gemini",
      aiProviderInfer: "Infer API",
      aiProviderLabel: "AI Provider",
      aiProviderOpenAi: "OpenAI",
      apiBaseUrlLabel: "Parse API Base URL",
      apiBaseUrlPlaceholder: "https://api.example.com/v1",
      apiClear: "Clear",
      apiGeminiKeyLabel: "Gemini API Key",
      apiGeminiKeyPlaceholder: "AIza...",
      apiInferBaseUrlLabel: "Infer Base URL",
      apiInferBaseUrlPlaceholder: "https://api.infer.com/v1",
      apiInferKeyLabel: "Infer API Key",
      apiInferKeyPlaceholder: "sk-...",
      apiInferModelLabel: "Infer Model",
      apiInferModelPlaceholder: "e.g. gpt-4o, deepseek-chat",
      apiKeyLabel: "OpenAI API Key",
      apiKeyPlaceholder: "sk-...",
      apiSave: "Save API Settings",
      apiSectionDescription:
        "Choose an AI provider, store the API base URL and key locally on this device, and use them only in parse requests.",
      apiSectionEyebrow: "AI Parse",
      apiSectionTitle: "AI Parse Settings",
      databaseDescription:
        "Import a CFO database package from Files or iCloud Drive. The selected database must keep its evidence files beside it under package-relative paths. On iPhone and iPad, choose the ledgerly-vault folder, or a folder that contains it, in the folder picker.",
      databaseDemoAction: "Start New Ledger",
      databaseDemoDescription:
        "Clear all existing records and start a fresh, empty ledger. This cannot be undone.",
      databaseDemoFailure: "New ledger creation failed.",
      databaseDemoInProgress: "Creating new ledger...",
      databaseDemoRecordSuffix: "records cleared.",
      databaseDemoSuccess: "New ledger created.",
      databaseImportAction: "Import Database",
      databaseImportCheckedSuffix: "path(s) checked.",
      databaseImportFailure: "Database import failed.",
      databaseImportInProgress: "Importing database package...",
      databaseImportSuccess: "Imported database package successfully.",
      databaseTitle: "Local database package",
      geminiKeyRequiredAlert: "Enter a Gemini API key first.",
      geminiOAuthConnected: "Connected via Google Sign-In",
      geminiOAuthConnecting: "Connecting...",
      geminiOAuthDisconnect: "Disconnect Google AI",
      geminiOAuthOrLabel: "OR",
      hideApiKey: "Hide API key",
      inferBaseUrlRequiredAlert: "Enter an Infer Base URL first.",
      inferKeyRequiredAlert: "Enter an Infer API Key first.",
      localeDescription:
        "Switch shell copy instantly and keep the choice on device.",
      logoutDescription:
        "Clear the local session summary and return to the login gate.",
      openAiKeyRequiredAlert: "Enter an OpenAI API key first.",
      profileDescription:
        "Store your profile locally on this device and use it as mapping context when parsing records.",
      profileEmailLabel: "Email",
      profileEmailPlaceholder: "you@example.com",
      profileEyebrow: "Profile",
      profileNameLabel: "Name",
      profileNamePlaceholder: "Your name",
      profilePhoneLabel: "Phone",
      profilePhonePlaceholder: "+1 555-0100",
      profileSave: "Save Profile",
      profileTitle: "Profile",
      sessionApple: "Apple ID",
      sessionDescription:
        "Session state is stored locally for guest mode, Apple, or Google sign-in.",
      sessionGoogle: "Google",
      sessionGuest: "Guest mode",
      sessionNone: "Signed out",
      sessionTitle: "Session",
      showApiKey: "Show API key",
      storageEyebrow: "Storage",
      themeDescription:
        "Move between light, dark, or system appearance without leaving the app.",
      title: "Preferences and session controls",
    },
    storageSetup: {
      eyebrow: "Storage setup",
      importAction: "Import Database",
      importInProgress: "Importing database package...",
      initializeAction: "Initialize Empty Database",
      initializeInProgress: "Initializing empty database...",
      missingSummary:
        "This device does not have an active CFO database package yet. Import an existing portable package or create a new empty local database to continue.",
      missingTitle: "Choose how to start local storage",
      recoverySummary:
        "The current active package could not be opened safely. Import another package or replace it with a new empty database after review.",
      recoveryTitle: "Active database needs recovery",
    },
    tabs: {
      discover: "Discover",
      home: "Home",
      ledger: "Ledger",
      profile: "Setting",
    },
  },
  "zh-CN": {
    common: {
      appName: "Ledgerly",
      dark: "黑夜",
      english: "英文",
      guest: "游客",
      language: "语言",
      light: "白天",
      loading: "正在准备你的本地工作台...",
      me: "我的",
      signOut: "退出登录",
      system: "跟随系统",
      theme: "主题",
      zhCN: "中文",
    },
    discover: {
      backToFeed: "返回列表",
      calculatedBadge: "由表内公式计算",
      cards: [
        {
          title: "创作者经营雷达",
          summary:
            "在更深的数据同步上线前，先预览 runway、抽成和税金预留信号。",
        },
        {
          title: "模板资料库",
          summary: "把后续发票草稿、报销凭证和报税材料收拢到同一个本地工作台。",
        },
      ],
      emptySummary:
        "下拉刷新，或稍后再回来加载当前整理过的创作者财务资讯列表。",
      emptyTitle: "暂时没有文章",
      eyebrow: "发现",
      form1099Nec: {
        acknowledge: "我已了解",
        closePreview: "关闭预览",
        databaseBadge: "来自数据库",
        disclaimerTitle: "1099-NEC 免责声明",
        emptyRecipients:
          "本地数据库里还没有对手方记录。预览仍会显示官方表单，并把当前模式无法支持的栏位标为手动填写。",
        footerNative:
          "原生端会在字段真实存在时，从本地 SQLite 读取付款方、收款方与金额的局部预览值。",
        footerWeb:
          "Web 预览会保留官方表单布局，但静态导出不会挂载实时 SQLite 读取。",
        intro:
          "这个预览直接保留 IRS 官方版式，并高亮每个需要关注的栏位，同时指出本地记录在哪些位置已经不够用。",
        launcherHint:
          "点击按钮后会先弹出免责声明，再显示推荐的 1099-NEC 表单与逐栏说明。",
        noInstructionNote:
          "在下载的 i1099mec 页面里没有找到这个标签栏位的专门段落，因此这里只能依赖官方表单标签与当前数据契约覆盖范围。",
        openPreview: "打开推荐的 1099-NEC",
        recipientPickerHint:
          "1099-NEC 是按收款对象逐个出具的。先选择一个本地对手方，查看当前 schema 能预览哪些值。",
        recipientPickerTitle: "收款对象预览",
        sourceLabel: "说明来源",
        slotGuideTitle: "栏位说明",
        title: "Form 1099-NEC 官方版式预览",
        unlockNote: "先确认免责声明，之后才会显示官方表单预览。",
        webPreviewLabel: "静态 Web 预览",
      },
      formScheduleC: {
        acknowledge: "我已了解",
        closePreview: "关闭预览",
        databaseBadge: "来自数据库",
        disclaimerTitle: "Schedule C 免责声明",
        footerNative:
          "原生端只会读取当前 SQLite 里真实存在的少量字段，其余不受支持的 Schedule C 栏位会保持为手动填写。",
        footerWeb:
          "Web 预览会保留这份双页官方版式，但静态导出不会挂载实时 SQLite 读取。",
        intro:
          "这个预览直接保留 IRS 官方 Schedule C 的双页结构，并由前端直接绘制表单，让栏位高亮、预览值和说明始终贴合版式。",
        launcherHint:
          "点击按钮后会先弹出免责声明，再显示渲染后的 Schedule C 页面与逐栏说明。",
        noInstructionNote:
          "在下载的 i1040sc 页面里没有找到这个标签栏位的专门段落，因此这里只能依赖官方表单标签与当前数据契约覆盖范围。",
        openPreview: "打开推荐的 Schedule C",
        pageOneLabel: "第 1 页",
        pageSwitcherTitle: "渲染后的表单页",
        pageTwoLabel: "第 2 页",
        sourceLabel: "说明来源",
        slotGuideTitle: "栏位说明",
        taxYearTitle: "税年",
        title: "Schedule C 官方版式预览",
        unlockNote:
          "先确认免责声明，之后才会显示由前端绘制的 Schedule C 预览。",
        webPreviewLabel: "静态 Web 预览",
      },
      formScheduleSE: {
        acknowledge: "我已了解",
        closePreview: "关闭预览",
        databaseBadge: "来自数据库",
        disclaimerTitle: "Schedule SE 免责声明",
        footerNative:
          "原生端只会使用当前 SQLite 映射里能真实追溯到 Schedule C 的少量下游支持，其余栏位保持为手动填写。",
        footerWeb:
          "Web 预览会保留这份双页官方 Schedule SE 版式，但静态导出不会挂载实时 SQLite 读取。",
        intro:
          "这个预览直接保留 IRS 官方 Schedule SE 版式，由前端直接绘制表单，并明确指出当前 Schedule C 支撑数据在哪些位置已经不够用。",
        launcherHint:
          "点击按钮后会先弹出免责声明，再显示渲染后的 Schedule SE 页面与分组栏位说明。",
        noInstructionNote:
          "在当前 i1040sse 材料里没有找到这个标签区域的专门段落，因此这里只能依赖官方表单标签与当前数据契约覆盖范围。",
        openPreview: "打开推荐的 Schedule SE",
        pageOneLabel: "第 1 页",
        pageSwitcherTitle: "渲染后的表单页",
        pageTwoLabel: "第 2 页",
        sourceLabel: "说明来源",
        slotGuideTitle: "栏位说明",
        taxYearTitle: "税年",
        title: "Schedule SE 官方版式预览",
        unlockNote:
          "先确认免责声明，之后才会显示由前端绘制的 Schedule SE 预览。",
        webPreviewLabel: "静态 Web 预览",
      },
      form1040: {
        acknowledge: "我已了解",
        closePreview: "关闭预览",
        databaseBadge: "来自数据库",
        disclaimerTitle: "Form 1040 免责声明",
        footerNative:
          "原生端会保持 Form 1040 的诚实边界：由于当前本地 schema 并不覆盖完整个人报税资料，大部分栏位仍然需要手动填写。",
        footerWeb:
          "Web 预览会保留这份双页官方 Form 1040 版式，但静态导出不会挂载实时 SQLite 读取。",
        intro:
          "这个预览直接保留 IRS 官方 Form 1040 首页与第 2 页版式，由前端直接绘制，并区分需要手动填写的字段组与表内可计算的小部分合计行。",
        launcherHint:
          "点击按钮后会先弹出免责声明，再显示渲染后的 Form 1040 页面与分组栏位说明。",
        noInstructionNote:
          "在当前 i1040gi 材料里没有找到这个标签区域的专门段落，因此这里只能依赖官方表单标签与当前数据契约覆盖范围。",
        openPreview: "打开推荐的 Form 1040",
        pageOneLabel: "第 1 页",
        pageSwitcherTitle: "渲染后的表单页",
        pageTwoLabel: "第 2 页",
        sourceLabel: "说明来源",
        slotGuideTitle: "栏位说明",
        title: "Form 1040 官方版式预览",
        unlockNote: "先确认免责声明，之后才会显示由前端绘制的 Form 1040 预览。",
        webPreviewLabel: "静态 Web 预览",
      },
      latestLabel: "最新简报",
      latestTitle: "创作者财务信号",
      loadMore: "加载更多文章",
      loadingMore: "正在加载...",
      manualBadge: "需要手动填写",
      missingArticleSummary:
        "这篇文章已经不在当前本地资讯快照里，请返回发现列表并选择另一篇简报。",
      missingArticleTitle: "文章不可用",
      openArticle: "阅读全文",
      publishedLabel: "发布时间",
      readTimeLabel: "分钟阅读",
      refreshHint: "下拉刷新或继续加载更多，扩展当前本地文章列表。",
      sourceLabel: "来源",
      summary: "本阶段先保持轻量，但会为后续的增长功能预留清晰的产品位置。",
      title: "给创作者财务决策一个更冷静的观察层。",
    },
    homeScreen: {
      balance: "余额",
      emptySummary: "上传并确认一张票据后，首页就会展示真实汇总和最近活动。",
      emptyTitle: "还没有记录",
      expenses: "支出",
      income: "收入",
      loadMore: "加载更多",
      loadingMore: "加载中...",
      loadingTitle: "正在加载记录...",
      monthlyProfit: "月度利润",
      net: "净额",
      newRecords: "新增记录",
      outflow: "流出",
      profitAndLoss: "损益",
      recentActivitySubtitle: "最新记录已从本地账本同步",
      recentActivityTitle: "日记账",
      seeAll: "查看全部",
      trendEmptySummary:
        "新增一条已入账收入记录后，这里会开始展示近 30 天趋势。",
      trendEmptyTitle: "近 30 天还没有收入",
      trendSubtitle: "基于最近 30 天本地账本动态生成",
      trendTitle: "30天收支",
    },
    journalScreen: {
      account: "科目",
      amount: "金额",
      credit: "贷方",
      date: "日期",
      debit: "借方",
      description: "描述",
      emptySummary: "上传并确认票据后，日记账会展示已入账的分录。",
      emptyTitle: "暂无日记账",
      subtitle: "全部已入账记录",
      title: "日记账",
    },
    home: {
      cashTitle: "现金把控",
      cashValue: "14 天",
      collectionsLabel: "文件仓集合",
      collectionsTitle: "本地资料库",
      focusCards: [
        {
          title: "收入交接",
          summary: "快速判断哪些平台已回款、延迟到账，或仍待核对。",
        },
        {
          title: "税金预留",
          summary: "不离开首页也能保持下一个申报窗口的可见性。",
        },
        {
          title: "游客安全体验",
          summary: "先试用产品，再决定是否接入身份信息或未来同步能力。",
        },
      ],
      focusTitle: "今日概览",
      heroSummary: "应用壳层已就绪，契约都在本地，下一步该看什么一眼就能扫到。",
      metricBootstrapIdle: "同步中",
      metricBootstrapLabel: "启动状态",
      metricBootstrapReady: "已就绪",
      metricBootstrapSummary: "本机 SQLite 与文件仓契约",
      metricModulesLabel: "模块数",
      metricModulesSummary: "已映射好的核心财务工作面",
      metricPlatformsLabel: "平台数",
      metricPlatformsSummary: "当前壳层支持的创作者收入来源",
      moduleFooter: "共享自 @ledgerly/schemas。",
      moduleTitle: "核心模块",
      persistenceEyebrow: "本地持久化",
      sessionApple: "已通过 Apple ID 进入",
      sessionGuest: "当前为游客模式",
      sessionSignedOut: "尚未建立本地会话",
      signalTitle: "信号总览",
      storageDeviceLabel: "AsyncStorage 偏好已就绪",
      storageDeviceTitle: "设备状态",
      storageLabel: "结构化表 + 本地偏好键位",
      storageTitle: "本地契约状态",
      storageViewsLabel: "SQLite 兼容视图已就绪",
      storageViewsTitle: "派生视图",
      workflowEyebrow: "流程守则",
      workflowFooter: "后续 PRD 未明确前，不引入后端。",
      workflowTitle: "下一阶段守则",
    },
    ledger: {
      cards: [
        {
          title: "支出录入",
          summary: "从移动端票据出发，后续补上备注、标签和文件仓附件。",
        },
        {
          title: "发票追踪",
          summary: "在完整 CRUD 上线前，也能先看到到期日、币种和回款状态。",
        },
      ],
      parse: {
        approvalFailed: "批准失败。",
        approve: "批准",
        backToLedger: "返回记账页",
        backToUpload: "返回上传页",
        categoryBusinessIncome: "经营收入",
        categoryExpense: "支出",
        categoryLabel: "分类",
        categoryNonBusinessIncome: "非经营收入",
        categoryPersonalSpending: "个人支出",
        descriptionField: "摘要",
        detectedDocsTitle: "识别到的文档",
        editRecordTitle: "编辑记录",
        emptySummary: "从上传页上传一个文件后，这里会显示 OpenAI 的解析结果。",
        emptyTitle: "还没有解析结果",
        errorTitle: "错误",
        fieldAmount: "金额",
        fieldDate: "日期",
        fieldDescription: "摘要",
        fieldSource: "来源方",
        fieldTarget: "去向方",
        heroEyebrow: "解析结果",
        heroTitle: "OpenAI 返回结果",
        heroTitleSuffix: "返回结果",
        mergeCurrentCandidateTitle: "当前候选记录",
        mergeExistingTargetTitle: "现有目标记录",
        mergeKeepChoiceLabel: "合并时保留",
        mergeKeepExisting: "保留现有记录",
        mergeKeepNew: "保留新记录",
        mergeMatchedReceiptLabel: "匹配票据",
        mergeMatchedRecordsTitle: "现有记录",
        mergeOverlapEntriesLabel: "重叠条目数",
        mapToRecords: "映射到记录",
        mapping: "映射中...",
        modelLabel: "模型",
        noData: "暂无数据",
        parsedJsonTitle: "解析 JSON",
        plannerErrorTitle: "规划器错误",
        plannerFailed: "规划器执行失败。",
        preparingReviewSummary:
          "正在执行解析和复核准备，用户不需要再额外点击映射到记录。",
        preparingReviewTitle: "正在准备复核",
        plannerSummaryTitle: "规划摘要",
        progressTitle: "解析流程",
        proposalStateApproved: "已批准",
        proposalStateBlocked: "已阻塞",
        proposalStateExecuted: "已执行",
        proposalStateFailed: "失败",
        proposalStatePendingApproval: "待批准",
        proposalStateRejected: "已拒绝",
        proposalTypeCreateCounterparty: "创建交易对手",
        proposalTypeMergeCounterparty: "合并交易对手",
        proposalTypePersistCandidateRecord: "写入候选记录",
        proposalTypeResolveDuplicateReceipt: "处理重复票据",
        proposalTypeUpdateCandidateRecord: "更新候选记录",
        proposalTypeUpdateWorkflowState: "更新流程状态",
        recordSavedSummary: "所有提案都已批准，这条记录已经写入本地存储。",
        recordSavedTitle: "记录已保存",
        reject: "拒绝",
        rejectionFailed: "拒绝失败。",
        retry: "重试",
        reviewStateApproved: "已批准",
        reviewStateCandidate: "候选",
        reviewStateDuplicate: "重复",
        reviewStateFailed: "失败",
        reviewStateNeedsReview: "待复核",
        reviewStatePersistedDraft: "已存为草稿",
        reviewStatePersistedFinal: "已正式入账",
        reviewStateProposedWritePending: "待写入",
        reviewStateRejected: "已拒绝",
        reviewStateValidated: "已校验",
        statCandidates: "候选记录",
        statProposals: "提案数",
        statReadTasks: "读取任务",
        summary: "先预览解析阶段和 mock 汇总结果，后续再接 OCR 与真实规则。",
        title: "解析结果预览",
        totalsTitle: "结构化结果预览",
        unknownFile: "未知文件",
        writeProposalsTitle: "写入提案",
      },
      primaryAction: "上传凭证",
      secondaryAction: "打开解析演示",
      eyebrow: "记账",
      summary:
        "这个页面先验证导航、视觉节奏和模块边界，后续再接入更深的表单与数据流。",
      title: "记账壳层已经为首批本地流程预留好位置。",
      upload: {
        backAction: "返回",
        cameraPermissionDenied:
          "需要开启相机权限后才能拍照，请前往系统设置开启。",
        continue: "继续到解析页",
        emptySelection: "未选择任何文件。",
        eyebrow: "上传中心",
        errorFallback: "上传导入失败。",
        hint: "本阶段不会上传真实文件，来源卡片仅用于 UI 与导航验证。",
        parseAction: "解析",
        parsing: "解析中...",
        parsingStatusPrefix: "正在解析",
        previewSummary: "确认当前文件后再开始解析和复核准备。",
        previewTitle: "已选文件",
        selectFiles: "选择文件",
        selectPhotos: "选择照片",
        sourceTitle: "上传来源",
        summary:
          "上传票据、PDF 或照片后，文件会被发送给 OpenAI 解析，原始 JSON 结果会在下一页展示。",
        takePhoto: "拍照",
        title: "上传工作台",
        uploadCardSummary:
          "选择一个文件，发送给 OpenAI，并查看返回的原始 JSON 结果。",
        uploadCardTitle: "上传并解析",
      },
    },
    ledgerScreen: {
      badge: {
        business: "经营",
        personal: "个人",
      },
      footer: {
        emptyBusiness: "新增记录后，这里会显示经营账务视图",
        emptyPersonal: "新增记录后，这里会显示个人账务视图",
        personalRange: "个人范围",
        reportingRange: "报表范围",
      },
      journalList: {
        back: "返回",
        emptySummary: "新增已入账或已核对的记录后，这里会显示完整的分录列表。",
        emptyTitle: "还没有分录记录",
        eyebrow: "完整分录",
        loadingSummary: "正在从本地存储加载最新分录记录。",
        loadingTitle: "正在准备分录列表",
        summary: "按从新到旧查看全部分录记录，不会和总账视图混在一起。",
        title: "全部分录",
      },
      modal: {
        chooseRange: "选择范围",
        month: "月份",
        monthHint: "也可以保留整季。",
        monthTitle: "月份",
        openMonths: "查看可用月份",
        openQuarters: "查看可用季度",
        pickerEyebrow: "期间选择器",
        quarter: "季度",
        quarterHint: "也可以保留整年。",
        quarterTitle: "季度",
        reviewFullQuarter: "查看整季范围。",
        reviewFullYear: "查看整年范围。",
        stepMonth: "月份",
        stepQuarter: "季度",
        stepYear: "年份",
        year: "年份",
        yearTitle: "年份",
      },
      range: {
        fullQuarter: "整季",
        fullYear: "全年",
        noBusiness: "还没有经营范围",
        noPersonal: "还没有个人范围",
        reportingRange: "报表范围",
        selectedRange: "当前范围",
        yearsAvailablePlural: "个可选年份",
        yearsAvailableSingular: "个可选年份",
      },
      recordCard: {
        amount: "金额",
        close: "关闭",
        date: "日期",
        description: "明细",
        equationResult: "展示金额",
        equationTitle: "平衡公式",
        emptyValue: "暂无",
        memo: "备注",
        negative: "负向",
        nonOwnerRule: "其他分组按贷方为正、借方为负。",
        positive: "正向",
        recordId: "记录编号",
        side: "分录方向",
        source: "来源",
        target: "去向",
        title: "分录记录",
        ownerRule: "现金与银行按借方为正、贷方为负。",
      },
      scopes: {
        business: "经营",
        businessA11y: "经营范围",
        personal: "个人",
        personalA11y: "个人范围",
      },
      sections: {
        assets: "资产",
        balanceOnlyBody: "切回经营视角后，可查看资产、负债和所有者权益。",
        balanceOnlyTitle: "资产负债仅支持经营视角",
        credit: "贷方",
        debit: "借方",
        equity: "权益",
        equation: "会计等式",
        expenses: "支出",
        generalLedgerEquationNet: "分组净平衡",
        generalLedgerEquationOtherRule:
          "其他分组的展示金额按贷方减借方计算。",
        generalLedgerEquationOtherTotal: "其他分组总额",
        generalLedgerEquationOwnerRule:
          "现金与银行的展示金额按借方减贷方计算。",
        generalLedgerEquationTitle: "平衡公式",
        journalPersonal: "最近个人记录",
        journalRecent: "总账分录",
        liabilities: "负债",
        netIncome: "净收益",
        netIncomeSummary: "所选范围内的收入减支出。",
        noBusinessBody: "当前范围内还没有已入账或已核对的经营记录。",
        noBusinessTitle: "还没有经营记录",
        noPersonalBody: "当前范围内还没有个人支出记录。",
        noPersonalTitle: "还没有个人支出",
        pnlOnlyBody: "个人视角会把不可抵扣的个人支出与经营损益分开查看。",
        pnlOnlyTitle: "损益仅支持经营视角",
        preparingBody: "正在从本地存储加载最新已入账记录。",
        preparingTitle: "正在准备记账页",
        retry: "重试",
        retrying: "重试中...",
        revenue: "收入",
        unavailableTitle: "记账数据暂不可用",
        viewBalance: "资产负债",
        viewJournal: "总账",
        viewPnl: "损益",
      },
    },
    login: {
      appleButton: "使用 Apple 登录",
      appleCancelled: "已取消 Apple 登录，你可以重试或先以游客进入。",
      appleHint: "Apple 登录仅在支持的 iPhone / iPad 设备上可用。",
      appleUnavailable: "当前环境暂不支持 Apple 登录，请先使用游客模式。",
      brandSubtitle: "你的本地优先财务工作台。",
      body: "用 Apple、Google 登录，或先以游客进入。你的财务工作台会保持本地、清晰、轻量。",
      caption: "主题与语言会继续跟随你的设备偏好。",
      eyebrow: "本地优先登录",
      googleButton: "使用 Google 继续",
      googleCancelled: "已取消 Google 登录，你可以重试或先以游客进入。",
      googleHint: "使用 Google 登录后可直接使用 Gemini AI，无需 API Key。",
      googleUnavailable: "Google 登录暂不可用，请稍后重试。",
      poemLines: [
        "当你开始追踪自己的每一笔钱，",
        "你就不再是随机漂流。",
        "你开始变得可以自我治理，",
        "不是被别人，而是被你自己。",
      ],
      privacyEyebrow: "隐私优先",
      privacyMetrics: ["AES-256 本地加密", "默认不启用云同步"],
      privacySummary: "你的记录会优先保存在本机并保持有序。",
      signals: ["设备优先", "游客可用", "主题自适应"],
      skip: "立即体验",
      title: "先给创作者现金流一个安静入口。",
    },
    meScreen: {
      aiProviderGemini: "Google AI Studio Gemini",
      aiProviderInfer: "Infer API",
      aiProviderLabel: "AI 提供方",
      aiProviderOpenAi: "OpenAI",
      apiBaseUrlLabel: "Parse API 地址",
      apiBaseUrlPlaceholder: "https://api.example.com/v1",
      apiClear: "清空",
      apiGeminiKeyLabel: "Gemini API Key",
      apiGeminiKeyPlaceholder: "AIza...",
      apiInferBaseUrlLabel: "Infer Base URL",
      apiInferBaseUrlPlaceholder: "https://api.infer.com/v1",
      apiInferKeyLabel: "Infer API Key",
      apiInferKeyPlaceholder: "sk-...",
      apiInferModelLabel: "Infer Model",
      apiInferModelPlaceholder: "如 gpt-4o, deepseek-chat",
      apiKeyLabel: "OpenAI API Key",
      apiKeyPlaceholder: "sk-...",
      apiSave: "保存设置",
      apiSectionDescription:
        "选择 AI 提供方，并把 API 地址与 Key 保存在当前设备本地。上传解析时只会在请求头里发送 Key，不会写入 SQLite。",
      apiSectionEyebrow: "AI 解析",
      apiSectionTitle: "AI 解析设置",
      databaseDescription:
        "从文件或 iCloud Drive 导入一个 CFO 数据库包。所选数据库必须把凭证文件按相对路径放在数据库旁边。在 iPhone 和 iPad 上，请在文件夹选择器里选择 ledgerly-vault 文件夹，或选择包含它的上级文件夹。",
      databaseDemoAction: "新建账本",
      databaseDemoDescription:
        "清除所有已有记录，创建一个全新的空账本。此操作不可撤销。",
      databaseDemoFailure: "新建账本失败。",
      databaseDemoInProgress: "正在新建账本...",
      databaseDemoRecordSuffix: "条记录已清除。",
      databaseDemoSuccess: "新账本已创建。",
      databaseImportAction: "导入数据库",
      databaseImportCheckedSuffix: "个路径已检查。",
      databaseImportFailure: "数据库导入失败。",
      databaseImportInProgress: "正在导入数据库包...",
      databaseImportSuccess: "数据库包导入成功。",
      databaseTitle: "本地数据库包",
      geminiKeyRequiredAlert: "请先填写 Gemini API Key。",
      geminiOAuthConnected: "已通过 Google 登录连接",
      geminiOAuthConnecting: "连接中...",
      geminiOAuthDisconnect: "断开 Google AI",
      geminiOAuthOrLabel: "或",
      hideApiKey: "隐藏 Key",
      inferBaseUrlRequiredAlert: "请填入 Infer Base URL",
      inferKeyRequiredAlert: "请填入 Infer API Key",
      localeDescription: "立即切换界面语言，并把选择保存在设备本地。",
      logoutDescription: "清除本地会话摘要，并返回登录入口。",
      openAiKeyRequiredAlert: "请先填写 OpenAI API Key。",
      profileDescription: "把你的资料保存在当前设备本地，并在解析记录时作为映射上下文使用。",
      profileEmailLabel: "邮箱",
      profileEmailPlaceholder: "you@example.com",
      profileEyebrow: "资料",
      profileNameLabel: "姓名",
      profileNamePlaceholder: "你的名字",
      profilePhoneLabel: "电话",
      profilePhonePlaceholder: "+1 555-0100",
      profileSave: "保存资料",
      profileTitle: "个人资料",
      sessionApple: "Apple ID",
      sessionDescription:
        "游客态、Apple 和 Google 登录态都只保存在本机，方便本地优先阶段验证体验。",
      sessionGoogle: "Google",
      sessionGuest: "游客模式",
      sessionNone: "未登录",
      sessionTitle: "当前会话",
      showApiKey: "显示 Key",
      storageEyebrow: "存储",
      themeDescription: "在应用内切换白天、黑夜或跟随系统，不打断当前流程。",
      title: "偏好设置与会话控制",
    },
    storageSetup: {
      eyebrow: "存储设置",
      importAction: "导入数据库",
      importInProgress: "正在导入数据库包...",
      initializeAction: "初始化空数据库",
      initializeInProgress: "正在初始化空数据库...",
      missingSummary:
        "当前设备还没有可用的 CFO 数据库包。你可以导入一个现有的可携带数据库包，或新建一个空的本地数据库后继续。",
      missingTitle: "选择本地存储的开始方式",
      recoverySummary:
        "当前激活的数据库包无法安全打开。请导入另一个数据库包，或在确认后用一个新的空数据库替换它。",
      recoveryTitle: "当前数据库需要恢复",
    },
    tabs: {
      discover: "发现",
      home: "首页",
      ledger: "记账",
      profile: "设置",
    },
  },
};

export function getAppCopy(locale: ResolvedLocale): AppCopy {
  return appCopy[locale];
}

export const themePreferenceOptions: ThemePreference[] = [
  "system",
  "light",
  "dark",
];
export const localePreferenceOptions: LocalePreference[] = [
  "system",
  "en",
  "zh-CN",
];
