import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BackHeaderBar } from "../../components/back-header-bar";
import { CfoAvatar } from "../../components/cfo-avatar";
import { useBackOrHome } from "../../hooks/use-back-or-home";
import { useResponsive } from "../../hooks/use-responsive";
import { useAppShell } from "../app-shell/provider";
import {
  getButtonColors,
  getFeedbackColors,
  withAlpha,
} from "../app-shell/theme-utils";
import {
  buildUploadQueueSummary,
  buildUploadQueueSections,
  type EvidenceQueueItem,
  type UploadQueueSummary,
  type UploadQueueSection,
} from "./ledger-domain";
import {
  enqueueUploadCandidates,
  pickDocumentUploadCandidates,
  pickPhotoUploadCandidates,
  takeCameraPhoto,
} from "./ledger-runtime";
import { formatUploadCandidateSize } from "./ledger-ui-copy";
import { useLedgerParseQueue } from "./use-ledger-parse-queue";

interface SelectedUploadCandidate {
  evidenceGroupKey: string;
  isPrimary: boolean;
  kind: "document" | "image" | "live_photo" | "video";
  mimeType: string | null;
  originalFileName: string;
  sizeBytes: number | null;
  uri: string;
}

export function LedgerUploadScreen({
  embedded = false,
}: {
  embedded?: boolean;
} = {}) {
  const router = useRouter();
  const backOrHome = useBackOrHome();
  const { isExpanded, isMedium, windowWidth } = useResponsive();
  const isWeb = Platform.OS === "web";
  const isWide = isExpanded || isMedium;
  const isDesktopWeb = isWeb && windowWidth >= 1180;
  const useSplitLayout = isExpanded;
  const isMobileStack = !isWide && !embedded;
  const {
    bumpStorageRevision,
    copy,
    palette,
    resolvedLocale,
  } = useAppShell();
  const uploadCopy = copy.ledger.upload;
  const errorColors = getFeedbackColors(palette, "error");
  const primaryButton = getButtonColors(palette, "primary");
  const queue = useLedgerParseQueue();
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState<"empty" | "idle">("idle");
  const [stagedCandidates, setStagedCandidates] = useState<
    SelectedUploadCandidate[]
  >([]);
  const [stagedIndex, setStagedIndex] = useState(0);

  const selectedCandidate = stagedCandidates[stagedIndex] ?? null;
  const upcomingCandidates = stagedCandidates.slice(stagedIndex + 1);
  const previewMeta = selectedCandidate
    ? [
        selectedCandidate.mimeType?.trim() || "Unknown type",
        formatUploadCandidateSize(selectedCandidate.sizeBytes),
      ]
        .filter((value): value is string => Boolean(value))
        .join(" · ")
    : "";
  const showImagePreview =
    selectedCandidate != null &&
    (selectedCandidate.kind === "image" ||
      selectedCandidate.kind === "live_photo") &&
    Boolean(selectedCandidate.mimeType?.startsWith("image/"));

  const queueSections = useMemo(
    () => buildUploadQueueSections(queue.queue),
    [queue.queue],
  );
  const queueSummary = useMemo(
    () => buildUploadQueueSummary(queue.queue),
    [queue.queue],
  );

  async function handleImport(
    source: "camera" | "documents" | "photos",
  ): Promise<void> {
    setIsBusy(true);
    setError(null);

    try {
      const candidates =
        source === "camera"
          ? await takeCameraPhoto(resolvedLocale)
          : source === "photos"
            ? await pickPhotoUploadCandidates(resolvedLocale)
            : await pickDocumentUploadCandidates();

      if (!candidates.length) {
        setStagedCandidates([]);
        setStagedIndex(0);
        setStatus("empty");
        return;
      }

      setStagedCandidates(
        candidates
          .filter((candidate) => candidate.isPrimary)
          .map((candidate) => ({
            evidenceGroupKey: candidate.evidenceGroupKey,
            isPrimary: candidate.isPrimary,
            kind: candidate.kind,
            mimeType: candidate.mimeType,
            originalFileName: candidate.originalFileName,
            sizeBytes: candidate.sizeBytes,
            uri: candidate.uri,
          })),
      );
      setStagedIndex(0);
      setStatus("idle");
    } catch (nextError: unknown) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : uploadCopy.errorFallback,
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleQueueSelected(): Promise<void> {
    if (!selectedCandidate) {
      return;
    }

    setIsBusy(true);
    setError(null);

    try {
      await enqueueUploadCandidates([selectedCandidate]);
      bumpStorageRevision();
      await queue.refresh();

      setStagedCandidates((current) =>
        current.filter((_, index) => index !== stagedIndex),
      );
      setStagedIndex((current) =>
        stagedCandidates.length <= 1 ? 0 : Math.max(0, current - 1),
      );
    } catch (nextError: unknown) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : uploadCopy.errorFallback,
      );
    } finally {
      setIsBusy(false);
    }
  }

  const statusText =
    status === "empty"
      ? uploadCopy.emptySelection
      : isBusy && selectedCandidate
        ? `${uploadCopy.parsingStatusPrefix} ${selectedCandidate.originalFileName}...`
        : selectedCandidate
          ? uploadCopy.previewSummary
          : uploadCopy.hint;

  function clearStagedSelection() {
    setError(null);
    setStagedCandidates([]);
    setStagedIndex(0);
    setStatus("idle");
  }

  function openQueueTask(item: EvidenceQueueItem) {
    router.push({
      pathname: "/ledger/parse",
      params: { batchId: item.batchId },
    });
  }

  const workspaceCard = (
    <UploadWorkspaceCard
      embedded={embedded}
      error={error}
      errorColors={errorColors}
      handleImport={handleImport}
      handleQueueSelected={handleQueueSelected}
      isDesktopWeb={isDesktopWeb}
      isBusy={isBusy}
      isMobileStack={isMobileStack}
      isWide={isWide}
      onOpenFullQueue={() => router.push("/ledger/upload")}
      onOpenTask={openQueueTask}
      palette={palette}
      previewMeta={previewMeta}
      primaryButton={primaryButton}
      queue={queue}
      queueError={queue.error}
      queueSections={queueSections}
      queueSummary={queueSummary}
      selectedCandidate={selectedCandidate}
      showImagePreview={showImagePreview}
      stagedIndex={stagedIndex}
      stagedTotal={stagedCandidates.length}
      statusText={statusText}
      upcomingCandidates={upcomingCandidates}
      uploadCopy={uploadCopy}
      onClearSelection={clearStagedSelection}
    />
  );

  const content = (
    <View
      style={[
        embedded ? styles.embeddedRoot : styles.safeArea,
        {
          backgroundColor: isWeb ? "transparent" : palette.shell,
        },
      ]}
      testID="ledger-upload-screen"
    >
      {isWeb && !embedded ? (
        <View
          style={[
            styles.webModalBackdrop,
            { backgroundColor: withAlpha(palette.ink, palette.name === "dark" ? 0.42 : 0.16) },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            onPress={backOrHome}
            style={StyleSheet.absoluteFillObject}
            testID="ledger-upload-backdrop-close"
          />
          <ScrollView
            contentContainerStyle={styles.webModalScrollContent}
            showsVerticalScrollIndicator
            style={styles.webModalScroll}
          >
            <View style={styles.webModalFrameWrap}>
              <View
                style={[
                  styles.webModalFrame,
                  {
                    backgroundColor: palette.shell,
                    borderColor: palette.border,
                    shadowColor: palette.shadow,
                  },
                ]}
              >
                <View style={styles.webModalHeader}>
                  <View style={styles.webModalHeaderCopy}>
                    <Text style={[styles.eyebrow, { color: palette.inkMuted }]}>
                      {uploadCopy.eyebrow}
                    </Text>
                    <Text
                      style={[
                        styles.heroTitle,
                        styles.webHeroTitle,
                        { color: palette.ink },
                      ]}
                    >
                      {uploadCopy.title}
                    </Text>
                    <Text
                      style={[
                        styles.heroSummary,
                        styles.webHeroSummary,
                        { color: palette.inkMuted },
                      ]}
                    >
                      {uploadCopy.summary}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={backOrHome}
                    style={({ pressed }) => [
                      styles.webModalCloseButton,
                      {
                        backgroundColor: pressed ? palette.paperMuted : palette.paper,
                        borderColor: palette.border,
                      },
                    ]}
                    testID="ledger-upload-close-button"
                  >
                    <Feather color={palette.ink} name="x" size={18} />
                  </Pressable>
                </View>
                <View style={styles.webModalBody}>{workspaceCard}</View>
              </View>
            </View>
          </ScrollView>
        </View>
      ) : (
        <>
          {!embedded ? (
            <View
              style={[
                styles.appBar,
                {
                  backgroundColor: palette.shell,
                  borderBottomColor: palette.divider,
                },
              ]}
            >
              <BackHeaderBar
                onBack={backOrHome}
                palette={palette}
                rightAccessory={<CfoAvatar />}
                title={copy.common.appName}
              />
            </View>
          ) : null}
          <ScrollView
            contentContainerStyle={[
              styles.container,
              isWide && !embedded ? styles.containerWide : null,
              embedded ? styles.embeddedContainer : null,
            ]}
          >
            <View style={useSplitLayout && !embedded ? styles.wideRow : null}>
              {!embedded ? (
                <View
                  style={[
                    styles.heroBlock,
                    isWide && styles.heroBlockWide,
                    {
                      backgroundColor: palette.paper,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <Text style={[styles.eyebrow, { color: palette.inkMuted }]}>
                    {uploadCopy.eyebrow}
                  </Text>
                  <Text
                    style={[
                      styles.heroTitle,
                      isWide && styles.heroTitleWide,
                      { color: palette.ink },
                    ]}
                  >
                    {uploadCopy.title}
                  </Text>
                  <Text
                    style={[
                      styles.heroSummary,
                      isWide && styles.heroSummaryWide,
                      { color: palette.inkMuted },
                    ]}
                  >
                    {uploadCopy.summary}
                  </Text>
                </View>
              ) : null}
              {workspaceCard}
            </View>
          </ScrollView>
        </>
      )}
    </View>
  );

  if (embedded) {
    return content;
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      {content}
    </SafeAreaView>
  );
}

function UploadWorkspaceCard({
  embedded,
  error,
  errorColors,
  handleImport,
  handleQueueSelected,
  isDesktopWeb,
  isBusy,
  isMobileStack,
  isWide,
  onOpenFullQueue,
  onOpenTask,
  palette,
  previewMeta,
  primaryButton,
  queue,
  queueError,
  queueSections,
  queueSummary,
  selectedCandidate,
  showImagePreview,
  stagedIndex,
  stagedTotal,
  statusText,
  upcomingCandidates,
  uploadCopy,
  onClearSelection,
}: {
  embedded: boolean;
  error: string | null;
  errorColors: ReturnType<typeof getFeedbackColors>;
  handleImport: (source: "camera" | "documents" | "photos") => Promise<void>;
  handleQueueSelected: () => Promise<void>;
  isDesktopWeb: boolean;
  isBusy: boolean;
  isMobileStack: boolean;
  isWide: boolean;
  onOpenFullQueue: () => void;
  onOpenTask: (item: EvidenceQueueItem) => void;
  palette: ReturnType<typeof useAppShell>["palette"];
  previewMeta: string;
  primaryButton: ReturnType<typeof getButtonColors>;
  queue: ReturnType<typeof useLedgerParseQueue>;
  queueError: string | null;
  queueSections: UploadQueueSection[];
  queueSummary: UploadQueueSummary;
  selectedCandidate: SelectedUploadCandidate | null;
  showImagePreview: boolean;
  stagedIndex: number;
  stagedTotal: number;
  statusText: string;
  upcomingCandidates: SelectedUploadCandidate[];
  uploadCopy: ReturnType<typeof useAppShell>["copy"]["ledger"]["upload"];
  onClearSelection: () => void;
}) {
  const useQueueColumns = isDesktopWeb && !embedded;
  const queueRail = embedded ? (
    <EmbeddedQueueSummary
      onOpenFullQueue={onOpenFullQueue}
      palette={palette}
      queueSummary={queueSummary}
    />
  ) : (
    <UploadQueueRail
      onOpenFullQueue={onOpenFullQueue}
      onOpenTask={onOpenTask}
      showOpenButton={embedded}
      palette={palette}
      queue={queue}
      queueError={queueError}
      queueSections={queueSections}
      queueSummary={queueSummary}
      isColumnLayout={useQueueColumns}
    />
  );

  const intakeContent = (
    <>
      <View
        style={[styles.uploadGlyph, { backgroundColor: palette.accentSoft }]}
      >
        <Feather color={palette.accent} name="upload-cloud" size={26} />
      </View>
      <Text style={[styles.dropTitle, { color: palette.ink }]}>
        {uploadCopy.uploadCardTitle}
      </Text>
      <Text style={[styles.dropSummary, { color: palette.inkMuted }]}>
        {uploadCopy.uploadCardSummary}
      </Text>

      {selectedCandidate ? (
        <View
          style={[
            styles.previewCard,
            isMobileStack ? styles.previewCardCompact : null,
            {
              backgroundColor: palette.paper,
              borderColor: palette.border,
            },
          ]}
          testID="ledger-upload-preview-card"
        >
          <Text style={[styles.previewEyebrow, { color: palette.inkMuted }]}>
            {uploadCopy.previewTitle}
          </Text>
          {stagedTotal > 1 ? (
            <Text style={[styles.previewSequence, { color: palette.inkMuted }]}>
              {`${stagedIndex + 1} / ${stagedTotal}`}
            </Text>
          ) : null}
          {showImagePreview ? (
            <Image source={{ uri: selectedCandidate.uri }} style={styles.previewImage} />
          ) : (
            <View
              style={[
                styles.previewIconWrap,
                { backgroundColor: palette.accentSoft },
              ]}
            >
              <MaterialCommunityIcons
                color={palette.accent}
                name={
                  selectedCandidate.kind === "live_photo"
                    ? "motion-play-outline"
                    : selectedCandidate.kind === "image"
                      ? "image-outline"
                      : "file-document-outline"
                }
                size={28}
              />
            </View>
          )}
          <Text style={[styles.previewFileName, { color: palette.ink }]}>
            {selectedCandidate.originalFileName}
          </Text>
          {previewMeta ? (
            <Text style={[styles.previewMeta, { color: palette.inkMuted }]}>
              {previewMeta}
            </Text>
          ) : null}

          {upcomingCandidates.length > 0 ? (
            <View style={styles.upcomingStack}>
              <Text style={[styles.upcomingTitle, { color: palette.inkMuted }]}>
                {`Up next (${upcomingCandidates.length})`}
              </Text>
              {upcomingCandidates.slice(0, 3).map((candidate, index) => (
                <Text
                  key={`${candidate.originalFileName}-${index}`}
                  numberOfLines={1}
                  style={[styles.upcomingItem, { color: palette.ink }]}
                >
                  {candidate.originalFileName}
                </Text>
              ))}
            </View>
          ) : null}

          <View style={[styles.buttonStack, isWide && styles.buttonStackWide]}>
            <Pressable
              accessibilityRole="button"
              disabled={isBusy}
              onPress={handleQueueSelected}
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  backgroundColor: isBusy
                    ? primaryButton.disabledBackground
                    : pressed
                      ? primaryButton.pressedBackground
                      : primaryButton.background,
                  borderColor: primaryButton.border,
                  opacity: isBusy ? 0.7 : 1,
                  shadowColor: palette.shadow,
                },
              ]}
              testID="ledger-upload-queue-button"
            >
              <View style={styles.primaryButtonContent}>
                <MaterialCommunityIcons
                  color={isBusy ? primaryButton.disabledText : primaryButton.text}
                  name="file-send-outline"
                  size={18}
                />
                <Text
                  style={[
                    styles.primaryButtonLabel,
                    {
                      color: isBusy
                        ? primaryButton.disabledText
                        : primaryButton.text,
                    },
                  ]}
                >
                  {isBusy ? uploadCopy.parsing : "Add to queue"}
                </Text>
              </View>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={isBusy}
              onPress={onClearSelection}
              style={({ pressed }) => [
                styles.secondaryButton,
                {
                  backgroundColor: pressed ? palette.paperMuted : palette.paper,
                  borderColor: palette.border,
                  opacity: isBusy ? 0.7 : 1,
                },
              ]}
              testID="ledger-upload-back-button"
            >
              <View style={styles.primaryButtonContent}>
                <MaterialCommunityIcons
                  color={palette.ink}
                  name="arrow-left"
                  size={18}
                />
                <Text style={[styles.secondaryButtonLabel, { color: palette.ink }]}>
                  {uploadCopy.backAction}
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={[styles.buttonStack, isWide && styles.buttonStackWide]}>
          <Pressable
            accessibilityRole="button"
            disabled={isBusy}
            onPress={() => handleImport("photos")}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: isBusy
                  ? primaryButton.disabledBackground
                  : pressed
                    ? primaryButton.pressedBackground
                    : primaryButton.background,
                borderColor: primaryButton.border,
                opacity: isBusy ? 0.7 : 1,
                shadowColor: palette.shadow,
              },
            ]}
            testID="ledger-upload-select-photos-button"
          >
            <View style={styles.primaryButtonContent}>
              <MaterialCommunityIcons
                color={isBusy ? primaryButton.disabledText : primaryButton.text}
                name="image-multiple-outline"
                size={18}
              />
              <Text
                style={[
                  styles.primaryButtonLabel,
                  { color: isBusy ? primaryButton.disabledText : primaryButton.text },
                ]}
              >
                {isBusy ? uploadCopy.parsing : uploadCopy.selectPhotos}
              </Text>
            </View>
          </Pressable>

          {Platform.OS !== "web" ? (
            <Pressable
              accessibilityRole="button"
              disabled={isBusy}
              onPress={() => handleImport("camera")}
              style={({ pressed }) => [
                styles.secondaryButton,
                {
                  backgroundColor: pressed ? palette.paperMuted : palette.paper,
                  borderColor: palette.border,
                  opacity: isBusy ? 0.7 : 1,
                },
              ]}
              testID="ledger-upload-camera-button"
            >
              <View style={styles.primaryButtonContent}>
                <MaterialCommunityIcons
                  color={palette.ink}
                  name="camera-outline"
                  size={18}
                />
                <Text style={[styles.secondaryButtonLabel, { color: palette.ink }]}>
                  {uploadCopy.takePhoto}
                </Text>
              </View>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={isBusy}
            onPress={() => handleImport("documents")}
            style={({ pressed }) => [
              styles.secondaryButton,
              {
                backgroundColor: pressed ? palette.paperMuted : palette.paper,
                borderColor: palette.border,
                opacity: isBusy ? 0.7 : 1,
              },
            ]}
            testID="ledger-upload-select-button"
          >
            <View style={styles.primaryButtonContent}>
              <MaterialCommunityIcons
                color={palette.ink}
                name="file-upload-outline"
                size={18}
              />
              <Text style={[styles.secondaryButtonLabel, { color: palette.ink }]}>
                {uploadCopy.selectFiles}
              </Text>
            </View>
          </Pressable>
        </View>
      )}

      <Text
        style={[
          styles.hint,
          { color: error ? errorColors.text : palette.inkMuted },
        ]}
      >
        {error ?? statusText}
      </Text>
    </>
  );

  return (
    <View
      style={[
        styles.dropCard,
        isWide && styles.dropCardWide,
        isMobileStack ? styles.dropCardCompact : null,
        useQueueColumns ? styles.dropCardColumns : null,
        {
          backgroundColor: palette.shellElevated,
          borderColor: palette.border,
          shadowColor: palette.shadow,
        },
      ]}
    >
      {useQueueColumns ? (
        <View style={styles.workspaceColumns}>
          <View style={styles.workspaceMainColumn}>{intakeContent}</View>
          <View style={styles.workspaceQueueColumn}>{queueRail}</View>
        </View>
      ) : (
        <>
          {intakeContent}
          {queueRail}
        </>
      )}
    </View>
  );
}

