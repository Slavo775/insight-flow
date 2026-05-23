import { execFile } from "node:child_process";
import type { TaskflowConfig, ParsedArgs } from "../types.js";

export function cmdNotify(config: TaskflowConfig, opts: ParsedArgs): void {
  if (config.notifications?.cli === false) {
    process.exit(0);
  }

  const message = (opts._[0] as string | undefined) ?? "";
  const title = (opts.title as string | undefined) ?? config.projectName ?? "insight-flow";
  const project = (opts.project as string | undefined) ?? config.projectName ?? "";

  const notifTitle = project ? `${project}: ${title}` : title;

  fireNotification(notifTitle, message);
}

function fireNotification(title: string, message: string): void {
  const platform = process.platform;
  try {
    if (platform === "darwin") {
      const script =
        `display notification ${JSON.stringify(message)} with title ${JSON.stringify(title)}`;
      const child = execFile("osascript", ["-e", script]);
      child.unref();
    } else if (platform === "linux") {
      const child = execFile("notify-send", [title, message]);
      child.unref();
    } else if (platform === "win32") {
      const ps =
        `[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType=WindowsRuntime] | Out-Null; ` +
        `$t = [Windows.UI.Notifications.ToastTemplateType]::ToastText02; ` +
        `$x = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent($t); ` +
        `$x.GetElementsByTagName('text')[0].AppendChild($x.CreateTextNode(${JSON.stringify(title)})) | Out-Null; ` +
        `$x.GetElementsByTagName('text')[1].AppendChild($x.CreateTextNode(${JSON.stringify(message)})) | Out-Null; ` +
        `$n = [Windows.UI.Notifications.ToastNotification]::new($x); ` +
        `[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('insight-flow').Show($n)`;
      const child = execFile("powershell", ["-NoProfile", "-Command", ps]);
      child.unref();
    }
  } catch {
    // fire-and-forget: swallow all errors
  }
}
