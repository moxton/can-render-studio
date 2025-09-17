import React, { useState, useEffect } from 'react';
import { Shield, Users, Activity, AlertTriangle } from 'lucide-react';
import { secureUsageService } from '@/services/secureUsageService';

interface UsageAnalytics {
  totalGenerations: number;
  successfulGenerations: number;
  failedGenerations: number;
  uniqueAuthenticatedUsers: number;
  uniqueAnonymousUsers: number;
  totalUniqueUsers: number;
}

export const AdminDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<UsageAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await secureUsageService.getUsageAnalytics(days);
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [days]);

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border">
        <div className="flex items-center gap-2 text-red-600 mb-4">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="font-semibold">Error Loading Analytics</h3>
        </div>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={loadAnalytics}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!analytics) return null;

  const successRate = analytics.totalGenerations > 0 
    ? (analytics.successfulGenerations / analytics.totalGenerations * 100).toFixed(1)
    : '0';

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold">Security Analytics</h3>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="days" className="text-sm text-gray-600">Last</label>
          <select
            id="days"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-1 border rounded text-sm"
          >
            <option value={1}>1 day</option>
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Total Generations</span>
          </div>
          <div className="text-2xl font-bold text-blue-900">{analytics.totalGenerations}</div>
          <div className="text-sm text-blue-600">
            {analytics.successfulGenerations} successful, {analytics.failedGenerations} failed
          </div>
        </div>

        <div className="p-4 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">Unique Users</span>
          </div>
          <div className="text-2xl font-bold text-green-900">{analytics.totalUniqueUsers}</div>
          <div className="text-sm text-green-600">
            {analytics.uniqueAuthenticatedUsers} auth, {analytics.uniqueAnonymousUsers} anon
          </div>
        </div>

        <div className="p-4 bg-purple-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-800">Success Rate</span>
          </div>
          <div className="text-2xl font-bold text-purple-900">{successRate}%</div>
          <div className="text-sm text-purple-600">
            Rate limiting active
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h4 className="font-medium text-gray-900 mb-2">Security Status</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Server-side rate limiting: Active</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Anonymous limit: 5 generations/day</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Authenticated limit: 10 generations/day</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Device fingerprinting: Enabled</span>
          </div>
        </div>
      </div>

      <button
        onClick={loadAnalytics}
        className="mt-4 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
      >
        Refresh Data
      </button>
    </div>
  );
};