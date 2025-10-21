import { useState } from "react";
import { X, Plus, ChevronRight, ChevronLeft, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface TemplateSection {
  id: string;
  title: string;
  required: boolean;
  enabled: boolean;
  order: number;
  level: number; // 0 = main heading, 1 = sub-heading
  label?: string;
}

interface Props {
  sections: TemplateSection[];
  onSectionsChange: (sections: TemplateSection[]) => void;
  isAdmin?: boolean;
}

export const TemplateSectionEditor = ({ sections, onSectionsChange, isAdmin = false }: Props) => {
  const [draggedItem, setDraggedItem] = useState<number | null>(null);

  const handleToggleSection = (id: string) => {
    onSectionsChange(
      sections.map((s) =>
        s.id === id && (!s.required || isAdmin) ? { ...s, enabled: !s.enabled } : s
      )
    );
  };

  const handleUpdateSection = (id: string, updates: Partial<TemplateSection>) => {
    onSectionsChange(
      sections.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const handleIndent = (id: string) => {
    onSectionsChange(
      sections.map((s) =>
        s.id === id ? { ...s, level: Math.min(s.level + 1, 1) } : s
      )
    );
  };

  const handleOutdent = (id: string) => {
    onSectionsChange(
      sections.map((s) =>
        s.id === id ? { ...s, level: Math.max(s.level - 1, 0) } : s
      )
    );
  };

  const handleAddCustomSection = () => {
    const newSection: TemplateSection = {
      id: `custom-${Date.now()}`,
      title: "New Section",
      required: false,
      enabled: true,
      order: 0,
      level: 0,
      label: "For Noting",
    };
    // Increment order of all existing sections
    const updatedSections = sections.map((s) => ({ ...s, order: s.order + 1 }));
    onSectionsChange([newSection, ...updatedSections]);
  };

  const handleRemoveSection = (id: string) => {
    onSectionsChange(sections.filter((s) => s.id !== id));
  };

  const handleDragStart = (index: number) => {
    setDraggedItem(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === index) return;

    const newSections = [...sections];
    const draggedSection = newSections[draggedItem];
    newSections.splice(draggedItem, 1);
    newSections.splice(index, 0, draggedSection);

    newSections.forEach((s, i) => (s.order = i));
    onSectionsChange(newSections);
    setDraggedItem(index);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    
    const newSections = [...sections];
    const temp = newSections[index];
    newSections[index] = newSections[index - 1];
    newSections[index - 1] = temp;
    
    // Update order property
    newSections.forEach((s, i) => (s.order = i));
    onSectionsChange(newSections);
  };

  const handleMoveDown = (index: number) => {
    if (index === sections.length - 1) return;
    
    const newSections = [...sections];
    const temp = newSections[index];
    newSections[index] = newSections[index + 1];
    newSections[index + 1] = temp;
    
    // Update order property
    newSections.forEach((s, i) => (s.order = i));
    onSectionsChange(newSections);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Template Sections</h3>
        <Button onClick={handleAddCustomSection} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Custom Section
        </Button>
      </div>

      <div className="space-y-2">
        {sections.map((section, index) => (
          <div
            key={section.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={cn(
              "flex items-center gap-2 py-1.5 px-2 rounded-md border bg-card cursor-move hover:border-primary/50 transition-colors",
              section.level === 1 && "ml-16 border-l-4 border-l-primary bg-accent/20"
            )}
          >
            <Checkbox
              checked={section.enabled}
              onCheckedChange={() => handleToggleSection(section.id)}
              disabled={section.required && !isAdmin}
            />
            
            <Input
              value={section.title}
              onChange={(e) => handleUpdateSection(section.id, { title: e.target.value })}
              className={cn(
                "flex-1 h-8",
                section.level === 0 ? "font-semibold" : "font-normal",
                section.title === "New Section" && "text-primary"
              )}
              disabled={section.required && !isAdmin}
              placeholder="Section title"
            />

            {section.required && (
              <Badge variant="secondary" className="text-xs py-0 h-5">Required</Badge>
            )}

            {section.level === 1 && (
              <Badge variant="outline" className="text-xs py-0 h-5">Sub-heading</Badge>
            )}

            <div className="grid grid-cols-3 gap-0 w-fit">
              <div className="w-7"></div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMoveUp(index);
                }}
                disabled={index === 0}
                title="Move up"
                className="h-6 w-6"
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
              <div className="w-7"></div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOutdent(section.id);
                }}
                disabled={section.level <= 0}
                title="Make main heading (outdent)"
                className="h-6 w-6"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <div className="w-7"></div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleIndent(section.id);
                }}
                disabled={section.level >= 1}
                title="Make sub-heading (indent)"
                className="h-6 w-6"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
              
              <div className="w-7"></div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMoveDown(index);
                }}
                disabled={index === sections.length - 1}
                title="Move down"
                className="h-6 w-6"
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
              <div className="w-7"></div>
            </div>

            {!section.required && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveSection(section.id)}
                className="text-destructive hover:text-destructive h-6 w-6"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
