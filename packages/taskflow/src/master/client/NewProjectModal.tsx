import { useEffect, useState } from "react";
import styled from "styled-components";
import { Button, Modal, Select } from "../../dashboard/client/components/index.js";
import { createProject, listFolders, type FsEntry } from "./api.js";
import { FolderIcon, FolderUpIcon, PlusIcon } from "./icons.js";

// N231 — the "New project" modal, matching the Lovable prototype on the shared
// Modal shell: a folder browser (real /api/fs/list navigation, styled like the
// Lovable list), install options as bordered feature cards with a green check,
// an editor select, and a purple Create button. Scaffolds <folder>/<name> via
// POST /api/projects/create.

const Field = styled.div`
  margin-bottom: ${(p) => p.theme.space["2xl"]};
`;

const FieldLabel = styled.label`
  display: block;
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: oklch(0.82 0.02 260);
  margin-bottom: ${(p) => p.theme.space.md};
`;

const PathLine = styled.div`
  font-size: 14px;
  line-height: 20px;
  color: oklch(0.82 0.02 260);
  word-break: break-all;
  margin-bottom: ${(p) => p.theme.space.md};
`;

const FolderList = styled.ul`
  border: 1px solid ${(p) => p.theme.color.border};
  border-radius: ${(p) => p.theme.radius.lg};
  max-height: 220px;
  overflow: auto;
  background: ${(p) => p.theme.color.bg};
`;

const FolderItem = styled.button`
  display: flex;
  align-items: center;
  gap: ${(p) => p.theme.space.lg};
  width: 100%;
  min-height: 44px;
  text-align: left;
  padding: 0 ${(p) => p.theme.space.lg};
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  font-family: inherit;
  color: ${(p) => p.theme.color.text};
  background: none;
  border: none;
  border-bottom: 1px solid ${(p) => p.theme.color.border};
  cursor: pointer;

  &:last-child {
    border-bottom: none;
  }
  &:hover {
    background: ${(p) => p.theme.color.surface};
  }
  svg {
    flex-shrink: 0;
    color: ${(p) => p.theme.color.textMuted};
  }
`;

const FolderEmpty = styled.li`
  padding: ${(p) => p.theme.space.lg};
  font-size: ${(p) => p.theme.font.size.base};
  color: ${(p) => p.theme.color.textMuted};
`;

const TextInput = styled.input`
  width: 100%;
  height: 44px;
  box-sizing: border-box;
  background: ${(p) => p.theme.color.bg};
  border: 1px solid ${(p) => p.theme.color.border};
  border-radius: ${(p) => p.theme.radius.lg};
  padding: 0 ${(p) => p.theme.space.lg};
  color: ${(p) => p.theme.color.text};
  font-family: inherit;
  font-size: ${(p) => p.theme.font.size.md};

  &:focus {
    outline: none;
    border-color: ${(p) => p.theme.color.accent};
  }
`;

// --- install feature card (Lovable: bordered row, green check + tint when on) --

const FeatureCard = styled.label<{ $checked: boolean; $disabled: boolean }>`
  display: flex;
  align-items: center;
  gap: ${(p) => p.theme.space.lg};
  min-height: 44px;
  padding: ${(p) => p.theme.space.md} ${(p) => p.theme.space.lg};
  margin-bottom: ${(p) => p.theme.space.md};
  border-radius: ${(p) => p.theme.radius.lg};
  cursor: ${(p) => (p.$disabled ? "default" : "pointer")};
  opacity: ${(p) => (p.$disabled ? 0.5 : 1)};
  background: ${(p) => (p.$checked ? "rgba(34, 197, 94, 0.12)" : p.theme.color.bg)};
  border: 1px solid ${(p) => (p.$checked ? p.theme.color.green : p.theme.color.border)};
  &:focus-within {
    border-color: ${(p) => (p.$checked ? p.theme.color.green : p.theme.color.accent)};
  }
`;

