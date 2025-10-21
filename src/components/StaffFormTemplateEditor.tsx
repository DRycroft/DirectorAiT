import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, ChevronUp, ChevronDown, Plus } from "lucide-react";

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
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);

  const getFormTypeLabel = () => {
    switch (formType) {
      case "board_members": return "Board Member";
      case "executive_team": return "Executive Team";
      case "key_staff": return "Key Staff";
      default: return "";
    }
  };

  const handleAddField = () => {
    if (!newFieldLabel.trim()) return;

    // Generate a unique ID for the new field
    const newFieldId = `custom_${Date.now()}`;
    
    // Create the new field at the top (order 0)
    const newField: FormField = {
      id: newFieldId,
      label: newFieldLabel,
      required: newFieldRequired,
      enabled: true,
      field_type: newFieldType,
      order: 0,
      locked: false
    };

    // Update all existing fields' order by incrementing by 1
    const updatedFields = fields.map(field => ({
      ...field,
      order: field.order + 1
    }));

    // Add the new field at the beginning
    onFieldsChange([newField, ...updatedFields]);

    // Reset form and close dialog
    setNewFieldLabel("");
    setNewFieldType("text");
    setNewFieldRequired(false);
    setIsAddDialogOpen(false);
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
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-lg mb-1">{getFormTypeLabel()} Form</h3>
            <p className="text-sm text-muted-foreground">
              Configure which fields to include in the form. Required fields cannot be disabled.
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="default" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Custom Field</DialogTitle>
                <DialogDescription>
                  Create a new field for the form. It will be added at the top and you can move it to your preferred position.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="fieldLabel">Field Label *</Label>
                  <Input
                    id="fieldLabel"
                    value={newFieldLabel}
                    onChange={(e) => setNewFieldLabel(e.target.value)}
                    placeholder="e.g., Department, Salary Range"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fieldType">Field Type</Label>
                  <Select value={newFieldType} onValueChange={setNewFieldType}>
                    <SelectTrigger id="fieldType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="textarea">Text Area</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="url">URL</SelectItem>
                      <SelectItem value="select">Select</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="fieldRequired"
                    checked={newFieldRequired}
                    onCheckedChange={(checked) => setNewFieldRequired(checked as boolean)}
                  />
                  <Label htmlFor="fieldRequired" className="cursor-pointer">
                    Make this field required
                  </Label>
                </div>
                <Button onClick={handleAddField} className="w-full" disabled={!newFieldLabel.trim()}>
                  Add Field
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-2">
        <div className="grid gap-2">
          {sortedFields.map((field, index) => (
            <div 
              key={field.id} 
              className={`flex items-center justify-between py-1.5 px-2 border rounded-md ${
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
                  <Badge variant="destructive" className="text-xs py-0 h-5">
                    Required
                  </Badge>
                )}
                {!field.required && (
                  <Badge variant="outline" className="text-xs py-0 h-5">
                    Optional
                  </Badge>
                )}
                <div className="flex gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="h-6 w-6 p-0"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === sortedFields.length - 1}
                    className="h-6 w-6 p-0"
                  >
                    <ChevronDown className="h-3 w-3" />
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
