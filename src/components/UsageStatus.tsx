import React, { useState, useEffect } from 'react';
import { Shield, Clock, User, Users } from 'lucide-react';
import { secureUsageService, SecureUsageStats } from '@/services/secureUsageService';
import { useAuth } from '@/contexts/AuthContext';

export const UsageStatus: React.FC = () => {
  const [stats, setStats] = useState<SecureUsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const loadStats = async () => {
    try {
      setLoading(true);
      const usageStats = await secureUsageService.checkUsageLimit();
      setStats(usageStats);
    } catch (error) {
      console.error('Failed to load usage stats:', error);
      // Fallback stats when Edge Function isn't deployed yet
      setStats({
        generationsUsed: 0,
        generationsRemaining: user ? 10 : 5,
        canGenerate: true,
        resetTime: new Date(new Date().setHours(24, 0, 0, 0)),
        isAuthenticated: !!user,
        maxGenerations: user ? 10 : 5,
        limitType: user ? 'authenticated' : 'anonymous'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400" />
        Loading usage...
      </div>
    );
  }

  if (!stats) return null;

  const resetTime = new Date(stats.resetTime);
  const hoursUntilReset = Math.ceil((resetTime.getTime() - Date.now()) / (1000 * 60 * 60));

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-800">
            Usage Status
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          {stats.isAuthenticated ? (
            <>
              <User className="h-3 w-3" />
              Authenticated
            </>
          ) : (
            <>
              <Users className="h-3 w-3" />
              Anonymous
            </>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {/* Usage Bar */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Generations</span>
          <span className="font-medium text-gray-800">
            {stats.generationsUsed} / {stats.maxGenerations}
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              stats.generationsRemaining === 0
                ? 'bg-red-500'
                : stats.generationsRemaining <= 2
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            style={{
              width: `${(stats.generationsUsed / stats.maxGenerations) * 100}%`
            }}
          />
        </div>

        {/* Status Messages */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-gray-500">
            <Clock className="h-3 w-3" />
            Resets in {hoursUntilReset}h
          </div>
          
          {stats.generationsRemaining === 0 ? (
            <span className="text-red-600 font-medium">Limit reached</span>
          ) : (
            <span className="text-green-600 font-medium">
              {stats.generationsRemaining} remaining
            </span>
          )}
        </div>

        {/* Upgrade Message for Anonymous Users */}
        {!stats.isAuthenticated && stats.generationsRemaining <= 2 && (
          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
            💡 Sign in to get {10 - stats.maxGenerations} more generations per day!
          </div>
        )}
      </div>
    </div>
  );
};