const HiddenCheckbox = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
`;

const CheckSquare = styled.span<{ $checked: boolean }>`
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border-radius: ${(p) => p.theme.radius.sm};
  background: ${(p) => (p.$checked ? p.theme.color.green : "oklch(0.26 0.02 260)")};
  border: 1px solid ${(p) => (p.$checked ? p.theme.color.green : "oklch(0.45 0.02 260)")};
  color: #0a0a0a;
`;

const FeatureName = styled.span`
  font-weight: ${(p) => p.theme.font.weight.semibold};
  color: ${(p) => p.theme.color.text};
`;

const FeatureHint = styled.span`
  color: ${(p) => p.theme.color.textMuted};
  font-size: 12px;
  line-height: 16px;
  margin-left: ${(p) => p.theme.space.md};
`;

function CheckGlyph() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function Feature({
  checked,
  disabled,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <FeatureCard $checked={checked} $disabled={disabled}>
      <HiddenCheckbox
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <CheckSquare $checked={checked} aria-hidden="true">
        {checked ? <CheckGlyph /> : null}
      </CheckSquare>
      <span>
        <FeatureName>{label}</FeatureName>
        {hint ? <FeatureHint>{hint}</FeatureHint> : null}
      </span>
    </FeatureCard>
  );
}

// N233 — git-ignore choice (radio). Same feature-card shell as the installs, but
// a round indicator to read as single-choice.
const RadioDot = styled.span<{ $checked: boolean }>`
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border-radius: 50%;
  background: ${(p) => (p.$checked ? p.theme.color.green : "oklch(0.26 0.02 260)")};
  border: 1px solid ${(p) => (p.$checked ? p.theme.color.green : "oklch(0.45 0.02 260)")};
  color: #0a0a0a;
`;

function GitOption({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  hint?: string;
}) {
  return (
    <FeatureCard $checked={checked} $disabled={false}>
      <HiddenCheckbox
        type="radio"
        name="np-gitignore"
        checked={checked}
        onChange={() => onChange()}
      />
      <RadioDot $checked={checked} aria-hidden="true">
        {checked ? <CheckGlyph /> : null}
      </RadioDot>
      <span>
        <FeatureName>{label}</FeatureName>
        {hint ? <FeatureHint>{hint}</FeatureHint> : null}
      </span>
    </FeatureCard>
  );
}

const EditorRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${(p) => p.theme.space.lg};
  font-size: ${(p) => p.theme.font.size.base};
  color: ${(p) => p.theme.color.text};
`;

const EditorLabel = styled.label`
  color: oklch(0.97 0.01 260);
  font-weight: 600;
  font-size: 14px;
`;

const StatusLine = styled.div<{ $tone: "" | "ok" | "err" }>`
  font-size: ${(p) => p.theme.font.size.base};
  min-height: 16px;
  margin-bottom: ${(p) => p.theme.space.lg};
  color: ${(p) =>
    p.$tone === "ok"
      ? p.theme.color.green
      : p.$tone === "err"
        ? p.theme.color.red
        : p.theme.color.textMuted};
`;

// Lovable's Create CTA: lighter indigo fill with dark text.
const CreateBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${(p) => p.theme.space.md};
  height: 44px;
  padding: 0 16px;
  border: none;
  border-radius: ${(p) => p.theme.radius.xl};
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  background: oklch(0.7 0.18 260);
  color: oklch(0.15 0.02 260);
  &:hover {
    opacity: 0.9;
  }
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

// Cancel at the Lovable 44px height, white text.
const CancelBtn = styled(Button)`
  height: 44px;
  padding: 0 16px;
  border-radius: ${(p) => p.theme.radius.xl};
  font-size: 14px;
  font-weight: 600;
  color: #fff;
`;

function trimSlash(s: string): string {
  let out = s;
  while (out.length > 1 && out.endsWith("/")) out = out.slice(0, -1);
  return out;
}

type Editor = "claude" | "cursor" | "all";
type Tone = "" | "ok" | "err";
type GitIgnore = "shared" | "local";
type Location = "in-folder" | "subfolder";

