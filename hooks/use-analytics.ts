"use client";

import { useState, useEffect } from "react";

// Interface matching the API response
interface AnalyticsData {
  chartData: Array<{
    date: string;
    desktop: number;
    mobile: number;
    total: number;
  }>;
  totalViews: number;
  totalVisitors: number;
  topPages: Array<{
    page: string;
    views: number;
  }>;
  topReferrers: Array<{
    referrer: string;
    views: number;
  }>;
}

interface UseAnalyticsOptions {
  range?: "7d" | "30d" | "90d";
  timezone?: string;
  refreshInterval?: number; // in milliseconds
}

interface UseAnalyticsReturn {
  data: AnalyticsData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAnalytics({
  range = "7d",
  timezone = "UTC",
  refreshInterval,
}: UseAnalyticsOptions = {}): UseAnalyticsReturn {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        range,
        timezone,
      });

      const response = await fetch(`/api/analytics?${params}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      console.error("Error fetching analytics data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const refetch = async () => {
    await fetchAnalytics();
  };

  // Initial data fetch
  useEffect(() => {
    fetchAnalytics();
  }, [range, timezone]);

  // Set up automatic refresh if specified
  useEffect(() => {
    if (!refreshInterval) return;

    const interval = setInterval(fetchAnalytics, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, range, timezone]);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}

// Helper hook for chart data specifically
export function useAnalyticsChart(options?: UseAnalyticsOptions) {
  const { data, isLoading, error, refetch } = useAnalytics(options);

  // Transform data to match chart requirements
  const chartData =
    data?.chartData?.map((item) => ({
      date: item.date,
      desktop: item.desktop,
      mobile: item.mobile,
      visitors: item.desktop + item.mobile, // Total for backward compatibility
    })) || [];

  return {
    chartData,
    totalViews: data?.totalViews || 0,
    totalVisitors: data?.totalVisitors || 0,
    isLoading,
    error,
    refetch,
  };
}

// Helper hook for table data specifically
export function useAnalyticsTable(options?: UseAnalyticsOptions) {
  const { data, isLoading, error, refetch } = useAnalytics(options);

  // Transform data for table display
  const tableData =
    data?.topPages?.map((page, index) => ({
      id: index + 1,
      header: page.page,
      type: "Page",
      status: "Active",
      target: page.views.toString(),
      limit: "∞",
      reviewer: "System",
    })) || [];

  return {
    tableData,
    topPages: data?.topPages || [],
    topReferrers: data?.topReferrers || [],
    totalViews: data?.totalViews || 0,
    isLoading,
    error,
    refetch,
  };
}
