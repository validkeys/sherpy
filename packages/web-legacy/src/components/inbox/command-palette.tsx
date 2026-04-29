/**
 * Command Palette - Quick project search with Ctrl/Cmd+K
 */

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useEffect, useState } from "react";
import { PipelineStatusBadge } from "./pipeline-status-badge";

interface Project {
  id: string;
  name: string;
  pipelineStatus: string;
}

interface CommandPaletteProps {
  projects: Project[];
  onSelectProject: (projectId: string) => void;
}

export function CommandPalette({ projects, onSelectProject }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);

  // Toggle command palette with Ctrl/Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelect = (projectId: string) => {
    setOpen(false);
    onSelectProject(projectId);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search projects..." />
      <CommandList>
        <CommandEmpty>No projects found.</CommandEmpty>
        <CommandGroup heading="Projects">
          {projects.slice(0, 10).map((project) => (
            <CommandItem
              key={project.id}
              onSelect={() => handleSelect(project.id)}
              className="flex items-center justify-between"
            >
              <span>{project.name}</span>
              <PipelineStatusBadge status={project.pipelineStatus} size="sm" />
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
