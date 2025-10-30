import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  message?: string;
  responseTime?: number;
}

export default function Health() {
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    performHealthChecks();
  }, []);

  const performHealthChecks = async () => {
    const results: HealthCheck[] = [];

    // Check Supabase connection
    const dbStart = Date.now();
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      results.push({
        service: 'Database',
        status: error ? 'degraded' : 'healthy',
        message: error ? error.message : 'Connected',
        responseTime: Date.now() - dbStart,
      });
    } catch (error) {
      results.push({
        service: 'Database',
        status: 'down',
        message: 'Connection failed',
        responseTime: Date.now() - dbStart,
      });
    }

    // Check Auth service
    try {
      const { error } = await supabase.auth.getSession();
      results.push({
        service: 'Authentication',
        status: error ? 'degraded' : 'healthy',
        message: error ? error.message : 'Service operational',
      });
    } catch (error) {
      results.push({
        service: 'Authentication',
        status: 'down',
        message: 'Service unavailable',
      });
    }

    // Check frontend
    results.push({
      service: 'Frontend',
      status: 'healthy',
      message: 'Application running',
    });

    setChecks(results);
    setLoading(false);
  };

  const getStatusIcon = (status: HealthCheck['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'down':
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusBadge = (status: HealthCheck['status']) => {
    const variants = {
      healthy: 'default',
      degraded: 'secondary',
      down: 'destructive',
    } as const;
    
    return (
      <Badge variant={variants[status]}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const overallStatus = checks.every(c => c.status === 'healthy')
    ? 'healthy'
    : checks.some(c => c.status === 'down')
    ? 'down'
    : 'degraded';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Performing health checks...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">System Health</CardTitle>
              <CardDescription>Real-time service status monitoring</CardDescription>
            </div>
            {getStatusBadge(overallStatus)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {checks.map((check, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(check.status)}
                  <div>
                    <p className="font-medium">{check.service}</p>
                    <p className="text-sm text-muted-foreground">{check.message}</p>
                  </div>
                </div>
                <div className="text-right">
                  {check.responseTime && (
                    <p className="text-sm text-muted-foreground">
                      {check.responseTime}ms
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              Last checked: {new Date().toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              App Version: {import.meta.env.VITE_APP_VERSION || '1.0.0'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
