"use client";

import { useReducer, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { SUPPORTED_LANGUAGES } from "@/lib/capstone/bootstrap/languages";
import { SKILL_LEVELS } from "@/lib/capstone/bootstrap/skill-levels";
import {
  INITIAL_STATE,
  encodeWizardState,
  isStepValid,
  wizardReducer,
} from "@/lib/capstone/wizard/state";

const STEP_TITLES = [
  "Project name",
  "Target directory",
  "Communication language",
  "Document output language",
  "Skill level",
  "Output folder",
];

export default function WizardPage() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get("session");
  const tool = params.get("tool");
  const [state, dispatch] = useReducer(wizardReducer, INITIAL_STATE);

  useEffect(() => {
    if (!sessionId || !/^\d{8}T\d{6}Z$/.test(sessionId)) {
      router.replace("/capstone/setup");
    }
  }, [sessionId, router]);

  const onNext = () => {
    if (state.step === 5 && isStepValid(state, 5)) {
      const wizard = encodeWizardState(state);
      const qs = new URLSearchParams({
        session: sessionId ?? "",
        ...(tool ? { tool } : {}),
        wizard,
      });
      router.push(`/capstone/setup/bootstrap?${qs.toString()}`);
      return;
    }
    dispatch({ type: "GO_NEXT" });
  };

  const onBack = () => dispatch({ type: "GO_BACK" });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Capstone setup — wizard
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Phase 1 — collect the bootstrap inputs. No on-disk state persists until Phase 2.
        </p>
        <DotIndicator state={state} dispatch={dispatch} />
      </header>

      <section className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Step {state.step + 1} of 6 — {STEP_TITLES[state.step]}
        </h2>
        {state.step === 0 ? (
          <ProjectNameStep
            value={state.projectName}
            onChange={(v) => dispatch({ type: "SET_PROJECT_NAME", value: v })}
          />
        ) : null}
        {state.step === 1 ? (
          <TargetDirStep
            value={state.targetDir}
            onChange={(v) =>
              dispatch({ type: "SET_TARGET_DIR", value: v, edited: true })
            }
          />
        ) : null}
        {state.step === 2 ? (
          <LanguageStep
            label="Communication language"
            value={state.commLang}
            onChange={(v) => dispatch({ type: "SET_COMM_LANG", value: v })}
          />
        ) : null}
        {state.step === 3 ? (
          <LanguageStep
            label="Document output language"
            value={state.docLang}
            onChange={(v) => dispatch({ type: "SET_DOC_LANG", value: v })}
          />
        ) : null}
        {state.step === 4 ? (
          <SkillStep
            value={state.skill}
            onChange={(v) => dispatch({ type: "SET_SKILL", value: v })}
          />
        ) : null}
        {state.step === 5 ? (
          <OutputFolderStep
            value={state.outputFolder}
            onChange={(v) => dispatch({ type: "SET_OUTPUT_FOLDER", value: v })}
          />
        ) : null}
      </section>

      <footer className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={state.step === 0}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!isStepValid(state, state.step)}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {state.step === 5 ? "Bootstrap →" : "Next →"}
        </button>
      </footer>
    </main>
  );
}

function DotIndicator({
  state,
  dispatch,
}: {
  state: ReturnType<typeof wizardReducer>;
  dispatch: React.Dispatch<Parameters<typeof wizardReducer>[1]>;
}) {
  return (
    <ol className="flex items-center gap-2" aria-label="wizard progress">
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const reached = i <= state.furthestStep;
        const current = i === state.step;
        return (
          <li key={i}>
            <button
              type="button"
              disabled={!reached}
              onClick={() => dispatch({ type: "JUMP_TO_STEP", step: i })}
              aria-label={`Jump to step ${i + 1}: ${STEP_TITLES[i]}`}
              aria-current={current ? "step" : undefined}
              className={`h-2.5 w-2.5 rounded-full ${
                current
                  ? "bg-zinc-900 dark:bg-zinc-100"
                  : reached
                    ? "bg-zinc-400 dark:bg-zinc-600"
                    : "bg-zinc-200 dark:bg-zinc-800"
              } disabled:cursor-not-allowed`}
            />
          </li>
        );
      })}
    </ol>
  );
}

function ProjectNameStep({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const valid = /^[a-z][a-z0-9-]{1,63}$/.test(value);
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="project-name" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
        Project name
      </label>
      <input
        id="project-name"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="my-bmad-app"
        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-950"
      />
      {value && !valid ? (
        <p className="text-xs text-rose-600 dark:text-rose-400">
          Lowercase, start with a letter, letters/digits/hyphens only (2-64 chars).
        </p>
      ) : (
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          Maps to <code className="font-mono">core.project_name</code>.
        </p>
      )}
    </div>
  );
}

function TargetDirStep({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const valid = value.length > 0 && value.startsWith("/");
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="target-dir" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
        Target directory (CHOSEN_DIR)
      </label>
      <input
        id="target-dir"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="/home/you/projects/my-bmad-app"
        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-950"
      />
      {value && !valid ? (
        <p className="text-xs text-rose-600 dark:text-rose-400">
          Must be an absolute path.
        </p>
      ) : (
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          The fresh repo lives here. Path-write allowlist (NFR-S7) enforced at bootstrap time.
        </p>
      )}
    </div>
  );
}

function LanguageStep({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: (typeof SUPPORTED_LANGUAGES)[number]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="lang-select" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
        {label}
      </label>
      <select
        id="lang-select"
        value={value}
        onChange={(e) =>
          onChange(e.target.value as (typeof SUPPORTED_LANGUAGES)[number])
        }
        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
      >
        {SUPPORTED_LANGUAGES.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

function SkillStep({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: (typeof SKILL_LEVELS)[number]["value"]) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
        Skill level
      </legend>
      {SKILL_LEVELS.map((level) => (
        <label key={level.value} className="flex items-start gap-2 text-sm">
          <input
            type="radio"
            name="skill"
            value={level.value}
            checked={value === level.value}
            onChange={() => onChange(level.value)}
          />
          <span className="flex flex-col">
            <span className="font-medium">{level.label}</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-500">
              {level.description}
            </span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function OutputFolderStep({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const valid =
    value.length > 0 &&
    value.length <= 64 &&
    !value.includes("..") &&
    !value.startsWith("/");
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="output-folder" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
        Output folder (relative to target directory)
      </label>
      <input
        id="output-folder"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="_bmad-output"
        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-950"
      />
      {value && !valid ? (
        <p className="text-xs text-rose-600 dark:text-rose-400">
          Relative path, no leading slash, no &apos;..&apos;, max 64 chars.
        </p>
      ) : (
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          Maps to <code className="font-mono">core.output_folder</code>.
        </p>
      )}
    </div>
  );
}
