import { useState } from "react";
import { GripVertical, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface TemplateSection {
  id: string;
  title: string;
  placeholder?: string;
  label?: string;
  required: boolean;
  enabled: boolean;
  order: number;
  page_break_after?: boolean;
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

  const handleAddCustomSection = () => {
    const newSection: TemplateSection = {
      id: `custom-${Date.now()}`,
      title: "New Section",
      placeholder: "Enter content here...",
      label: "For Discussion",
      required: false,
      enabled: true,
      order: sections.length,
      page_break_after: false,
    };
    onSectionsChange([...sections, newSection]);
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
            className="border border-border rounded-lg p-4 bg-card hover:bg-accent/5 transition-colors"
          >
            <div className="flex items-start gap-3">
              <GripVertical className="h-5 w-5 text-muted-foreground cursor-move mt-1" />
              
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={section.enabled}
                    onCheckedChange={() => handleToggleSection(section.id)}
                    disabled={section.required && !isAdmin}
                  />
                  <Input
                    value={section.title}
                    onChange={(e) => handleUpdateSection(section.id, { title: e.target.value })}
                    className="flex-1"
                    placeholder="Section title"
                  />
                  {section.required && (
                    <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                      Required
                    </span>
                  )}
                  {!section.required && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveSection(section.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {section.enabled && (
                  <>
                    <Textarea
                      value={section.placeholder || ""}
                      onChange={(e) =>
                        handleUpdateSection(section.id, { placeholder: e.target.value })
                      }
                      placeholder="Placeholder text"
                      className="resize-none"
                      rows={2}
                    />
                    
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">Label</Label>
                        <Select
                          value={section.label || "For Discussion"}
                          onValueChange={(value) =>
                            handleUpdateSection(section.id, { label: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="For Decision">For Decision</SelectItem>
                            <SelectItem value="For Discussion">For Discussion</SelectItem>
                            <SelectItem value="For Noting">For Noting</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={section.page_break_after || false}
                          onCheckedChange={(checked) =>
                            handleUpdateSection(section.id, { page_break_after: checked === true })
                          }
                        />
                        <Label className="text-sm">Page break after</Label>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
