# Test Harness: Parse Image -- Camera Capture Entry

> Testor role output for PRD "parse_img"
> Generated: 2026-04-13

---

## 1. Requirement Understanding Summary

### What to test

- **New camera capture entry**: The upload screen (`ledger-upload-screen.tsx`) must present a third action button (alongside "Select Photos" and "Select Files") that launches the device camera via `expo-image-picker` `launchCameraAsync`.
- **Camera permission flow**: The app must request camera permissions before launching the camera. Grant and denial paths must both be handled.
- **Photo-to-parse handoff**: After a photo is taken, the image must enter the same `handleImport` flow currently used by the photo library path -- i.e., it must call `parseFile()` and navigate to `/ledger/parse` with the same params.
- **Cancellation resilience**: If the user cancels the camera (presses back or cancel in the native camera UI), the upload screen must remain stable -- no error, no blank state, no crash.
- **Downstream flow integrity**: The mapping, planner, and review screens (`ledger-parse-screen.tsx`, `use-planner-workflow`) must work identically regardless of whether the image originated from the camera or the photo library.
- **Regression on existing upload paths**: The "Select Photos" (photo library) and "Select Files" (document picker) buttons must continue to function exactly as before.

### What NOT to test (out of scope)

- Camera hardware quality, focus, exposure, or image resolution (device/OS concern).
- OpenAI / Gemini API response correctness (covered by existing `remote-parse.test.ts` and `test-pdf-parse.mjs`).
- Database schema changes (this feature does not alter the structured store contract).
- Backend or API server behavior (local-first architecture, no backend).
- Performance benchmarks for large images.

### Key assumptions

1. The implementation will use `expo-image-picker` (`ImagePicker.launchCameraAsync`) rather than `expo-camera`, since the codebase already depends on `expo-image-picker` for the photo library flow.
2. The camera entry will produce an `UploadCandidate` with `kind: "image"`, matching the same shape as photo library candidates.
3. The native runtime (`ledger-runtime.native.ts`) will add a `pickCameraUploadCandidate()` (or similarly named) exported function, and the web runtime (`ledger-runtime.web.ts`) will either add a parallel implementation or gracefully indicate camera is unavailable on web.
4. A new copy key (e.g., `upload.takePhoto` or `upload.camera`) will be added to `AppCopy.ledger.upload` in both `en` and `zh-CN`.
5. The camera button will have a unique `testID` (e.g., `"ledger-upload-camera-button"`).

---

## 2. Executable Acceptance Criteria

Each criterion below is written as an observable, pass/fail check.

| # | Criterion | Observable pass condition |
|---|-----------|--------------------------|
| AC-1 | Camera button visible | The upload screen (`testID="ledger-upload-screen"`) renders a third pressable element with a camera-related icon and label (e.g., "Take Photo" / "拍照"). The button has a distinct `testID` (e.g., `"ledger-upload-camera-button"`). |
| AC-2 | Camera permission requested | On first tap of the camera button, the OS permission dialog appears (iOS: "App Would Like to Access the Camera"). After granting, the native camera viewfinder opens. |
| AC-3 | Camera permission denied | If the user denies camera permission, the upload screen displays an error string (red text in the hint area) such as "Camera access is required..." / "需要开启相机权限...". No crash, no navigation. |
| AC-4 | Successful capture enters parse flow | After capturing a photo, the app navigates to `/ledger/parse` with `fileName`, `rawJson`, `rawText`, `model` params populated. The parse review screen renders batch state, raw JSON, and planner summary. |
| AC-5 | Cancel capture has no side effects | Pressing the cancel / back button in the native camera UI returns to the upload screen. The screen shows the idle hint text. No error banner. `isBusy` returns to false. |
| AC-6 | Downstream planner/review works | After camera capture, the full mapping/planner/review workflow (counterparty proposals, persist candidate, approve/reject) completes without error, identical to photo-library-originated images. |
| AC-7 | Existing photo library path unaffected | Tapping "Select Photos" still opens the media library, selection still works, parse still succeeds. |
| AC-8 | Existing file picker path unaffected | Tapping "Select Files" still opens the document picker, selection still works, parse still succeeds. |
| AC-9 | Automated test exists | At least one new Vitest test case covers the camera capture path (permission + launch + candidate shape). |
| AC-10 | Smoke README updated | `tests/smoke/README.md` contains a new numbered step describing the manual camera capture verification path. |

---

## 3. Scenario Table / Test Points

### 3.1 Normal (Happy Path)

