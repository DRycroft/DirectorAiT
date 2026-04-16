/**
 * Governance AI Hook
 * 
 * Provides user-triggered AI actions for governance workflows.
 * All outputs include disclaimers and are clearly labelled as AI-generated.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type AIAction =
  | 'summarise-pack'
  | 'transcript-to-minutes'
  | 'transcript-to-actions'
  | 'highlight-risks'
  | 'director-briefing'
  | 'ask-history';

interface AIResponse {
  success: boolean;
  action: string;
  result: string;
  generated_at: string;
  disclaimer: string;
}

interface UseGovernanceAIReturn {
  isProcessing: boolean;
  result: AIResponse | null;
  error: string | null;
  execute: (params: {
    action: AIAction;
    boardId?: string;
    packId?: string;
    agendaId?: string;
    transcript?: string;
    question?: string;
  }) => Promise<AIResponse | null>;
  clearResult: () => void;
}

export function useGovernanceAI(): UseGovernanceAIReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<AIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const execute = useCallback(async (params: {
    action: AIAction;
    boardId?: string;
    packId?: string;
    agendaId?: string;
    transcript?: string;
    question?: string;
  }): Promise<AIResponse | null> => {
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('governance-ai', {
        body: params,
      });

      if (fnError) {
        throw new Error(fnError.message || 'AI request failed');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const response = data as AIResponse;
      setResult(response);
      return response;
    } catch (err: any) {
      const message = err.message || 'AI request failed';
      setError(message);

      if (message.includes('rate limit')) {
        toast({ title: 'Rate limit reached', description: 'Please wait a moment and try again.', variant: 'destructive' });
      } else if (message.includes('credits')) {
        toast({ title: 'AI credits exhausted', description: 'Please add credits in your workspace settings.', variant: 'destructive' });
      } else {
        toast({ title: 'AI Error', description: message, variant: 'destructive' });
      }
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { isProcessing, result, error, execute, clearResult };
}
