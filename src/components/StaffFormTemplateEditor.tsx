import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, ChevronUp, ChevronDown } from "lucide-react";

export interface FormField {
  id: string;
  label: string;
  required: boolean;
  enabled: boolean;
  field_type: string;
  order: number;
  locked: boolean;
}

interface StaffFormTemplateEditorProps {
  fields: FormField[];
  onFieldsChange: (fields: FormField[]) => void;
  formType: string;
}

export const StaffFormTemplateEditor = ({ 
  fields, 
  onFieldsChange,
  formType 
}: StaffFormTemplateEditorProps) => {
  const getFormTypeLabel = () => {
    switch (formType) {
      case "board_members": return "Board Member";
      case "executive_team": return "Executive Team";
      case "key_staff": return "Key Staff";
      default: return "";
    }
  };

  const handleToggleField = (fieldId: string) => {
    const updatedFields = fields.map(field => 
      field.id === fieldId && !field.locked
        ? { ...field, enabled: !field.enabled }
        : field
    );
    onFieldsChange(updatedFields);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    
    const newFields = [...sortedFields];
    const temp = newFields[index];
    newFields[index] = newFields[index - 1];
    newFields[index - 1] = temp;
    
    // Update order property
    const reorderedFields = newFields.map((field, idx) => ({
      ...field,
      order: idx
    }));
    
    onFieldsChange(reorderedFields);
  };

  const handleMoveDown = (index: number) => {
    if (index === sortedFields.length - 1) return;
    
    const newFields = [...sortedFields];
    const temp = newFields[index];
    newFields[index] = newFields[index + 1];
    newFields[index + 1] = temp;
    
    // Update order property
    const reorderedFields = newFields.map((field, idx) => ({
      ...field,
      order: idx
    }));
    
    onFieldsChange(reorderedFields);
  };

  const sortedFields = [...fields].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      <div className="p-4 bg-muted/50 rounded-lg">
        <h3 className="font-semibold text-lg mb-1">{getFormTypeLabel()} Form</h3>
        <p className="text-sm text-muted-foreground">
          Configure which fields to include in the form. Required fields cannot be disabled.
        </p>
      </div>

      <div className="space-y-3">
        <div className="grid gap-3">
          {sortedFields.map((field, index) => (
            <div 
              key={field.id} 
              className={`flex items-center justify-between p-3 border rounded-lg ${
                field.locked ? 'bg-muted/30' : 'hover:bg-accent/50'
              } transition-colors`}
            >
              <div className="flex items-center gap-3 flex-1">
                <Checkbox
                  id={`field-${field.id}`}
                  checked={field.enabled}
                  onCheckedChange={() => handleToggleField(field.id)}
                  disabled={field.locked}
                  className={field.locked ? "cursor-not-allowed" : ""}
                />
                <Label
                  htmlFor={`field-${field.id}`}
                  className={`text-sm font-normal flex items-center gap-2 ${
                    field.locked ? 'cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  {field.label}
                  {field.locked && (
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  )}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                {field.required && (
                  <Badge variant="destructive" className="text-xs">
                    Required
                  </Badge>
                )}
                {!field.required && (
                  <Badge variant="outline" className="text-xs">
                    Optional
                  </Badge>
                )}
                <div className="flex gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === sortedFields.length - 1}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <strong>Note:</strong> Fields marked with a lock icon are required and cannot be disabled. 
          These ensure essential information is always collected.
        </p>
      </div>
    </div>
  );
};