| ID | Scenario | Preconditions | Steps | Expected result |
|----|----------|---------------|-------|-----------------|
| N-1 | First-time camera capture, permission granted | Camera permission not yet determined; OpenAI key configured | Tap camera button -> Grant permission -> Take photo -> Confirm | Navigate to parse screen; raw JSON visible; planner runs |
| N-2 | Subsequent camera capture, permission already granted | Camera permission previously granted | Tap camera button -> Take photo -> Confirm | Camera opens immediately (no permission dialog); parse screen loads |
| N-3 | Camera capture with Gemini provider | AI provider set to Gemini; Gemini key configured | Tap camera button -> Take photo -> Confirm | Parse screen shows gemini model; planner runs normally |
| N-4 | Camera capture then full workflow completion | Camera permission granted; API key configured | Tap camera -> Take photo -> Confirm -> Approve counterparty proposals -> Approve persist -> Check Home | Record saved; Home metrics update; batchState = "approved" |

### 3.2 Exception / Error Paths

| ID | Scenario | Preconditions | Steps | Expected result |
|----|----------|---------------|-------|-----------------|
| E-1 | Camera permission denied (first time) | Camera permission not determined | Tap camera button -> Deny permission | Error message displayed in hint area; no crash; upload screen remains interactive |
| E-2 | Camera permission previously denied (settings) | Camera permission permanently denied in OS settings | Tap camera button | Error message displayed immediately; no permission dialog (OS blocks re-ask) |
| E-3 | Camera capture cancelled by user | Camera permission granted | Tap camera button -> Camera opens -> Tap cancel / back | Return to upload screen; hint shows idle text; no error |
| E-4 | Camera capture, OpenAI key missing | Camera permission granted; no API key configured | Tap camera -> Take photo -> Confirm | Parse screen loads; parse fails with clear "API key missing" error message |
| E-5 | Camera capture, OpenAI returns 429 | Camera permission granted; API key configured | Tap camera -> Take photo -> Confirm (OpenAI rate-limited) | Parse screen loads; error message about rate limit visible |
| E-6 | Camera capture, network offline | Camera permission granted; device offline | Tap camera -> Take photo -> Confirm | Error message about network failure; no crash |

### 3.3 Boundary / Edge Cases

| ID | Scenario | Preconditions | Steps | Expected result |
|----|----------|---------------|-------|-----------------|
| B-1 | Very large photo (>10 MB HEIC) | Camera permission granted | Take photo with max resolution | Photo is processed; if too large, a clear error or graceful degradation; no crash |
| B-2 | Camera button tapped while isBusy from another import | A photo library import is in progress | Tap camera button | Button is disabled (opacity 0.7); no second import starts |
| B-3 | Rapid double-tap on camera button | Camera permission granted | Double-tap quickly | Only one camera session opens; no duplicate navigation |
| B-4 | Camera capture on web platform | Running on web browser | Render upload screen | Camera button is either hidden or shows a "not supported on web" state; no crash |
| B-5 | Camera photo with null mimeType | Camera returns asset with undefined mimeType | Complete capture flow | `mimeType` defaults gracefully (e.g., `"image/jpeg"`); parse proceeds |
| B-6 | Camera photo with missing fileName | Camera returns asset without fileName | Complete capture flow | `originalFileName` defaults to a generated name (e.g., `"photo-1.jpg"`); parse proceeds |
| B-7 | Switch theme (dark/light) with camera button visible | Upload screen open | Toggle theme in settings, return to upload screen | Camera button label and icon remain clearly readable in both themes |
| B-8 | Switch locale with camera button visible | Upload screen open | Toggle locale to zh-CN | Camera button label changes to Chinese equivalent (e.g., "拍照") |

---

## 4. Smoke Path (Shortest Main Path)

**Purpose**: Confirm the critical happy path in the fewest possible steps.

```
1. Launch app -> Skip login -> Navigate to Ledger tab
2. Tap "New Records" (or equivalent upload entry)
3. Verify camera button is visible on upload screen
4. Tap camera button
5. Grant camera permission (if prompted)
6. Take a photo of a receipt
7. Confirm the photo
8. Verify navigation to Parse Review screen
9. Verify raw JSON and planner summary are displayed
10. Approve all write proposals
11. Verify batchState = "approved" and Home metrics refresh
```

**Pass criterion**: Steps 1-11 complete without error or crash. Parse Review screen shows valid extracted data from the camera-captured image.

---

## 5. Simulator Step-by-Step Checklist (Aligned with PRD Acceptance Items)

### PRD AC-1: Camera entry is visible and clickable

- [ ] Open the app in iOS Simulator (or Android emulator)
- [ ] Navigate to Ledger tab -> Tap "New Records"
- [ ] Verify `ledger-upload-screen` renders
- [ ] Verify a third button exists below "Select Photos" and "Select Files"
- [ ] Verify the third button has a camera icon (e.g., `MaterialCommunityIcons` name `camera-outline` or similar)
- [ ] Verify the button label reads "Take Photo" (en) or "拍照" (zh-CN)
- [ ] Verify the button has `testID="ledger-upload-camera-button"` (inspect via Flipper or accessibility inspector)
- [ ] Verify the button is pressable (not disabled when `isBusy` is false)

