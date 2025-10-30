import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyError, logError } from "@/lib/errorHandling";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Archive, ArchiveRestore, Edit, Users, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import CommitteeMembersDialog from "./CommitteeMembersDialog";

interface Board {
  id: string;
  title: string;
  description: string | null;
  board_type: 'main' | 'sub_committee' | 'special_purpose';
  status: 'active' | 'pending' | 'archived';
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

const boardSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().trim().max(2000, "Description must be less than 2000 characters").optional().or(z.literal("")),
  board_type: z.enum(['main', 'sub_committee', 'special_purpose']),
  committee_purpose: z.string().trim().max(2000, "Purpose must be less than 2000 characters").optional().or(z.literal("")),
});

export default function BoardsManagement() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [hierarchicalBoards, setHierarchicalBoards] = useState<BoardWithChildren[]>([]);
  const [parentBoards, setParentBoards] = useState<ParentBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [selectedCommittee, setSelectedCommittee] = useState<Board | null>(null);
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
      logError("BoardsManagement.fetchBoards", error);
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

      // Auto-create organization if user doesn't have one
      let orgId = profile?.org_id;
      
      if (!orgId) {
        // Create organization using user's name or email
        const { data: userData } = await supabase.auth.getUser();
        const userName = userData.user?.user_metadata?.name || userData.user?.email?.split('@')[0] || 'My Organization';
        
        const { data: newOrg, error: orgError } = await supabase
          .from("organizations")
          .insert({
            name: `${userName}'s Organization`,
          })
          .select()
          .single();

        if (orgError) {
          logError("BoardsManagement.createOrganization", orgError);
          toast({
            title: "Error",
            description: "Failed to create organization. Please try again.",
            variant: "destructive",
          });
          return;
        }

        // Update user's profile with new org_id
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ org_id: newOrg.id })
          .eq("id", user.id);

        if (updateError) {
          logError("BoardsManagement.updateProfile", updateError);
          toast({
            title: "Error",
            description: "Failed to update profile. Please try again.",
            variant: "destructive",
          });
          return;
        }

        orgId = newOrg.id;

        toast({
          title: "Organization Created",
          description: "Your organization has been set up successfully.",
        });
      }

      // Validate input
      try {
        boardSchema.parse({
          title: formData.title,
          description: formData.description,
          board_type: formData.board_type,
          committee_purpose: formData.committee_purpose,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          toast({
            title: "Validation Error",
            description: error.errors[0].message,
            variant: "destructive",
          });
          return;
        }
      }

      const boardData = {
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        board_type: formData.board_type,
        parent_board_id: formData.parent_board_id === "none" ? null : formData.parent_board_id,
        committee_purpose: formData.committee_purpose?.trim() || null,
        org_id: orgId,
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

  const handleStatusChange = async (board: Board, newStatus: 'active' | 'pending' | 'archived') => {
    try {
      const { error } = await supabase
        .from("boards")
        .update({ 
          status: newStatus,
          archived_at: newStatus === 'archived' ? new Date().toISOString() : null
        })
        .eq("id", board.id);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Board status changed to ${newStatus}.`,
      });
      
      fetchBoards();
    } catch (error: any) {
      logError("BoardsManagement.handleStatusChange", error);
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

  const handleDelete = async () => {
    if (!selectedBoard) return;

    try {
      // Check if board has any associated data (members, papers, etc.)
      const { count: memberCount } = await supabase
        .from("board_memberships")
        .select("*", { count: 'exact', head: true })
        .eq("board_id", selectedBoard.id);

      const { count: paperCount } = await supabase
        .from("board_papers")
        .select("*", { count: 'exact', head: true })
        .eq("board_id", selectedBoard.id);

      if (memberCount && memberCount > 0) {
        toast({
          title: "Cannot Delete",
          description: "This board has members. Please remove all members before deleting, or archive the board instead.",
          variant: "destructive",
        });
        setDeleteDialogOpen(false);
        return;
      }

      if (paperCount && paperCount > 0) {
        toast({
          title: "Cannot Delete",
          description: "This board has board papers or reports. Please archive the board instead of deleting it.",
          variant: "destructive",
        });
        setDeleteDialogOpen(false);
        return;
      }

      // Check if board has children
      const { count: childCount } = await supabase
        .from("boards")
        .select("*", { count: 'exact', head: true })
        .eq("parent_board_id", selectedBoard.id);

      if (childCount && childCount > 0) {
        toast({
          title: "Cannot Delete",
          description: "This board has sub-committees. Please delete or reassign them first.",
          variant: "destructive",
        });
        setDeleteDialogOpen(false);
        return;
      }

      // If no associated data, delete the board
      const { error } = await supabase
        .from("boards")
        .delete()
        .eq("id", selectedBoard.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Board deleted successfully",
      });

      setDeleteDialogOpen(false);
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
                      <Badge variant={
                        parentBoard.status === 'active' ? 'default' : 
                        parentBoard.status === 'pending' ? 'secondary' : 
                        'outline'
                      }>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedBoard(parentBoard);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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
                         <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                             <Button 
                               variant="ghost" 
                               size="sm"
                               className="h-auto p-0 hover:bg-transparent"
                             >
                               <Badge 
                                 variant={
                                   childBoard.status === 'active' ? 'default' : 
                                   childBoard.status === 'pending' ? 'secondary' : 
                                   'outline'
                                 }
                                 className="cursor-pointer hover:opacity-80"
                               >
                                 {childBoard.status}
                               </Badge>
                             </Button>
                           </DropdownMenuTrigger>
                           <DropdownMenuContent align="start">
                             <DropdownMenuItem onClick={() => handleStatusChange(childBoard, 'active')}>
                               Active
                             </DropdownMenuItem>
                             <DropdownMenuItem onClick={() => handleStatusChange(childBoard, 'pending')}>
                               Pending
                             </DropdownMenuItem>
                             <DropdownMenuItem onClick={() => handleStatusChange(childBoard, 'archived')}>
                               Archived
                             </DropdownMenuItem>
                           </DropdownMenuContent>
                         </DropdownMenu>
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedCommittee(childBoard);
                              setMembersDialogOpen(true);
                            }}
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedBoard(childBoard);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Board/Committee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedBoard?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedCommittee && (
        <CommitteeMembersDialog
          open={membersDialogOpen}
          onOpenChange={setMembersDialogOpen}
          committeeId={selectedCommittee.id}
          committeeName={selectedCommittee.title}
        />
      )}
    </Card>
  );
}