const baseName = (p: string): string => p.split("/").filter(Boolean).pop() ?? "";
// The registry name/label must pass the server's `[A-Za-z0-9 _-]` check, so a
// folder basename like `my.app` becomes `my-app` when used as the default label.
const labelFrom = (dir: string): string => baseName(dir).replace(/[^A-Za-z0-9 _-]/g, "-");

export function NewProjectModal({ onClose }: { onClose: () => void }) {
  const [dir, setDir] = useState<string | null>(null);
  const [path, setPath] = useState("");
  const [parent, setParent] = useState<string | null>(null);
  const [entries, setEntries] = useState<FsEntry[]>([]);
  const [name, setName] = useState("");
  const [lifecycle, setLifecycle] = useState(true);
  const [activity, setActivity] = useState(false);
  const [composer, setComposer] = useState(false);
  const [registerHub, setRegisterHub] = useState(true);
  const [editor, setEditor] = useState<Editor>("claude");
  // N236 — init in the selected folder (default) or in a new subfolder named by `name`.
  const [location, setLocation] = useState<Location>("in-folder");
  // N233 — the chosen folder's git state + the gitignore choice (default shared).
  const [hasGit, setHasGit] = useState(false);
  const [gitIgnore, setGitIgnore] = useState<GitIgnore>("shared");
  const [status, setStatus] = useState<{ msg: string; tone: Tone }>({ msg: "", tone: "" });
  const [creating, setCreating] = useState(false);

  // Cursor-only projects can't use the Claude-shaped installs (their hooks/commands
  // emit under .claude/). Disable + uncheck them, matching overview.ts npEditorChanged.
  const cursorOnly = editor === "cursor";

  const browse = (target: string | null): void => {
    listFolders(target).then(
      (d) => {
        if (d.error) {
          setStatus({ msg: d.error, tone: "err" });
          return;
        }
        setDir(d.dir);
        setPath(d.dir);
        setParent(d.parent ?? null);
        setEntries(d.entries ?? []);
        setHasGit(Boolean(d.hasGit));
      },
      () => setStatus({ msg: "Could not list folders.", tone: "err" }),
    );
  };

  // Browse the home root once, on open.
  useEffect(() => {
    browse(null);
  }, []);

  const basePath = dir === "/" ? "" : dir ? trimSlash(dir) : "";

  const create = (): void => {
    if (!dir) {
      setStatus({ msg: "Pick a folder first.", tone: "err" });
      return;
    }
    // In-folder: the name is just the registry label — default it to the folder name.
    const effectiveName = name.trim() || (location === "in-folder" ? labelFrom(dir) : "");
    if (!effectiveName) {
      setStatus({ msg: "Enter a project name.", tone: "err" });
      return;
    }
    setCreating(true);
    setStatus({ msg: "Creating…", tone: "" });
    createProject({
      name: effectiveName,
      dir,
      location,
      lifecycle: cursorOnly ? false : lifecycle,
      activity: cursorOnly ? false : activity,
      registerHub,
      editor,
      installFlows: !cursorOnly && composer ? ["composer-authoring"] : [],
      gitIgnore: hasGit ? gitIgnore : undefined,
    }).then(
      (d) => {
        if (d.error) {
          setCreating(false);
          setStatus({ msg: d.error, tone: "err" });
          return;
        }
        // The project was created, but a requested flow may have failed to install.
        if (d.warnings && d.warnings.length) {
          setStatus({ msg: `Created at ${d.path} — ${d.warnings.join("; ")}`, tone: "err" });
          setTimeout(() => window.location.reload(), 3000);
          return;
        }
        setStatus({ msg: `Created at ${d.path}`, tone: "ok" });
        setTimeout(() => window.location.reload(), 900);
      },
      () => {
        setCreating(false);
        setStatus({ msg: "Could not create project.", tone: "err" });
      },
    );
  };

  return (
    <Modal
      title="New project"
      onClose={onClose}
      closeDisabled={creating}
      footer={
        <>
          <CancelBtn type="button" $variant="secondary" disabled={creating} onClick={onClose}>
            Cancel
          </CancelBtn>
          <CreateBtn type="button" disabled={creating} onClick={create}>
            <PlusIcon size={14} />
            Create
          </CreateBtn>
        </>
      }
    >
      <Field>
        <FieldLabel as="div">Folder</FieldLabel>
        <PathLine>{path}</PathLine>
        <FolderList>
          {parent ? (
            <li>
              <FolderItem type="button" onClick={() => browse(parent)}>
                <FolderUpIcon size={16} /> ..
              </FolderItem>
            </li>
          ) : null}
          {entries.map((e) => (
            <li key={e.name}>
              <FolderItem type="button" onClick={() => browse(`${basePath}/${e.name}`)}>
                <FolderIcon size={16} /> {e.name}
              </FolderItem>
            </li>
          ))}
          {!entries.length && !parent ? <FolderEmpty>No sub-folders here.</FolderEmpty> : null}
        </FolderList>
      </Field>

      <Field>
        <FieldLabel as="div">Init location</FieldLabel>
        <GitOption
          checked={location === "in-folder"}
          onChange={() => setLocation("in-folder")}
          label="Use the selected folder"
          hint={dir ? `init into ${baseName(dir)}/` : "init in place"}
        />
        <GitOption
          checked={location === "subfolder"}
          onChange={() => setLocation("subfolder")}
          label="Create a new subfolder"
          hint="named by the project name below"
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="np-name">
          {location === "in-folder" ? "Project name (label)" : "New folder name"}
        </FieldLabel>
        <TextInput
          id="np-name"
          type="text"
          value={name}
          maxLength={60}
          autoComplete="off"
          placeholder={location === "in-folder" && dir ? labelFrom(dir) : "my-project"}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>

      <Field>
        <FieldLabel as="div">Install</FieldLabel>
        <Feature
          checked={cursorOnly ? false : lifecycle}
          disabled={cursorOnly}
          onChange={setLifecycle}
          label="Task lifecycle events"
          hint="zero tokens"
        />
        <Feature
          checked={cursorOnly ? false : activity}
          disabled={cursorOnly}
          onChange={setActivity}
          label="Agent activity tracking"
          hint="~50 tokens/turn"
        />
        <Feature
          checked={cursorOnly ? false : composer}
          disabled={cursorOnly}
          onChange={setComposer}
          label="Composer-authoring flow"
          hint="build custom agents/flows"
        />
        <Feature
          checked={registerHub}
          disabled={false}
          onChange={setRegisterHub}
          label="Register with this hub"
        />
        <EditorRow>
          <EditorLabel htmlFor="np-editor">Editor</EditorLabel>
          <Select
            id="np-editor"
            value={editor}
            onChange={(e) => setEditor(e.target.value as Editor)}
          >
            <option value="claude">Claude</option>
            <option value="cursor">Cursor</option>
            <option value="all">Both</option>
          </Select>
        </EditorRow>
        {cursorOnly ? (
          <FeatureHint>Lifecycle, activity, and the composer flow are Claude-only.</FeatureHint>
        ) : null}
      </Field>

      {hasGit ? (
        <Field>
          <FieldLabel as="div">Git ignore</FieldLabel>
          <PathLine>
            This folder is a git repo. Hide the new project&apos;s files from it?
          </PathLine>
          <GitOption
            checked={gitIgnore === "shared"}
            onChange={() => setGitIgnore("shared")}
            label="Shared .gitignore"
            hint="committed — teammates get it"
          />
          <GitOption
            checked={gitIgnore === "local"}
            onChange={() => setGitIgnore("local")}
            label="Local only (.git/info/exclude)"
            hint="not committed — private to you"
          />
        </Field>
      ) : null}

      <StatusLine $tone={status.tone} role={status.tone === "err" ? "alert" : "status"}>
        {status.msg}
      </StatusLine>
    </Modal>
  );
}