function EmbeddedQueueSummary({
  onOpenFullQueue,
  palette,
  queueSummary,
}: {
  onOpenFullQueue: () => void;
  palette: ReturnType<typeof useAppShell>["palette"];
  queueSummary: UploadQueueSummary;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onOpenFullQueue}
      style={({ pressed }) => [
        styles.embeddedQueueSummary,
        {
          backgroundColor: pressed ? palette.paperMuted : palette.paper,
          borderColor: palette.border,
        },
      ]}
    >
      <Text style={[styles.embeddedQueueLabel, { color: palette.ink }]}>
        Queue summary
      </Text>
      <View style={styles.embeddedQueueMetrics}>
        <Text style={[styles.embeddedQueueMetric, { color: palette.inkMuted }]}>
          {`In progress ${queueSummary.inProgress}`}
        </Text>
        <Text style={[styles.embeddedQueueMetric, { color: palette.inkMuted }]}>
          {`Needs review ${queueSummary.needsReview}`}
        </Text>
        <Text style={[styles.embeddedQueueMetric, { color: palette.inkMuted }]}>
          {`Needs retry ${queueSummary.needsRetry}`}
        </Text>
        <Text style={[styles.embeddedQueueMetric, { color: palette.inkMuted }]}>
          {`Queued ${queueSummary.queued}`}
        </Text>
      </View>
    </Pressable>
  );
}

