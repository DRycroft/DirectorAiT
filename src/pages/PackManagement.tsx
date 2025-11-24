/**
 * Pack Management Page
 * 
 * Central hub for creating and managing board packs from templates
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, FileText, Calendar, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useBoardPacks } from '@/hooks/useBoardPacks';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PackTemplateBuilder } from '@/components/PackTemplateBuilder';

export default function PackManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [boardId, setBoardId] = useState<string>('');
  const [boards, setBoards] = useState<any[]>([]);
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
  const [showCreatePack, setShowCreatePack] = useState(false);
  const [newPackTitle, setNewPackTitle] = useState('');
  const [newPackDate, setNewPackDate] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  const { templates, packs, isLoadingTemplates, isLoadingPacks, createPackFromTemplate, isCreatingPack } = useBoardPacks(boardId);

  useEffect(() => {
    loadBoards();
  }, []);

  const loadBoards = async () => {
    const { data, error } = await supabase
      .from('boards')
      .select('id, title')
      .eq('board_type', 'main')
      .order('title');

    if (!error && data) {
      setBoards(data);
      if (data.length > 0) {
        setBoardId(data[0].id);
      }
    }
  };

  const handleCreatePack = () => {
    if (!newPackTitle.trim() || !newPackDate || !selectedTemplateId) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all fields to create a pack.',
        variant: 'destructive',
      });
      return;
    }

    createPackFromTemplate({
      board_id: boardId,
      template_id: selectedTemplateId,
      meeting_date: newPackDate,
      title: newPackTitle,
    });

    setShowCreatePack(false);
    setNewPackTitle('');
    setNewPackDate('');
    setSelectedTemplateId('');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-warning" />;
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const viewPackSections = async (packId: string) => {
    navigate(`/pack/${packId}/sections`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Board Pack Management</h1>
          <p className="text-muted-foreground">
            Create templates and manage board packs for meetings
          </p>
        </div>

        {boards.length > 0 && (
          <div className="mb-6">
            <Label>Select Board</Label>
            <Select value={boardId} onValueChange={setBoardId}>
              <SelectTrigger className="w-full max-w-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {boards.map((board) => (
                  <SelectItem key={board.id} value={board.id}>
                    {board.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Templates Section */}
        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-1">Templates</h2>
              <p className="text-muted-foreground">
                Reusable templates for board packs
              </p>
            </div>
            <Button onClick={() => setShowTemplateBuilder(!showTemplateBuilder)}>
              <Plus className="h-4 w-4 mr-2" />
              {showTemplateBuilder ? 'Hide' : 'Create'} Template
            </Button>
          </div>

          {showTemplateBuilder && boardId && (
            <div className="mb-6">
              <PackTemplateBuilder
                boardId={boardId}
                onTemplateSaved={() => setShowTemplateBuilder(false)}
              />
            </div>
          )}

          {isLoadingTemplates ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No templates yet. Create your first template above.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <Card key={template.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">{template.name}</h3>
                  {template.description && (
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </Card>

        {/* Packs Section */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-1">Board Packs</h2>
              <p className="text-muted-foreground">
                Meeting packs created from templates
              </p>
            </div>
            <Dialog open={showCreatePack} onOpenChange={setShowCreatePack}>
              <DialogTrigger asChild>
                <Button disabled={templates.length === 0}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Pack
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Board Pack</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label htmlFor="packTitle">Pack Title</Label>
                    <Input
                      id="packTitle"
                      value={newPackTitle}
                      onChange={(e) => setNewPackTitle(e.target.value)}
                      placeholder="e.g., January 2024 Board Meeting"
                    />
                  </div>
                  <div>
                    <Label htmlFor="meetingDate">Meeting Date</Label>
                    <Input
                      id="meetingDate"
                      type="date"
                      value={newPackDate}
                      onChange={(e) => setNewPackDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="template">Template</Label>
                    <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setShowCreatePack(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreatePack} disabled={isCreatingPack}>
                      {isCreatingPack ? 'Creating...' : 'Create Pack'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {isLoadingPacks ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : packs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No packs yet. Create a pack from a template above.
            </div>
          ) : (
            <div className="grid gap-4">
              {packs.map((pack) => (
                <Card
                  key={pack.id}
                  className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => viewPackSections(pack.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(pack.status)}
                      <div>
                        <h3 className="font-semibold">{pack.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(pack.meeting_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm capitalize px-3 py-1 rounded-full bg-muted">
                      {pack.status}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
