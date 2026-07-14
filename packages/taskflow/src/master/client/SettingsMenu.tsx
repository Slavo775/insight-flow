import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { WATCHED_STATUSES, type NotifSettings } from "./notif.js";
import { SettingsIcon } from "./icons.js";
import { SquareIconButton } from "./ui.js";

// N231 — the notification settings popover, ported from overview.ts. Toggles the
// per-status notifications, sound, and mute-when-focused prefs read by the shared
// /hub-notify.js client. Kept from the old header (the Lovable redesign omits it,
// but dropping it would lose the only UI for these preferences).

const Wrap = styled.div`
  position: relative;
`;

const Popover = styled.div`
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  background: ${(p) => p.theme.color.surface};
  border: 1px solid ${(p) => p.theme.color.border};
  border-radius: ${(p) => p.theme.radius.xl};
  padding: ${(p) => p.theme.space.xl};
  min-width: 220px;
  z-index: 200;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
`;

const Head = styled.div`
  font-size: ${(p) => p.theme.font.size.sm};
  font-weight: ${(p) => p.theme.font.weight.semibold};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${(p) => p.theme.color.textMuted};
  margin-bottom: ${(p) => p.theme.space.lg};
`;

const Row = styled.label`
  display: flex;
  align-items: center;
  gap: ${(p) => p.theme.space.md};
  font-size: ${(p) => p.theme.font.size.base};
  padding: ${(p) => p.theme.space.xs} 0;
  cursor: pointer;
  color: ${(p) => p.theme.color.text};

  input {
    accent-color: ${(p) => p.theme.color.accent};
    cursor: pointer;
  }
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid ${(p) => p.theme.color.border};
  margin: ${(p) => p.theme.space.md} 0;
`;

const Hint = styled.div`
  font-size: ${(p) => p.theme.font.size.sm};
  color: ${(p) => p.theme.color.textMuted};
  margin-top: ${(p) => p.theme.space.md};
  line-height: 1.4;
`;

const STATUS_LABEL: Record<string, string> = {
  implemented: "Task implemented",
  approved: "Review approved",
  "fix-needed": "Fix needed",
  merged: "Merged",
  "changes-requested": "Changes requested",
};

function permissionHint(): string {
  if (typeof Notification === "undefined") return "Notifications not supported.";
  if (Notification.permission === "denied") return "Permission denied. Allow in browser settings.";
  if (Notification.permission === "default") return "Click a status toggle to enable.";
  return "Notifications enabled.";
}

export function SettingsMenu({
  settings,
  onChange,
}: {
  settings: NotifSettings;
  onChange: (next: NotifSettings) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent): void => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const setStatus = (key: string, checked: boolean): void => {
    // Enabling a status can prompt for permission (matching the old behavior).
    if (checked && typeof Notification !== "undefined" && Notification.permission === "default") {
      try {
        void Notification.requestPermission();
      } catch {
        /* ignore */
      }
    }
    onChange({ ...settings, statuses: { ...settings.statuses, [key]: checked } });
  };

  return (
    <Wrap ref={wrapRef}>
      <SquareIconButton
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Notification settings"
        title="Notification settings"
        onClick={() => setOpen((v) => !v)}
      >
        <SettingsIcon size={16} />
      </SquareIconButton>
      {open ? (
        <Popover role="menu">
          <Head>Notifications</Head>
          {WATCHED_STATUSES.map((key) => (
            <Row key={key}>
              <input
                type="checkbox"
                checked={settings.statuses[key] !== false}
                onChange={(e) => setStatus(key, e.target.checked)}
              />
              {STATUS_LABEL[key]}
            </Row>
          ))}
          <Divider />
          <Row>
            <input
              type="checkbox"
              checked={settings.sound !== false}
              onChange={(e) => onChange({ ...settings, sound: e.target.checked })}
            />
            Sound
          </Row>
          <Row>
            <input
              type="checkbox"
              checked={!!settings.muteFocused}
              onChange={(e) => onChange({ ...settings, muteFocused: e.target.checked })}
            />
            Mute when tab focused
          </Row>
          <Hint>{permissionHint()}</Hint>
        </Popover>
      ) : null}
    </Wrap>
  );
}
