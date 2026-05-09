import type { SupportedLanguage } from "../bootstrap/languages";
import type { SkillLevel } from "../bootstrap/skill-levels";

export type WizardState = {
  step: number;
  projectName: string;
  targetDir: string;
  /** Has the trainee manually edited the target dir? Drives the auto-suggest carry. */
  targetDirEdited: boolean;
  commLang: SupportedLanguage;
  docLang: SupportedLanguage;
  skill: SkillLevel;
  outputFolder: string;
  /** Furthest step the trainee has visited; gates jump-to-step on dot clicks. */
  furthestStep: number;
};

export const INITIAL_STATE: WizardState = {
  step: 0,
  projectName: "",
  targetDir: "",
  targetDirEdited: false,
  commLang: "English",
  docLang: "English",
  skill: "intermediate",
  outputFolder: "_bmad-output",
  furthestStep: 0,
};

export type WizardAction =
  | { type: "SET_PROJECT_NAME"; value: string }
  | { type: "SET_TARGET_DIR"; value: string; edited: boolean }
  | { type: "SET_COMM_LANG"; value: SupportedLanguage }
  | { type: "SET_DOC_LANG"; value: SupportedLanguage }
  | { type: "SET_SKILL"; value: SkillLevel }
  | { type: "SET_OUTPUT_FOLDER"; value: string }
  | { type: "GO_NEXT" }
  | { type: "GO_BACK" }
  | { type: "JUMP_TO_STEP"; step: number };

const PROJECT_NAME_RE = /^[a-z][a-z0-9-]{1,63}$/;
const RELATIVE_OUTPUT_RE = /^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/;

export function isStepValid(state: WizardState, step: number): boolean {
  switch (step) {
    case 0:
      return PROJECT_NAME_RE.test(state.projectName);
    case 1:
      return state.targetDir.length > 0 && state.targetDir.startsWith("/");
    case 2:
    case 3:
      return true;
    case 4:
      return ["beginner", "intermediate", "expert"].includes(state.skill);
    case 5:
      return (
        state.outputFolder.length > 0 &&
        state.outputFolder.length <= 64 &&
        !state.outputFolder.includes("..") &&
        !state.outputFolder.startsWith("/") &&
        RELATIVE_OUTPUT_RE.test(state.outputFolder)
      );
    default:
      return false;
  }
}

function suggestedTargetDir(projectName: string): string {
  if (!projectName) return "";
  return `/home/${process.env.USER ?? "user"}/projects/${projectName}`;
}

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "SET_PROJECT_NAME": {
      const next: WizardState = { ...state, projectName: action.value };
      // Auto-suggest target dir IF the trainee hasn't manually edited it.
      if (!state.targetDirEdited) {
        next.targetDir = suggestedTargetDir(action.value);
      }
      return next;
    }
    case "SET_TARGET_DIR":
      return { ...state, targetDir: action.value, targetDirEdited: action.edited };
    case "SET_COMM_LANG":
      return { ...state, commLang: action.value };
    case "SET_DOC_LANG":
      return { ...state, docLang: action.value };
    case "SET_SKILL":
      return { ...state, skill: action.value };
    case "SET_OUTPUT_FOLDER":
      return { ...state, outputFolder: action.value };
    case "GO_NEXT":
      if (!isStepValid(state, state.step)) return state;
      if (state.step >= 5) return state;
      return {
        ...state,
        step: state.step + 1,
        furthestStep: Math.max(state.furthestStep, state.step + 1),
      };
    case "GO_BACK":
      if (state.step <= 0) return state;
      return { ...state, step: state.step - 1 };
    case "JUMP_TO_STEP":
      if (action.step < 0 || action.step > state.furthestStep) return state;
      return { ...state, step: action.step };
    default:
      return state;
  }
}

/** Encode wizard state to base64-encoded JSON for the bootstrap URL. */
export function encodeWizardState(state: WizardState): string {
  const payload = {
    projectName: state.projectName,
    targetDir: state.targetDir,
    commLang: state.commLang,
    docLang: state.docLang,
    skill: state.skill,
    outputFolder: state.outputFolder,
  };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export type WizardPayload = ReturnType<typeof decodeWizardState>;

export function decodeWizardState(encoded: string): {
  projectName: string;
  targetDir: string;
  commLang: SupportedLanguage;
  docLang: SupportedLanguage;
  skill: SkillLevel;
  outputFolder: string;
} {
  const json = Buffer.from(encoded, "base64url").toString("utf8");
  return JSON.parse(json);
}