### PRD AC-2: Granting camera permission allows capture and enters parse flow

- [ ] Reset camera permission for the app (Settings -> Privacy -> Camera -> remove app or reset simulator)
- [ ] Tap the camera button
- [ ] Verify the OS camera permission dialog appears
- [ ] Tap "Allow"
- [ ] Verify the native camera interface opens
- [ ] Take a photo and confirm
- [ ] Verify navigation to `/ledger/parse`
- [ ] Verify `fileName` param is populated
- [ ] Verify parse review shows raw JSON, model, planner summary
- [ ] Complete the full approval workflow (counterparty + persist proposals)

### PRD AC-3: Denying camera permission shows a clear message

- [ ] Reset camera permission for the app
- [ ] Tap the camera button
- [ ] Tap "Don't Allow" on the OS permission dialog
- [ ] Verify the upload screen displays a red error message in the hint area
- [ ] Verify the message content is informative (mentions camera permission)
- [ ] Verify the error is localized when locale is zh-CN
- [ ] Verify the upload screen remains interactive (can tap "Select Photos" or "Select Files")

### PRD AC-4: Cancelling camera does not crash or freeze

- [ ] Ensure camera permission is granted
- [ ] Tap the camera button
- [ ] Verify the native camera opens
- [ ] Tap the cancel / back button (without taking a photo)
- [ ] Verify the upload screen reappears
- [ ] Verify the hint text shows the idle message (not "empty selection", not an error)
- [ ] Verify `isBusy` is false (buttons are not dimmed)
- [ ] Verify the "Select Photos" and "Select Files" buttons still work

### PRD AC-5: Mapping / planner / review main flow preserved after camera capture

- [ ] Complete a camera capture (AC-2 flow)
- [ ] On the parse review screen, verify:
  - [ ] Batch state label is visible
  - [ ] Raw parse JSON section is expandable and shows valid JSON
  - [ ] Planner summary section shows `businessEvents`, `candidateRecords`, etc.
  - [ ] `Amount`, `Date`, `Source`, `Target` fields are editable
  - [ ] Write proposals are listed with approve/reject actions
- [ ] If `create_counterparty` proposal exists, approve it first
- [ ] Approve `persist_candidate_record`
- [ ] Verify `batchState` transitions to "approved"
- [ ] Navigate to Home and verify metrics refresh

### PRD AC-6: Existing file/album upload has no regression

- [ ] After verifying camera flow, tap "New Records" again
- [ ] Tap "Select Photos"
- [ ] Select an image from the photo library
- [ ] Verify parse review screen loads correctly
- [ ] Tap "New Records" again
- [ ] Tap "Select Files"
- [ ] Select a PDF file
- [ ] Verify parse review screen loads correctly
- [ ] Complete at least one full approval workflow from a library/file import

### PRD AC-7: Automated test exists

- [ ] Run `pnpm --filter @ledgerly/mobile test`
- [ ] Verify a test named similar to "picks camera capture candidate" or "launches camera and returns upload candidate" exists and passes
- [ ] Verify the test mocks `ImagePicker.launchCameraAsync` and `ImagePicker.requestCameraPermissionsAsync`
- [ ] Verify the test asserts the returned candidate shape matches `UploadCandidate`

### PRD AC-8: Smoke README updated

- [ ] Open `tests/smoke/README.md`
- [ ] Verify a new numbered step exists under "手工（设备 / 模拟器）" describing the camera capture verification path
- [ ] Verify the step mentions: camera button visibility, permission grant, photo capture, parse review entry

---

## 6. Automated Test Suggestions

### 6.1 Unit tests -- `apps/mobile/tests/ledger-runtime-web.test.ts`

**New test case: Camera capture candidate (web runtime)**

If the web runtime adds a `pickCameraUploadCandidate()` function (or an equivalent that returns `[]` since web has no camera):

```
it("returns empty candidates for camera on web platform", async () => {
  // Assert pickCameraUploadCandidate returns [] on web
});
```

### 6.2 Unit tests -- New file: `apps/mobile/tests/ledger-camera.test.ts` (recommended)

This is the primary location for the required automated test(s). It should test the native camera capture flow using mocked `expo-image-picker`.

**Test 1: Camera permission granted, successful capture returns valid UploadCandidate**

```typescript
// Mock expo-image-picker with:
//   requestCameraPermissionsAsync -> { granted: true }
//   launchCameraAsync -> { canceled: false, assets: [{ uri, fileName, mimeType, fileSize }] }
// Call pickCameraUploadCandidate(locale)
// Assert returned candidate has kind: "image", correct uri, fileName, mimeType
```

**Test 2: Camera permission denied throws descriptive error**