function UploadQueueRail({
  onOpenFullQueue,
  onOpenTask,
  palette,
  queue,
  queueError,
  queueSections,
  queueSummary,
  showOpenButton,
  isColumnLayout = false,
}: {
  onOpenFullQueue: () => void;
  onOpenTask: (item: EvidenceQueueItem) => void;
  palette: ReturnType<typeof useAppShell>["palette"];
  queue: ReturnType<typeof useLedgerParseQueue>;
  queueError: string | null;
  queueSections: UploadQueueSection[];
  queueSummary: UploadQueueSummary;
  showOpenButton: boolean;
  isColumnLayout?: boolean;
}) {
  return (
    <View
      style={[
        styles.queueRail,
        isColumnLayout ? styles.queueRailColumn : null,
        { backgroundColor: palette.paper, borderColor: palette.border },
      ]}
    >
      <View style={styles.queueRailHeader}>
        <View style={styles.queueRailCopy}>
          <Text style={[styles.queueRailEyebrow, { color: palette.inkMuted }]}>
            Queue
          </Text>
          <Text style={[styles.queueRailTitle, { color: palette.ink }]}>
            Upload workflow
          </Text>
        </View>
        {showOpenButton ? (
          <Pressable
            accessibilityRole="button"
            onPress={onOpenFullQueue}
            style={({ pressed }) => [
              styles.queueOpenButton,
              {
                backgroundColor: pressed ? palette.paperMuted : palette.shellElevated,
                borderColor: palette.border,
              },
            ]}
          >
            <Text style={[styles.queueOpenButtonLabel, { color: palette.ink }]}>
              Open
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.queueSummaryRow}>
        <QueueSummaryPill
          label="In progress"
          palette={palette}
          value={queueSummary.inProgress}
        />
        <QueueSummaryPill
          label="Needs review"
          palette={palette}
          value={queueSummary.needsReview}
        />
        <QueueSummaryPill
          label="Needs retry"
          palette={palette}
          value={queueSummary.needsRetry}
        />
        <QueueSummaryPill
          label="Queued"
          palette={palette}
          value={queueSummary.queued}
        />
      </View>

      {queueError ? (
        <Text style={[styles.queueError, { color: palette.destructive }]}>
          {queueError}
        </Text>
      ) : null}

      {queueSections.length === 0 ? (
        <View
          style={[
            styles.queueEmptyState,
            {
              backgroundColor: palette.shellElevated,
              borderColor: palette.border,
            },
          ]}
        >
          <Text style={[styles.queueEmptyTitle, { color: palette.ink }]}>
            No tasks yet
          </Text>
          <Text style={[styles.queueEmptySummary, { color: palette.inkMuted }]}>
            Confirm an upload above and it will appear here for processing and review.
          </Text>
        </View>
      ) : (
        queueSections.map((section) => (
          <View key={section.id} style={styles.queueSection}>
            <Text style={[styles.queueSectionTitle, { color: palette.ink }]}>
              {formatQueueSectionTitle(section.id)}
            </Text>
            <View style={styles.queueSectionRows}>
              {section.items.map((item) => {
                const isFailed = item.displayState === "failed";
                const isClearing = queue.clearingBatchId === item.batchId;
                const isRetrying = queue.retryingEvidenceId === item.evidenceId;
                const isDisabled = isClearing || isRetrying;
                const rowActionLabel = isFailed
                  ? isRetrying
                    ? "Retrying..."
                    : "Retry"
                  : item.displayState === "ready_for_review"
                    ? "Review"
                    : "View";

                if (isFailed) {
                  return (
                    <View
                      key={item.batchId}
                      style={[
                        styles.queueRow,
                        {
                          backgroundColor: palette.shellElevated,
                          borderColor: palette.border,
                        },
                      ]}
                    >
                      <View style={styles.queueRowMain}>
                        <Text
                          numberOfLines={1}
                          style={[styles.queueRowTitle, { color: palette.ink }]}
                        >
                          {item.originalFileName}
                        </Text>
                        <Text
                          style={[styles.queueRowMeta, { color: palette.inkMuted }]}
                        >
                          {item.displayStepLabel ?? item.displayState}
                        </Text>
                        {item.errorMessage ? (
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.queueRowError,
                              { color: palette.destructive },
                            ]}
                          >
                            {item.errorMessage}
                          </Text>
                        ) : null}
                      </View>
                      <View style={styles.queueRowSide}>
                        {item.attemptCount > 0 ? (
                          <Text
                            style={[
                              styles.queueAttempt,
                              { color: palette.inkMuted },
                            ]}
                          >
                            {`Try ${item.attemptCount}`}
                          </Text>
                        ) : null}
                        <View style={styles.queueRowActions}>
                          <Pressable
                            accessibilityRole="button"
                            disabled={isDisabled}
                            onPress={() => {
                              void queue.retry(item);
                            }}
                            style={({ pressed }) => [
                              styles.queueActionButton,
                              {
                                backgroundColor:
                                  isDisabled || isRetrying
                                    ? palette.paperMuted
                                    : pressed
                                      ? palette.accentSoft
                                      : palette.paper,
                                borderColor: palette.border,
                                opacity: isDisabled && !isRetrying ? 0.75 : 1,
                              },
                            ]}
                            testID={`ledger-queue-retry-${item.batchId}`}
                          >
                            <Text
                              style={[
                                styles.queueActionButtonLabel,
                                { color: palette.accent },
                              ]}
                            >
                              {rowActionLabel}
                            </Text>
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            disabled={isDisabled}
                            onPress={() => {
                              void queue.clear(item);
                            }}
                            style={({ pressed }) => [
                              styles.queueActionButton,
                              {
                                backgroundColor:
                                  isClearing
                                    ? palette.paperMuted
                                    : pressed
                                      ? palette.paperMuted
                                      : palette.paper,
                                borderColor: palette.border,
                                opacity: isDisabled && !isClearing ? 0.75 : 1,
                              },
                            ]}
                            testID={`ledger-queue-clear-${item.batchId}`}
                          >
                            <Text
                              style={[
                                styles.queueActionButtonLabel,
                                {
                                  color: isClearing
                                    ? palette.inkMuted
                                    : palette.ink,
                                },
                              ]}
                            >
                              {isClearing ? "Clearing..." : "Clear"}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  );
                }

                return (
                  <Pressable
                    key={item.batchId}
                    accessibilityRole="button"
                    onPress={() => onOpenTask(item)}
                    style={({ pressed }) => [
                      styles.queueRow,
                      {
                        backgroundColor: pressed
                          ? palette.paperMuted
                          : palette.shellElevated,
                        borderColor: palette.border,
                      },
                    ]}
                  >
                    <View style={styles.queueRowMain}>
                      <Text
                        numberOfLines={1}
                        style={[styles.queueRowTitle, { color: palette.ink }]}
                      >
                        {item.originalFileName}
                      </Text>
                      <Text
                        style={[styles.queueRowMeta, { color: palette.inkMuted }]}
                      >
                        {item.displayStepLabel ?? item.displayState}
                      </Text>
                      {item.errorMessage ? (
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.queueRowError,
                            { color: palette.destructive },
                          ]}
                        >
                          {item.errorMessage}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.queueRowSide}>
                      {(item.displayState === "recovering" ||
                        item.displayState === "failed") &&
                      item.attemptCount > 0 ? (
                        <Text
                          style={[
                            styles.queueAttempt,
                            { color: palette.inkMuted },
                          ]}
                        >
                          {`Try ${item.attemptCount}`}
                        </Text>
                      ) : null}
                      <Text
                        style={[styles.queueRowAction, { color: palette.accent }]}
                      >
                        {rowActionLabel}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

function QueueSummaryPill({
  label,
  palette,
  value,
}: {
  label: string;
  palette: ReturnType<typeof useAppShell>["palette"];
  value: number;
}) {
  return (
    <View
      style={[
        styles.queueSummaryPill,
        { backgroundColor: palette.shellElevated, borderColor: palette.border },
      ]}
    >
      <Text style={[styles.queueSummaryValue, { color: palette.ink }]}>
        {value}
      </Text>
      <Text style={[styles.queueSummaryLabel, { color: palette.inkMuted }]}>
        {label}
      </Text>
    </View>
  );
}

function formatQueueSectionTitle(sectionId: UploadQueueSection["id"]): string {
  switch (sectionId) {
    case "needs_review":
      return "Needs review";
    case "needs_retry":
      return "Needs retry";
    case "in_progress":
      return "In progress";
    case "queued":
      return "Queued";
  }
}

const styles = StyleSheet.create({
  appBar: {
    borderBottomWidth: 2,
    paddingBottom: 10,
    paddingHorizontal: 18,
  },
  buttonStack: {
    gap: 10,
    width: "100%",
  },
  buttonStackWide: {
    alignSelf: "center",
    maxWidth: 420,
  },
  container: {
    gap: 14,
    padding: 18,
    paddingBottom: 32,
  },
  containerWide: {
    flex: 1,
    paddingHorizontal: 32,
    paddingVertical: 28,
  },
  dropCard: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 2,
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  dropCardCompact: {
    alignItems: "stretch",
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  dropCardWide: {
    flex: 1,
    justifyContent: "flex-start",
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  dropCardColumns: {
    alignItems: "stretch",
  },
  embeddedContainer: {
    flexGrow: 1,
    padding: 12,
    paddingBottom: 16,
  },
  embeddedQueueLabel: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: -0.1,
  },
  embeddedQueueMetric: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  embeddedQueueMetrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  embeddedQueueSummary: {
    borderRadius: 14,
    borderWidth: 2,
    gap: 8,
    padding: 12,
    width: "100%",
  },
  embeddedRoot: {
    flex: 1,
  },
  flowHint: {
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    textAlign: "center",
  },
  flowHintRow: {
    gap: 6,
    width: "100%",
  },
  dropSummary: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  dropTitle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 28,
    textAlign: "center",
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  heroBlock: {
    borderRadius: 16,
    borderWidth: 2,
    gap: 8,
    padding: 16,
  },
  heroBlockWide: {
    flex: 1,
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  heroSummary: {
    fontSize: 14,
    lineHeight: 21,
  },
  heroSummaryWide: {
    fontSize: 16,
    lineHeight: 26,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.8,
    lineHeight: 32,
  },
  heroTitleWide: {
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: -0.8,
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },
  previewCard: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 2,
    gap: 10,
    padding: 14,
    width: "100%",
  },
  previewCardCompact: {
    gap: 12,
    padding: 16,
  },
  previewEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  previewFileName: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
    lineHeight: 22,
    textAlign: "center",
  },
  previewIconWrap: {
    alignItems: "center",
    borderRadius: 999,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  previewImage: {
    borderRadius: 16,
    height: 180,
    width: "100%",
  },
  previewMeta: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  previewSequence: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 2,
    height: 48,
    justifyContent: "center",
    width: "100%",
  },
  primaryButtonContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryButtonLabel: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  queueAttempt: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 14,
  },
  queueActionButton: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 32,
    minWidth: 78,
    paddingHorizontal: 12,
  },
  queueActionButtonLabel: {
    fontSize: 12,
    fontWeight: "800",
  },
  queueEmptyState: {
    borderRadius: 14,
    borderWidth: 2,
    gap: 6,
    padding: 14,
  },
  queueEmptySummary: {
    fontSize: 13,
    lineHeight: 18,
  },
  queueEmptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 18,
  },
  queueError: {
    fontSize: 12,
    lineHeight: 16,
  },
  queueOpenButton: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 2,
    height: 38,
    justifyContent: "center",
    minWidth: 84,
    paddingHorizontal: 14,
  },
  queueOpenButtonLabel: {
    fontSize: 13,
    fontWeight: "800",
  },
  queueRail: {
    borderRadius: 18,
    borderWidth: 2,
    gap: 14,
    marginTop: 6,
    padding: 16,
    width: "100%",
  },
  queueRailColumn: {
    marginTop: 0,
  },
  queueRailCopy: {
    gap: 2,
  },
  queueRailEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  queueRailHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  queueRailTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  queueRow: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 2,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    padding: 12,
  },
  queueRowAction: {
    fontSize: 12,
    fontWeight: "800",
  },
  queueRowError: {
    fontSize: 12,
    lineHeight: 16,
  },
  queueRowMain: {
    flex: 1,
    gap: 3,
  },
  queueRowMeta: {
    fontSize: 12,
    lineHeight: 16,
  },
  queueRowSide: {
    alignItems: "flex-end",
    gap: 4,
  },
  queueRowActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end",
  },
  queueRowTitle: {
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 18,
  },
  queueSection: {
    gap: 8,
  },
  queueSectionRows: {
    gap: 8,
  },
  queueSectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: -0.1,
  },
  queueSummaryLabel: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 14,
  },
  queueSummaryPill: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 2,
    gap: 2,
    minWidth: 88,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  queueSummaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "flex-start",
  },
  queueSummaryValue: {
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 18,
  },
  safeArea: {
    flex: 1,
  },
  secondaryButton: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 2,
    height: 48,
    justifyContent: "center",
    width: "100%",
  },
  secondaryButtonLabel: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  upcomingItem: {
    fontSize: 12,
    lineHeight: 16,
  },
  upcomingStack: {
    alignSelf: "stretch",
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 4,
    paddingTop: 10,
  },
  upcomingTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  uploadGlyph: {
    alignItems: "center",
    borderRadius: 999,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  webHeroSummary: {
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 560,
  },
  webHeroTitle: {
    fontSize: 28,
    lineHeight: 34,
  },
  webModalBackdrop: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  webModalBody: {
    paddingBottom: 22,
    paddingHorizontal: 22,
  },
  webModalCloseButton: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 2,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  webModalFrame: {
    borderRadius: 24,
    borderWidth: 2,
    maxHeight: "100%",
    maxWidth: 1120,
    width: "100%",
  },
  webModalFrameWrap: {
    flex: 1,
    maxHeight: "100%",
    maxWidth: 1120,
    width: "100%",
  },
  webModalHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 20,
    justifyContent: "space-between",
    paddingBottom: 18,
    paddingHorizontal: 22,
    paddingTop: 22,
  },
  webModalHeaderCopy: {
    flex: 1,
    gap: 8,
  },
  webModalScroll: {
    flex: 1,
    width: "100%",
  },
  webModalScrollContent: {
    alignItems: "center",
    flexGrow: 1,
    justifyContent: "flex-start",
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  workspaceColumns: {
    alignItems: "stretch",
    flexDirection: "row",
    gap: 20,
    width: "100%",
  },
  workspaceMainColumn: {
    alignItems: "center",
    flex: 1,
    gap: 12,
    minWidth: 0,
  },
  workspaceQueueColumn: {
    flexBasis: 360,
    flexGrow: 0,
    flexShrink: 0,
    minWidth: 340,
  },
  wideRow: {
    flex: 1,
    flexDirection: "row",
    gap: 32,
  },
});
