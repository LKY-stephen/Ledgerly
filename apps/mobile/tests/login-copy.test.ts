import { describe, expect, it } from "vitest";

import { appCopy } from "../src/features/app-shell/copy";

describe("login copy", () => {
  it("keeps both locales aligned for the optimized login surface", () => {
    const englishLogin = appCopy.en.login;
    const chineseLogin = appCopy["zh-CN"].login;

    expect(Object.keys(englishLogin).sort()).toEqual(Object.keys(chineseLogin).sort());
    expect(englishLogin.signals).toHaveLength(3);
    expect(chineseLogin.signals).toHaveLength(3);
    expect(englishLogin.title.length).toBeLessThan(60);
    expect(chineseLogin.title.length).toBeLessThan(30);
    expect(englishLogin.body.length).toBeLessThan(100);
    expect(chineseLogin.body.length).toBeLessThan(60);
  });
});