```typescript
// Mock requestCameraPermissionsAsync -> { granted: false }
// Call pickCameraUploadCandidate(locale)
// Assert it throws with message containing "Camera" or "相机"
```

**Test 3: Camera capture cancelled returns empty array**

```typescript
// Mock requestCameraPermissionsAsync -> { granted: true }
// Mock launchCameraAsync -> { canceled: true, assets: [] }
// Call pickCameraUploadCandidate(locale)
// Assert returned array is empty ([])
```

**Test 4: Camera candidate flows into parseFile without error**

```typescript
// Mock camera to return a valid asset
// Mock parseFileWithOpenAi / parseFileWithOpenAiFromBlob to return a valid ParseResult
// Call parseFile(candidate.uri, candidate.originalFileName, candidate.mimeType)
// Assert result has rawJson, rawText, model populated and no error
```

**Test 5: Locale-aware permission error messages**

```typescript
// Mock requestCameraPermissionsAsync -> { granted: false }
// Call pickCameraUploadCandidate("en")
// Assert error message is in English
// Call pickCameraUploadCandidate("zh-CN")
// Assert error message is in Chinese
```

### 6.3 Existing test regression checks

The following existing tests must continue to pass without modification, confirming no regression:

| File | Test | Validates |
|------|------|-----------|
| `apps/mobile/tests/ledger-runtime-web.test.ts` | "picks photo candidates from the image library" | Photo library path unchanged |
| `apps/mobile/tests/ledger-runtime-web.test.ts` | "parses a file via OpenAI and returns raw JSON" | Parse flow unchanged |
| `apps/mobile/tests/ledger-runtime-web.test.ts` | "returns error when OpenAI fails" | Error handling unchanged |
| `apps/mobile/tests/ledger-runtime-web.test.ts` | "keeps merge decisions in memory..." | Planner workflow unchanged |
| `apps/mobile/tests/feat_upload.int.test.ts` | All tests | Upload data flow unchanged |
| `apps/mobile/tests/feat_upload_home.test.ts` | All tests | Home aggregation unchanged |
| `apps/mobile/tests/remote-parse.test.ts` | All tests | Remote parse logic unchanged |

### 6.4 Smoke test update -- `tests/smoke/README.md`

Add the following step (suggested insertion after current step 10, as a new step 10.5 or renumbered step 11):

```markdown
11. 在 Upload workspace 中确认 **相机拍照入口** 可用：
    - Upload 页面存在第三个按钮，图标为相机，文案为 "Take Photo" / "拍照"
    - 点击后弹出系统相机权限对话框（首次）
    - 授权后打开原生相机，拍照并确认后进入 Parse Review
    - Parse Review 可见 batch state、raw JSON、planner summary
    - 取消拍照（不拍照直接返回）后页面不报错、不卡死
    - 拒绝相机权限后显示红色错误提示，页面仍可交互
    - 既有 "Select Photos" 与 "Select Files" 功能不受影响
```

### 6.5 File summary

| Action | File path | Rationale |
|--------|-----------|-----------|
| **Create** | `apps/mobile/tests/ledger-camera.test.ts` | Primary automated test file for camera capture flow |
| **Modify** | `apps/mobile/tests/ledger-runtime-web.test.ts` | Add test for web camera fallback (returns empty or unavailable) if web runtime adds camera function |
| **Modify** | `tests/smoke/README.md` | Add manual camera capture verification step |
| **No change** | `apps/mobile/tests/feat_upload.int.test.ts` | Regression -- must continue to pass |
| **No change** | `apps/mobile/tests/feat_upload_home.test.ts` | Regression -- must continue to pass |
| **No change** | `apps/mobile/tests/remote-parse.test.ts` | Regression -- must continue to pass |

---

## Appendix: Key Code References

| Artifact | Path | Role in test design |
|----------|------|---------------------|
| Upload screen UI | `apps/mobile/src/features/ledger/ledger-upload-screen.tsx` | Where camera button will be added; existing testIDs to reference |
| Native runtime (photo picker) | `apps/mobile/src/features/ledger/ledger-runtime.native.ts` | `pickPhotoUploadCandidates` is the model for `pickCameraUploadCandidate` |
| Web runtime (photo picker) | `apps/mobile/src/features/ledger/ledger-runtime.web.ts` | Web fallback behavior for camera |
| Copy definitions | `apps/mobile/src/features/app-shell/copy.ts` | Where `upload.takePhoto` / `upload.camera` copy key will be added |
| Existing web test | `apps/mobile/tests/ledger-runtime-web.test.ts` | Pattern for mocking `expo-image-picker` |
| Existing upload integration test | `apps/mobile/tests/feat_upload.int.test.ts` | Regression baseline |
| Smoke README | `tests/smoke/README.md` | Manual verification checklist to update |
| Smoke script | `tests/smoke/test-pdf-parse.mjs` | Already supports image inputs -- no changes needed |
