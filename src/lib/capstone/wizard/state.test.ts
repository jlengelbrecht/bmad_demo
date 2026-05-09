import { describe, expect, it } from "vitest";

import {
  INITIAL_STATE,
  decodeWizardState,
  encodeWizardState,
  isStepValid,
  wizardReducer,
} from "./state";

describe("wizardReducer", () => {
  it("SET_PROJECT_NAME also auto-suggests targetDir when not edited", () => {
    const s = wizardReducer(INITIAL_STATE, {
      type: "SET_PROJECT_NAME",
      value: "demo-app",
    });
    expect(s.projectName).toBe("demo-app");
    expect(s.targetDir).toContain("demo-app");
    expect(s.targetDirEdited).toBe(false);
  });

  it("SET_PROJECT_NAME does NOT overwrite a manually-edited targetDir", () => {
    let s = wizardReducer(INITIAL_STATE, {
      type: "SET_TARGET_DIR",
      value: "/custom/path",
      edited: true,
    });
    s = wizardReducer(s, { type: "SET_PROJECT_NAME", value: "demo" });
    expect(s.targetDir).toBe("/custom/path");
    expect(s.projectName).toBe("demo");
  });

  it("GO_NEXT advances when current step is valid", () => {
    let s = wizardReducer(INITIAL_STATE, {
      type: "SET_PROJECT_NAME",
      value: "demo-app",
    });
    s = wizardReducer(s, { type: "GO_NEXT" });
    expect(s.step).toBe(1);
    expect(s.furthestStep).toBe(1);
  });

  it("GO_NEXT does NOT advance when current step is invalid", () => {
    const s = wizardReducer(INITIAL_STATE, { type: "GO_NEXT" });
    expect(s.step).toBe(0);
  });

  it("GO_BACK never destroys forward-step values", () => {
    let s = wizardReducer(INITIAL_STATE, {
      type: "SET_PROJECT_NAME",
      value: "demo-app",
    });
    s = wizardReducer(s, { type: "GO_NEXT" });
    s = wizardReducer(s, {
      type: "SET_TARGET_DIR",
      value: "/tmp/demo",
      edited: true,
    });
    s = wizardReducer(s, { type: "GO_NEXT" });
    s = wizardReducer(s, { type: "GO_BACK" });
    expect(s.step).toBe(1);
    expect(s.targetDir).toBe("/tmp/demo");
  });

  it("JUMP_TO_STEP only allowed up to furthestStep", () => {
    let s = { ...INITIAL_STATE, furthestStep: 2, step: 2 };
    s = wizardReducer(s, { type: "JUMP_TO_STEP", step: 5 });
    expect(s.step).toBe(2);
    s = wizardReducer(s, { type: "JUMP_TO_STEP", step: 1 });
    expect(s.step).toBe(1);
  });
});

describe("isStepValid", () => {
  it("step 0 (project name) accepts kebab-case starting with letter", () => {
    expect(isStepValid({ ...INITIAL_STATE, projectName: "demo-app" }, 0)).toBe(true);
    expect(isStepValid({ ...INITIAL_STATE, projectName: "1demo" }, 0)).toBe(false);
    expect(isStepValid({ ...INITIAL_STATE, projectName: "Demo-App" }, 0)).toBe(false);
    expect(isStepValid({ ...INITIAL_STATE, projectName: "" }, 0)).toBe(false);
  });

  it("step 1 (target dir) requires absolute path", () => {
    expect(isStepValid({ ...INITIAL_STATE, targetDir: "/abs/path" }, 1)).toBe(true);
    expect(isStepValid({ ...INITIAL_STATE, targetDir: "rel/path" }, 1)).toBe(false);
  });

  it("step 5 (output folder) requires safe relative path", () => {
    expect(
      isStepValid({ ...INITIAL_STATE, outputFolder: "_bmad-output" }, 5),
    ).toBe(true);
    expect(isStepValid({ ...INITIAL_STATE, outputFolder: "/abs" }, 5)).toBe(false);
    expect(isStepValid({ ...INITIAL_STATE, outputFolder: "../escape" }, 5)).toBe(false);
    expect(isStepValid({ ...INITIAL_STATE, outputFolder: "" }, 5)).toBe(false);
  });
});

describe("encodeWizardState / decodeWizardState round-trip", () => {
  it("preserves the six fields", () => {
    const s = {
      ...INITIAL_STATE,
      projectName: "demo-app",
      targetDir: "/tmp/x",
      commLang: "Spanish" as const,
      docLang: "English" as const,
      skill: "expert" as const,
      outputFolder: "_out",
    };
    const enc = encodeWizardState(s);
    const dec = decodeWizardState(enc);
    expect(dec).toEqual({
      projectName: "demo-app",
      targetDir: "/tmp/x",
      commLang: "Spanish",
      docLang: "English",
      skill: "expert",
      outputFolder: "_out",
    });
  });
});
