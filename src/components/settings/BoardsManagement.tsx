import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyError, logError } from "@/lib/errorHandling";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Archive, ArchiveRestore, Edit, Users } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Board {
  id: string;
  title: string;
  description: string | null;
  board_type: 'main' | 'sub_committee' | 'special_purpose';
  status: 'active' | 'archived';
  parent_board_id: string | null;
  committee_purpose: string | null;
  created_at: string;
  archived_at: string | null;
}

interface ParentBoard {
  id: string;
  title: string;
}

interface BoardWithChildren extends Board {
  children?: Board[];
}

export default function BoardsManagement() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [hierarchicalBoards, setHierarchicalBoards] = useState<BoardWithChildren[]>([]);
  const [parentBoards, setParentBoards] = useState<ParentBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    board_type: "main" as 'main' | 'sub_committee' | 'special_purpose',
    parent_board_id: "none",
    committee_purpose: "",
  });

  useEffect(() => {
    fetchBoards();
  }, [showArchived]);

  const fetchBoards = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.org_id) return;

      let query = supabase
        .from("boards")
        .select("*")
        .eq("org_id", profile.org_id)
        .order("created_at", { ascending: false });

      if (!showArchived) {
        query = query.eq("status", "active");
      }

      const { data, error } = await query;

      if (error) throw error;
      
      const boardsList = (data || []) as Board[];
      setBoards(boardsList);

      // Build hierarchical structure
      const parentBoardsList = boardsList.filter(b => !b.parent_board_id);
      const childBoards = boardsList.filter(b => b.parent_board_id);
      
      const hierarchical: BoardWithChildren[] = parentBoardsList.map(parent => ({
        ...parent,
        children: childBoards.filter(child => child.parent_board_id === parent.id)
      }));

      setHierarchicalBoards(hierarchical);

      // Fetch all active boards for parent dropdown (not just main boards)
      const { data: activeBoards } = await supabase
        .from("boards")
        .select("id, title")
        .eq("org_id", profile.org_id)
        .eq("status", "active")
        .order("title");

      setParentBoards(activeBoards || []);
    } catch (error: any) {
      console.error("Error fetching boards:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Error",
          description: "You must be signed in to create boards",
          variant: "destructive",
        });
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .single();

      if (profileError) {
        logError("BoardsManagement.handleSubmit", profileError);
        toast({
          title: "Error",
          description: getUserFriendlyError(profileError),
          variant: "destructive",
        });
        return;
      }

      if (!profile?.org_id) {
        toast({
          title: "Organization Required",
          description: "You must be part of an organization to create boards. Please contact your administrator.",
          variant: "destructive",
        });
        return;
      }

      const boardData = {
        title: formData.title,
        description: formData.description || null,
        board_type: formData.board_type,
        parent_board_id: formData.parent_board_id === "none" ? null : formData.parent_board_id,
        committee_purpose: formData.committee_purpose || null,
        org_id: profile.org_id,
      };

      if (editingBoard) {
        const { error } = await supabase
          .from("boards")
          .update(boardData)
          .eq("id", editingBoard.id);

        if (error) {
          logError("BoardsManagement.updateBoard", error);
          throw error;
        }

        toast({
          title: "Success",
          description: "Board updated successfully",
        });
      } else {
        const { data: newBoard, error } = await supabase
          .from("boards")
          .insert(boardData)
          .select()
          .single();

        if (error) {
          logError("BoardsManagement.createBoard", error);
          throw error;
        }

        toast({
          title: "Success",
          description: "Board created successfully",
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchBoards();
    } catch (error: any) {
      logError("BoardsManagement.handleSubmit", error);
      toast({
        title: "Error",
        description: getUserFriendlyError(error),
        variant: "destructive",
      });
    }
  };

  const handleArchive = async () => {
    if (!selectedBoard) return;

    try {
      const { error } = await supabase
        .from("boards")
        .update({ 
          status: selectedBoard.status === 'active' ? 'archived' : 'active',
          archived_at: selectedBoard.status === 'active' ? new Date().toISOString() : null
        })
        .eq("id", selectedBoard.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: selectedBoard.status === 'active' ? "Board archived successfully" : "Board restored successfully",
      });

      setArchiveDialogOpen(false);
      setSelectedBoard(null);
      fetchBoards();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      board_type: "main",
      parent_board_id: "none",
      committee_purpose: "",
    });
    setEditingBoard(null);
  };

  const openEditDialog = (board: Board) => {
    setEditingBoard(board);
    setFormData({
      title: board.title,
      description: board.description || "",
      board_type: board.board_type,
      parent_board_id: board.parent_board_id || "none",
      committee_purpose: board.committee_purpose || "",
    });
    setDialogOpen(true);
  };

  const getBoardTypeLabel = (type: string) => {
    switch (type) {
      case 'main': return 'Main Board';
      case 'sub_committee': return 'Sub-Committee';
      case 'special_purpose': return 'Special Purpose';
      default: return type;
    }
  };

  const getParentBoardTitle = (parentId: string | null) => {
    if (!parentId) return '-';
    const parent = parentBoards.find(b => b.id === parentId);
    return parent?.title || 'Unknown';
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Boards & Committees Management</CardTitle>
            <CardDescription>
              Manage main boards, sub-committees (H&S, R&A), and special purpose committees
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowArchived(!showArchived)}
            >
              {showArchived ? "Show Active" : "Show Archived"}
            </Button>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Board/Committee
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingBoard ? "Edit Board/Committee" : "Create New Board/Committee"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="board_type">Type</Label>
                    <Select
                      value={formData.board_type}
                      onValueChange={(value: any) => 
                        setFormData({ ...formData, board_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="main">Main Board</SelectItem>
                        <SelectItem value="sub_committee">Sub-Committee (H&S, R&A, etc.)</SelectItem>
                        <SelectItem value="special_purpose">Special Purpose Committee</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="parent_board_id">
                      Parent Board/Entity <span className="text-muted-foreground">(Optional)</span>
                    </Label>
                    <Select
                      value={formData.parent_board_id}
                      onValueChange={(value) => 
                        setFormData({ ...formData, parent_board_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="None - Create as standalone entity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None - Create as standalone entity</SelectItem>
                        {parentBoards
                          .filter(b => !editingBoard || b.id !== editingBoard.id)
                          .map((board) => (
                            <SelectItem key={board.id} value={board.id}>
                              {board.title}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Select a parent to create a sub-entity, or leave empty for a standalone board
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => 
                        setFormData({ ...formData, title: e.target.value })
                      }
                      placeholder="e.g., Health & Safety Committee"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => 
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Brief description of the board/committee"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="committee_purpose">Purpose/Mandate</Label>
                    <Textarea
                      id="committee_purpose"
                      value={formData.committee_purpose}
                      onChange={(e) => 
                        setFormData({ ...formData, committee_purpose: e.target.value })
                      }
                      placeholder="Specific purpose or mandate for this committee"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDialogOpen(false);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingBoard ? "Update" : "Create"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Board/Committee</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {boards.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No boards found. Create your first board or committee.
                </TableCell>
              </TableRow>
            ) : (
              hierarchicalBoards.map((parentBoard) => (
                <>
                  {/* Parent Board Row */}
                  <TableRow key={parentBoard.id} className="bg-muted/30">
                    <TableCell className="font-semibold">
                      {parentBoard.title}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">
                        {getBoardTypeLabel(parentBoard.board_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={parentBoard.status === 'active' ? 'default' : 'secondary'}>
                        {parentBoard.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(parentBoard.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(parentBoard)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedBoard(parentBoard);
                            setArchiveDialogOpen(true);
                          }}
                        >
                          {parentBoard.status === 'active' ? (
                            <Archive className="h-4 w-4" />
                          ) : (
                            <ArchiveRestore className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  
                  {/* Child Boards Rows */}
                  {parentBoard.children && parentBoard.children.map((childBoard) => (
                    <TableRow key={childBoard.id} className="border-l-4 border-l-primary/20">
                      <TableCell className="pl-12 text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">└─</span>
                          <span>{childBoard.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getBoardTypeLabel(childBoard.board_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={childBoard.status === 'active' ? 'default' : 'secondary'}>
                          {childBoard.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(childBoard.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(childBoard)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedBoard(childBoard);
                              setArchiveDialogOpen(true);
                            }}
                          >
                            {childBoard.status === 'active' ? (
                              <Archive className="h-4 w-4" />
                            ) : (
                              <ArchiveRestore className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedBoard?.status === 'active' ? 'Archive' : 'Restore'} Board?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedBoard?.status === 'active' 
                ? 'This will archive the board. You can restore it later from the archived view.'
                : 'This will restore the board to active status.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>
              {selectedBoard?.status === 'active' ? 'Archive' : 'Restore'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
