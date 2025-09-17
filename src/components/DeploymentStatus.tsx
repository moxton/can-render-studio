import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface DeploymentCheck {
  name: string;
  status: 'checking' | 'success' | 'error' | 'warning';
  message: string;
}

export const DeploymentStatus: React.FC = () => {
  const [checks, setChecks] = useState<DeploymentCheck[]>([
    { name: 'Database Tables', status: 'checking', message: 'Checking...' },
    { name: 'Edge Function', status: 'checking', message: 'Checking...' },
    { name: 'Environment Variables', status: 'checking', message: 'Checking...' }
  ]);

  useEffect(() => {
    runDeploymentChecks();
  }, []);

  const runDeploymentChecks = async () => {
    const newChecks = [...checks];

    // Check 1: Database Tables
    try {
      const { data, error } = await supabase
        .from('user_usage')
        .select('count')
        .limit(1);
      
      if (error) {
        newChecks[0] = { 
          name: 'Database Tables', 
          status: 'error', 
          message: 'Tables not created. Run supabase-schema.sql' 
        };
      } else {
        newChecks[0] = { 
          name: 'Database Tables', 
          status: 'success', 
          message: 'All tables exist' 
        };
      }
    } catch (error) {
      newChecks[0] = { 
        name: 'Database Tables', 
        status: 'error', 
        message: 'Database connection failed' 
      };
    }

    // Check 2: Edge Function
    try {
      const { data, error } = await supabase.functions.invoke('rate-limit', {
        body: { action: 'check', fingerprint: 'test' }
      });
      
      if (error) {
        newChecks[1] = { 
          name: 'Edge Function', 
          status: 'error', 
          message: 'Function not deployed. Run: supabase functions deploy rate-limit' 
        };
      } else {
        newChecks[1] = { 
          name: 'Edge Function', 
          status: 'success', 
          message: 'Rate limiting active' 
        };
      }
    } catch (error) {
      newChecks[1] = { 
        name: 'Edge Function', 
        status: 'error', 
        message: 'Function not deployed or accessible' 
      };
    }

    // Check 3: Environment Variables
    const hasGemini = !!import.meta.env.VITE_GEMINI_API_KEY;
    const hasSupabase = !!import.meta.env.VITE_SUPABASE_URL;
    const hasAdminEmails = !!import.meta.env.VITE_ADMIN_EMAILS;

    if (hasGemini && hasSupabase && hasAdminEmails) {
      newChecks[2] = { 
        name: 'Environment Variables', 
        status: 'success', 
        message: 'All variables configured' 
      };
    } else {
      const missing = [];
      if (!hasGemini) missing.push('VITE_GEMINI_API_KEY');
      if (!hasSupabase) missing.push('VITE_SUPABASE_URL');
      if (!hasAdminEmails) missing.push('VITE_ADMIN_EMAILS');
      
      newChecks[2] = { 
        name: 'Environment Variables', 
        status: 'warning', 
        message: `Missing: ${missing.join(', ')}` 
      };
    }

    setChecks(newChecks);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400 animate-spin" />;
    }
  };

  const allGood = checks.every(check => check.status === 'success');

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        {allGood ? (
          <CheckCircle className="h-5 w-5 text-green-600" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
        )}
        <h3 className="font-medium text-gray-900">
          Deployment Status
        </h3>
      </div>

      <div className="space-y-3">
        {checks.map((check, index) => (
          <div key={index} className="flex items-center gap-3">
            {getStatusIcon(check.status)}
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">
                {check.name}
              </div>
              <div className={`text-xs ${
                check.status === 'error' ? 'text-red-600' :
                check.status === 'warning' ? 'text-yellow-600' :
                check.status === 'success' ? 'text-green-600' :
                'text-gray-500'
              }`}>
                {check.message}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!allGood && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
          <strong>Next steps:</strong> Check the SECURITY_DEPLOYMENT.md file for deployment instructions.
        </div>
      )}

      <button
        onClick={runDeploymentChecks}
        className="mt-3 text-xs text-gray-500 hover:text-gray-700 underline"
      >
        Recheck Status
      </button>
    </div>
  );
};