/**
 * Pack Template Builder Component
 * 
 * Replaces BoardPaperTemplateBuilder with database persistence
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useBoardPacks } from '@/hooks/useBoardPacks';
import { GripVertical, Save, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Section {
  id?: string;
  title: string;
  order_index: number;
  is_required: boolean;
  is_enabled: boolean;
}

const defaultSections: Section[] = [
  { title: 'Cover Page', order_index: 0, is_required: true, is_enabled: true },
  { title: 'Declaration', order_index: 1, is_required: true, is_enabled: true },
  { title: 'Table of Contents', order_index: 2, is_required: true, is_enabled: true },
  { title: 'Board Chair Report', order_index: 3, is_required: false, is_enabled: true },
  { title: 'CEO Report', order_index: 4, is_required: false, is_enabled: true },
  { title: 'CFO Report', order_index: 5, is_required: false, is_enabled: true },
  { title: 'Operations Manager Report', order_index: 6, is_required: false, is_enabled: true },
  { title: 'Health & Safety Report', order_index: 7, is_required: false, is_enabled: true },
  { title: 'Compliance Report', order_index: 8, is_required: false, is_enabled: true },
];

interface PackTemplateBuilderProps {
  boardId: string;
  onTemplateSaved?: (templateId: string) => void;
}

export function PackTemplateBuilder({ boardId, onTemplateSaved }: PackTemplateBuilderProps) {
  const { toast } = useToast();
  const { createTemplate, isCreatingTemplate } = useBoardPacks(boardId);
  
  const [templateName, setTemplateName] = useState('Default Board Pack Template');
  const [description, setDescription] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [sections, setSections] = useState<Section[]>(defaultSections);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);

  const handleToggleSection = (index: number) => {
    const section = sections[index];
    if (section.is_required) {
      toast({
        title: 'Cannot disable',
        description: 'This section is required and cannot be disabled.',
        variant: 'destructive',
      });
      return;
    }
    
    setSections(prev => prev.map((s, i) => 
      i === index ? { ...s, is_enabled: !s.is_enabled } : s
    ));
  };

  const handleAddSection = () => {
    const newSection: Section = {
      title: 'New Section',
      order_index: sections.length,
      is_required: false,
      is_enabled: true,
    };
    setSections([...sections, newSection]);
  };

  const handleRemoveSection = (index: number) => {
    const section = sections[index];
    if (section.is_required) {
      toast({
        title: 'Cannot remove',
        description: 'This section is required and cannot be removed.',
        variant: 'destructive',
      });
      return;
    }
    setSections(prev => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, order_index: i })));
  };

  const handleUpdateTitle = (index: number, title: string) => {
    setSections(prev => prev.map((s, i) => i === index ? { ...s, title } : s));
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
    
    // Update order_index
    const reorderedSections = newSections.map((s, i) => ({ ...s, order_index: i }));
    setSections(reorderedSections);
    setDraggedItem(index);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast({
        title: 'Template name required',
        description: 'Please enter a name for your template.',
        variant: 'destructive',
      });
      return;
    }

    createTemplate({
      board_id: boardId,
      name: templateName,
      description: description || undefined,
      company_name: companyName || undefined,
      logo_url: logoUrl || undefined,
      sections: sections.map(({ id, ...rest }) => rest),
    });

    if (onTemplateSaved) {
      // Will be called after successful mutation
      setTimeout(() => {
        // You could pass the actual ID here if needed
        onTemplateSaved('template-saved');
      }, 1000);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="templateName">Template Name</Label>
            <Input
              id="templateName"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g., Monthly Board Pack"
            />
          </div>
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this template..."
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="companyName">Company Name (Optional)</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g., Acme Corporation"
            />
          </div>
          <div>
            <Label htmlFor="logoUrl">Logo URL (Optional)</Label>
            <Input
              id="logoUrl"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Template Sections</h3>
          <Button onClick={handleAddSection} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Section
          </Button>
        </div>

        <div className="space-y-2">
          {sections.map((section, index) => (
            <div
              key={index}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 p-3 bg-card border rounded-lg transition-all ${
                draggedItem === index ? 'opacity-50' : ''
              }`}
            >
              <GripVertical className="h-5 w-5 text-muted-foreground cursor-move flex-shrink-0" />
              
              <Input
                value={section.title}
                onChange={(e) => handleUpdateTitle(index, e.target.value)}
                className="flex-1"
                disabled={section.is_required}
              />
              
              <div className="flex items-center gap-2 flex-shrink-0">
                {section.is_required && (
                  <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                    Required
                  </span>
                )}
                <Switch
                  checked={section.is_enabled}
                  onCheckedChange={() => handleToggleSection(index)}
                  disabled={section.is_required}
                />
                {!section.is_required && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveSection(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          onClick={handleSaveTemplate}
          disabled={isCreatingTemplate}
          size="lg"
        >
          <Save className="h-4 w-4 mr-2" />
          {isCreatingTemplate ? 'Saving...' : 'Save Template'}
        </Button>
      </div>
    </div>
  );
}
