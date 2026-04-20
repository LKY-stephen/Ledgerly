import { describe, expect, it } from "vitest";

import { appCopy } from "../src/features/app-shell/copy";

describe("login copy", () => {
  it("keeps both locales aligned for the optimized login surface", () => {
    const englishLogin = appCopy.en.login;
    const chineseLogin = appCopy["zh-CN"].login;

    expect(Object.keys(englishLogin).sort()).toEqual(
      Object.keys(chineseLogin).sort(),
    );
    expect(englishLogin.signals).toHaveLength(3);
    expect(chineseLogin.signals).toHaveLength(3);
    expect(englishLogin.poemLines).toHaveLength(4);
    expect(chineseLogin.poemLines).toHaveLength(4);
    expect(englishLogin.privacyMetrics).toHaveLength(2);
    expect(chineseLogin.privacyMetrics).toHaveLength(2);
    expect(englishLogin.title.length).toBeLessThan(80);
    expect(chineseLogin.title.length).toBeLessThan(30);
    expect(englishLogin.body.length).toBeLessThan(100);
    expect(chineseLogin.body.length).toBeLessThan(60);
  });

  it("keeps settings copy aligned for the database import controls", () => {
    const englishSettings = appCopy.en.meScreen;
    const chineseSettings = appCopy["zh-CN"].meScreen;

    expect(Object.keys(englishSettings).sort()).toEqual(
      Object.keys(chineseSettings).sort(),
    );
    expect(englishSettings.databaseImportAction.length).toBeGreaterThan(0);
    expect(chineseSettings.databaseImportAction.length).toBeGreaterThan(0);
    expect(englishSettings.apiSectionTitle.length).toBeGreaterThan(0);
    expect(chineseSettings.apiSectionTitle.length).toBeGreaterThan(0);
  });

  it("keeps startup storage-setup copy aligned across locales", () => {
    const englishStorageSetup = appCopy.en.storageSetup;
    const chineseStorageSetup = appCopy["zh-CN"].storageSetup;

    expect(Object.keys(englishStorageSetup).sort()).toEqual(
      Object.keys(chineseStorageSetup).sort(),
    );
    expect(englishStorageSetup.importAction.length).toBeGreaterThan(0);
    expect(englishStorageSetup.initializeAction.length).toBeGreaterThan(0);
    expect(chineseStorageSetup.importAction.length).toBeGreaterThan(0);
    expect(chineseStorageSetup.initializeAction.length).toBeGreaterThan(0);
  });
});
