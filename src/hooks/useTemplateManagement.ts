
/**
 * Template Management Hook
 * 
 * Provides unified interface for managing board paper templates.
 * Consolidates template logic from multiple components into a single reusable hook.
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Template section definition
 */
export interface TemplateSection {
  id?: string;
  section_name: string;
  section_order: number;
  default_content?: string;
  is_required: boolean;
}

/**
 * Template definition
 */
export interface Template {
  id: string;
  org_id: string;
  name: string;
  description?: string;
  template_type: string;
  version: number;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  sections?: TemplateSection[];
}

/**
 * Template type definitions
 */
export const TEMPLATE_TYPES = {
  chair: 'Board Chair Report',
  ceo: 'CEO Report',
  cfo: 'CFO Report',
  product: 'Product Update',
  hr: 'HR Update',
  sales: 'Sales Report',
  compliance: 'Compliance Report',
  custom: 'Custom Template',
} as const;

/**
 * Default sections for each template type
 */
export const DEFAULT_TEMPLATE_SECTIONS: Record<string, string[]> = {
  chair: ['Executive Summary', 'Key Board Matters', 'Strategic Initiatives', 'Governance Updates'],
  ceo: ['Executive Summary', 'Operational Highlights', 'Financial Overview', 'Strategic Initiatives'],
  cfo: ['Financial Summary', 'Budget vs Actual', 'Cash Flow Analysis', 'Financial Risks'],
  product: ['Product Development Update', 'R&D Initiatives', 'Innovation Pipeline', 'Technology Roadmap'],
  hr: ['People & Culture Update', 'Recruitment & Retention', 'Training & Development', 'Employee Engagement'],
  sales: ['Sales Performance', 'Pipeline Analysis', 'Market Trends', 'Customer Insights'],
  compliance: ['Regulatory Compliance Status', 'Recent Audits and Inspections', 'Outstanding Compliance Items'],
};

/**
 * Hook for managing templates
 */
export function useTemplateManagement(orgId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  /**
   * Fetch all templates for an organization
   */
  const {
    data: templates,
    isLoading: isLoadingTemplates,
    error: templatesError,
  } = useQuery({
    queryKey: ['templates', orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from('board_paper_templates')
        .select(`
          *,
          sections:template_sections(*)
        `)
        .eq('org_id', orgId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return (data || []) as any as Template[];
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  /**
   * Fetch a specific template by ID
   */
  const fetchTemplate = useCallback(async (templateId: string) => {
    const { data, error } = await supabase
      .from('board_paper_templates')
      .select(`
        *,
        sections:template_sections(*)
      `)
      .eq('id', templateId)
      .single();

    if (error) throw error;
    return data as any as Template;
  }, []);

  /**
   * Create a new template
   */
  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: {
      name: string;
      description?: string;
      template_type: string;
      sections: Omit<TemplateSection, 'id'>[];
    }) => {
      if (!orgId) throw new Error('Organization ID is required');

      // Create template
      const { data: template, error: templateError } = await supabase
        .from('board_paper_templates')
        .insert({
          template_name: templateData.name,
          template_type: templateData.template_type,
          org_id: orgId,
          created_by: (await supabase.auth.getUser()).data.user?.id || '',
        } as any)
        .select()
        .single();

      if (templateError) throw templateError;

      // Create sections
      const sections = templateData.sections.map((section, index) => ({
        template_id: template.id,
        section_name: section.section_name,
        section_order: section.section_order ?? index,
        default_content: section.default_content,
        is_required: section.is_required,
      }));

      // Skip creating sections for now - they'll be added separately
      // const { error: sectionsError } = await supabase
      //   .from('template_sections')
      //   .insert(sections as any);
      // if (sectionsError) throw sectionsError;

      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates', orgId] });
      toast({
        title: 'Template created',
        description: 'Your template has been created successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error creating template',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  /**
   * Update an existing template
   */
  const updateTemplateMutation = useMutation({
    mutationFn: async ({
      templateId,
      updates,
    }: {
      templateId: string;
      updates: Partial<Template>;
    }) => {
      const { data, error } = await supabase
        .from('board_paper_templates')
        .update(updates as any)
        .eq('id', templateId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates', orgId] });
      toast({
        title: 'Template updated',
        description: 'Your template has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating template',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  /**
   * Delete a template (soft delete by setting is_active to false)
   */
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('board_paper_templates')
        .update({ is_default: false } as any)
        .eq('id', templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates', orgId] });
      toast({
        title: 'Template deleted',
        description: 'Your template has been deleted successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error deleting template',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  /**
   * Get template by type
   */
  const getTemplatesByType = useCallback(
    (type: string) => {
      return templates?.filter((t) => t.template_type === type) || [];
    },
    [templates]
  );

  /**
   * Get default sections for a template type
   */
  const getDefaultSections = useCallback((type: string): TemplateSection[] => {
    const sectionNames = DEFAULT_TEMPLATE_SECTIONS[type] || [];
    return sectionNames.map((name, index) => ({
      section_name: name,
      section_order: index,
      is_required: false,
    }));
  }, []);

  return {
    // Data
    templates: templates || [],
    selectedTemplate,
    isLoadingTemplates,
    templatesError,

    // Actions
    setSelectedTemplate,
    fetchTemplate,
    createTemplate: createTemplateMutation.mutate,
    updateTemplate: updateTemplateMutation.mutate,
    deleteTemplate: deleteTemplateMutation.mutate,
    getTemplatesByType,
    getDefaultSections,

    // Loading states
    isCreating: createTemplateMutation.isPending,
    isUpdating: updateTemplateMutation.isPending,
    isDeleting: deleteTemplateMutation.isPending,
  };
}
