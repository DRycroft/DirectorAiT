import { Link } from "react-router-dom";
import { Settings, ArrowRight } from "lucide-react";
import { SectionShell } from "./SectionShell";

export const SettingsSection = () => {
  return (
    <SectionShell value="settings" icon={Settings} title="Settings">
      <Link
        to="/settings"
        className="flex items-center justify-between gap-3 p-3 rounded-md border border-border hover:bg-muted/50 transition-colors"
      >
        <span className="text-sm">Open settings</span>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </Link>
    </SectionShell>
  );
};
