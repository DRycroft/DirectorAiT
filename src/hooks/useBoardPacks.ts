/**
 * Board Packs Management Hook
 * 
 * Manages board packs, templates, and sections for the Board Papers MVP workflow
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BoardTemplate {
  id: string;
  board_id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateSection {
  id: string;
  template_id: string;
  title: string;
  order_index: number;
  is_required: boolean;
  is_enabled: boolean;
}

export interface BoardPack {
  id: string;
  board_id: string;
  template_id?: string;
  meeting_date: string;
  title: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PackSection {
  id: string;
  pack_id: string;
  title: string;
  order_index: number;
  status: string;
  document_id?: string;
}

export interface SectionDocument {
  id: string;
  section_id: string;
  content: any;
  version_number: number;
  created_by: string;
  created_at: string;
}

export function useBoardPacks(boardId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  /**
   * Fetch templates for a board
   */
  const {
    data: templates,
    isLoading: isLoadingTemplates,
  } = useQuery({
    queryKey: ['board-templates', boardId],
    queryFn: async () => {
      if (!boardId) return [];
      const { data, error } = await supabase
        .from('board_templates')
        .select('*')
        .eq('board_id', boardId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as BoardTemplate[];
    },
    enabled: !!boardId,
  });

  /**
   * Fetch template sections
   */
  const fetchTemplateSections = useCallback(async (templateId: string) => {
    const { data, error } = await supabase
      .from('template_sections')
      .select('*')
      .eq('template_id', templateId)
      .order('order_index');
    
    if (error) throw error;
    return data as TemplateSection[];
  }, []);

  /**
   * Create a new template
   */
  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: {
      board_id: string;
      name: string;
      description?: string;
      company_name?: string;
      logo_url?: string;
      sections: Omit<TemplateSection, 'id' | 'template_id'>[];
    }) => {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Not authenticated');

      // Create template
      const { data: template, error: templateError } = await supabase
        .from('board_templates')
        .insert({
          board_id: templateData.board_id,
          name: templateData.name,
          description: templateData.description,
          company_name: templateData.company_name,
          logo_url: templateData.logo_url,
          created_by: user.data.user.id,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Create sections
      if (templateData.sections.length > 0) {
        const sectionsToInsert = templateData.sections.map((section, index) => ({
          template_id: template.id,
          title: section.title,
          order_index: section.order_index ?? index,
          is_required: section.is_required,
          is_enabled: section.is_enabled,
        }));

        const { error: sectionsError } = await supabase
          .from('template_sections')
          .insert(sectionsToInsert);

        if (sectionsError) throw sectionsError;
      }

      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-templates', boardId] });
      toast({
        title: 'Template created',
        description: 'Your board template has been saved successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating template',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  /**
   * Create a board pack from a template
   */
  const createPackFromTemplateMutation = useMutation({
    mutationFn: async (packData: {
      board_id: string;
      template_id: string;
      meeting_date: string;
      title: string;
    }) => {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Not authenticated');

      // Create pack
      const { data: pack, error: packError } = await supabase
        .from('board_packs')
        .insert({
          board_id: packData.board_id,
          template_id: packData.template_id,
          meeting_date: packData.meeting_date,
          title: packData.title,
          status: 'draft',
          created_by: user.data.user.id,
        })
        .select()
        .single();

      if (packError) throw packError;

      // Fetch template sections
      const sections = await fetchTemplateSections(packData.template_id);

      // Clone sections into pack_sections
      if (sections.length > 0) {
        const packSectionsToInsert = sections
          .filter(s => s.is_enabled)
          .map(section => ({
            pack_id: pack.id,
            title: section.title,
            order_index: section.order_index,
            status: 'pending',
          }));

        const { error: sectionsError } = await supabase
          .from('pack_sections')
          .insert(packSectionsToInsert);

        if (sectionsError) throw sectionsError;
      }

      return pack;
    },
    onSuccess: () => {
      if (boardId) {
        queryClient.invalidateQueries({ queryKey: ['board-packs', boardId] });
      }
      toast({
        title: 'Pack created',
        description: 'Board pack created from template successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating pack',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  /**
   * Fetch packs for a board
   */
  const {
    data: packs,
    isLoading: isLoadingPacks,
  } = useQuery({
    queryKey: ['board-packs', boardId],
    queryFn: async () => {
      if (!boardId) return [];
      const { data, error } = await supabase
        .from('board_packs')
        .select('*')
        .eq('board_id', boardId)
        .order('meeting_date', { ascending: false });
      
      if (error) throw error;
      return data as BoardPack[];
    },
    enabled: !!boardId,
  });

  /**
   * Fetch pack sections with documents
   */
  const fetchPackSections = useCallback(async (packId: string) => {
    const { data, error } = await supabase
      .from('pack_sections')
      .select(`
        *,
        document:section_documents(*)
      `)
      .eq('pack_id', packId)
      .order('order_index');
    
    if (error) throw error;
    return data;
  }, []);

  /**
   * Submit a report for a section
   */
  const submitReportMutation = useMutation({
    mutationFn: async (reportData: {
      section_id: string;
      content: any;
    }) => {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Not authenticated');

      // Check if document already exists
      const { data: existingDocs } = await supabase
        .from('section_documents')
        .select('id, version_number')
        .eq('section_id', reportData.section_id)
        .order('version_number', { ascending: false })
        .limit(1);

      const newVersion = existingDocs && existingDocs.length > 0 
        ? (existingDocs[0].version_number || 0) + 1 
        : 1;

      // Create new document
      const { data: document, error: docError } = await supabase
        .from('section_documents')
        .insert({
          section_id: reportData.section_id,
          content: reportData.content,
          version_number: newVersion,
          created_by: user.data.user.id,
        })
        .select()
        .single();

      if (docError) throw docError;

      // Update pack_section to reference this document and mark as submitted
      const { error: updateError } = await supabase
        .from('pack_sections')
        .update({
          document_id: document.id,
          status: 'submitted',
        })
        .eq('id', reportData.section_id);

      if (updateError) throw updateError;

      return document;
    },
    onSuccess: () => {
      toast({
        title: 'Report submitted',
        description: 'Your report has been submitted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error submitting report',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    // Data
    templates: templates || [],
    packs: packs || [],
    isLoadingTemplates,
    isLoadingPacks,

    // Actions
    createTemplate: createTemplateMutation.mutate,
    createPackFromTemplate: createPackFromTemplateMutation.mutate,
    submitReport: submitReportMutation.mutate,
    fetchTemplateSections,
    fetchPackSections,

    // Loading states
    isCreatingTemplate: createTemplateMutation.isPending,
    isCreatingPack: createPackFromTemplateMutation.isPending,
    isSubmittingReport: submitReportMutation.isPending,
  };
}
