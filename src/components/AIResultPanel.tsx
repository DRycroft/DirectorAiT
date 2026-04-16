/**
 * AI Result Panel
 * 
 * Displays AI-generated content with clear disclaimer and copy functionality.
 * All AI outputs must be rendered through this component.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Copy, Check, X, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AIResultPanelProps {
  title: string;
  result: string;
  generatedAt: string;
  disclaimer: string;
  onClose: () => void;
}

export default function AIResultPanel({ title, result, generatedAt, disclaimer, onClose }: AIResultPanelProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      toast({ title: 'Copied', description: 'AI output copied to clipboard' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/[0.02]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">{title}</CardTitle>
            <Badge variant="outline" className="text-xs font-normal">
              AI Generated
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Disclaimer */}
        <div className="flex items-start gap-2 p-2 rounded bg-warning/10 border border-warning/20 text-xs text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
          <span>{disclaimer}</span>
        </div>

        {/* AI Content */}
        <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap text-sm leading-relaxed">
          {result}
        </div>

        {/* Metadata */}
        <p className="text-xs text-muted-foreground pt-2 border-t">
          Generated at {new Date(generatedAt).toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}
