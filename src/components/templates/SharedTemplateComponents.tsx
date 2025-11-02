
/**
 * Shared Template Components
 * 
 * Reusable components for template management to reduce duplication
 * across BoardPaperTemplateBuilder, TemplatePicker, and TemplateSectionEditor.
 */

import React, { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Plus, Trash2, GripVertical, Edit } from 'lucide-react';
import type { Template, TemplateSection } from '@/hooks/useTemplateManagement';

/**
 * Template Card Component
 * Displays a template in a card format with actions
 */
export const TemplateCard = memo(({
  template,
  onSelect,
  onEdit,
  onDelete,
  isSelected = false,
}: {
  template: Template;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isSelected?: boolean;
}) => {
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={onSelect}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">{template.name}</CardTitle>
              <CardDescription className="text-sm mt-1">
                {template.description || 'No description'}
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary">v{template.version}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Type:</span>
            <Badge variant="outline">{template.template_type}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Sections:</span>
            <span className="font-medium">{template.sections?.length || 0}</span>
          </div>
          {(onEdit || onDelete) && (
            <div className="flex gap-2 mt-4">
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="flex-1"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

TemplateCard.displayName = 'TemplateCard';

/**
 * Template Section Item Component
 * Displays a single template section with drag handle and actions
 */
export const TemplateSectionItem = memo(({
  section,
  index,
  onEdit,
  onDelete,
  onMove,
  isDragging = false,
}: {
  section: TemplateSection;
  index: number;
  onEdit?: () => void;
  onDelete?: () => void;
  onMove?: (direction: 'up' | 'down') => void;
  isDragging?: boolean;
}) => {
  return (
    <div
      className={`flex items-center gap-3 p-3 border rounded-lg bg-card ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{section.section_name}</span>
          {section.is_required && (
            <Badge variant="secondary" className="text-xs">
              Required
            </Badge>
          )}
        </div>
        {section.default_content && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
            {section.default_content}
          </p>
        )}
      </div>
      <div className="flex gap-1">
        {onMove && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMove('up')}
              disabled={index === 0}
            >
              ↑
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMove('down')}
            >
              ↓
            </Button>
          </>
        )}
        {onEdit && (
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4" />
          </Button>
        )}
        {onDelete && (
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>
    </div>
  );
});

TemplateSectionItem.displayName = 'TemplateSectionItem';

/**
 * Template Form Fields Component
 * Common form fields for creating/editing templates
 */
export const TemplateFormFields = memo(({
  name,
  description,
  templateType,
  onNameChange,
  onDescriptionChange,
  onTemplateTypeChange,
  templateTypes,
}: {
  name: string;
  description: string;
  templateType: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onTemplateTypeChange: (value: string) => void;
  templateTypes: Record<string, string>;
}) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="template-name">Template Name *</Label>
        <Input
          id="template-name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="e.g., Monthly Board Report"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="template-description">Description</Label>
        <Textarea
          id="template-description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Brief description of this template..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="template-type">Template Type *</Label>
        <Select value={templateType} onValueChange={onTemplateTypeChange}>
          <SelectTrigger id="template-type">
            <SelectValue placeholder="Select template type" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(templateTypes).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
});

TemplateFormFields.displayName = 'TemplateFormFields';

/**
 * Section Form Component
 * Form for adding/editing a template section
 */
export const SectionForm = memo(({
  sectionName,
  defaultContent,
  isRequired,
  onSectionNameChange,
  onDefaultContentChange,
  onIsRequiredChange,
  onSubmit,
  onCancel,
  submitLabel = 'Add Section',
}: {
  sectionName: string;
  defaultContent: string;
  isRequired: boolean;
  onSectionNameChange: (value: string) => void;
  onDefaultContentChange: (value: string) => void;
  onIsRequiredChange: (value: boolean) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  submitLabel?: string;
}) => {
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
      <div className="space-y-2">
        <Label htmlFor="section-name">Section Name *</Label>
        <Input
          id="section-name"
          value={sectionName}
          onChange={(e) => onSectionNameChange(e.target.value)}
          placeholder="e.g., Executive Summary"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="default-content">Default Content</Label>
        <Textarea
          id="default-content"
          value={defaultContent}
          onChange={(e) => onDefaultContentChange(e.target.value)}
          placeholder="Optional default content for this section..."
          rows={4}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is-required"
          checked={isRequired}
          onChange={(e) => onIsRequiredChange(e.target.checked)}
          className="h-4 w-4"
        />
        <Label htmlFor="is-required" className="cursor-pointer">
          This section is required
        </Label>
      </div>

      <div className="flex gap-2">
        <Button onClick={onSubmit} disabled={!sectionName.trim()}>
          <Plus className="h-4 w-4 mr-1" />
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
});

SectionForm.displayName = 'SectionForm';

/**
 * Empty State Component
 * Displays when no templates are available
 */
export const TemplateEmptyState = memo(({
  title = 'No templates found',
  description = 'Create your first template to get started',
  actionLabel = 'Create Template',
  onAction,
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md">{description}</p>
      {onAction && (
        <Button onClick={onAction}>
          <Plus className="h-4 w-4 mr-2" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
});

TemplateEmptyState.displayName = 'TemplateEmptyState';
