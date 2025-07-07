"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import { useIsMobile } from "@/hooks/use-mobile";
import { useAnalyticsChart } from "@/hooks/use-analytics";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import {
  IconTrendingUp,
  IconTrendingDown,
  IconRefresh,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

export const description =
  "An interactive area chart showing real analytics data";

const chartConfig = {
  visitors: {
    label: "Visitors",
  },
  desktop: {
    label: "Desktop",
    color: "var(--primary)",
  },
  mobile: {
    label: "Mobile",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function ChartAreaInteractive() {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = React.useState<"7d" | "30d" | "90d">("30d");

  // Use the analytics hook to fetch real data
  const { chartData, totalViews, totalVisitors, isLoading, error, refetch } =
    useAnalyticsChart({
      range: timeRange,
      refreshInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    });

  React.useEffect(() => {
    if (isMobile && timeRange !== "7d") {
      setTimeRange("7d");
    }
  }, [isMobile, timeRange]);

  // Calculate growth percentage from chart data
  const calculateGrowthPercentage = () => {
    if (chartData.length < 2) return 0;

    const recentData = chartData.slice(-7); // Last 7 days
    const previousData = chartData.slice(-14, -7); // Previous 7 days

    if (previousData.length === 0) return 0;

    const recentTotal = recentData.reduce(
      (sum, item) => sum + item.visitors,
      0
    );
    const previousTotal = previousData.reduce(
      (sum, item) => sum + item.visitors,
      0
    );

    if (previousTotal === 0) return recentTotal > 0 ? 100 : 0;

    return (
      Math.round(((recentTotal - previousTotal) / previousTotal) * 100 * 100) /
      100
    );
  };

  const growthPercentage = calculateGrowthPercentage();
  const isGrowthPositive = growthPercentage >= 0;

  // Format number with commas
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(num);
  };

  // Show error state
  if (error && !isLoading) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Total Visitors
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="h-8 w-8 p-0"
            >
              <IconRefresh className="h-4 w-4" />
            </Button>
          </CardTitle>
          <CardDescription>Unable to load analytics data</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[250px]">
          <div className="text-center">
            <p className="text-destructive text-sm mb-2">Error: {error}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <IconRefresh className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Total Visitors
              {isLoading && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              )}
            </CardTitle>
            <CardDescription>
              <span className="hidden @[540px]/card:block">
                {formatNumber(totalViews)} total views •{" "}
                {formatNumber(totalVisitors)} unique visitors
              </span>
              <span className="@[540px]/card:hidden">
                {formatNumber(totalViews)} views
              </span>
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="h-8 w-8 p-0"
            disabled={isLoading}
          >
            <IconRefresh
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
        <CardAction>
          <div className="flex items-center gap-2">
            {chartData.length > 0 && (
              <Badge variant="outline" className="gap-1">
                {isGrowthPositive ? (
                  <IconTrendingUp className="h-3 w-3" />
                ) : (
                  <IconTrendingDown className="h-3 w-3" />
                )}
                {isGrowthPositive ? "+" : ""}
                {growthPercentage}%
              </Badge>
            )}
            <ToggleGroup
              type="single"
              value={timeRange}
              onValueChange={(value) =>
                value && setTimeRange(value as "7d" | "30d" | "90d")
              }
              variant="outline"
              className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
            >
              <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
              <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
              <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
            </ToggleGroup>
            <Select
              value={timeRange}
              onValueChange={(value) =>
                setTimeRange(value as "7d" | "30d" | "90d")
              }
            >
              <SelectTrigger
                className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
                size="sm"
                aria-label="Select a value"
              >
                <SelectValue placeholder="Last 30 days" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="90d" className="rounded-lg">
                  Last 3 months
                </SelectItem>
                <SelectItem value="30d" className="rounded-lg">
                  Last 30 days
                </SelectItem>
                <SelectItem value="7d" className="rounded-lg">
                  Last 7 days
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {isLoading ? (
          // Loading skeleton
          <div className="aspect-auto h-[250px] w-full animate-pulse bg-muted rounded-lg" />
        ) : chartData.length === 0 ? (
          // No data state
          <div className="aspect-auto h-[250px] w-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">No data available</p>
              <p className="text-muted-foreground text-xs mt-1">
                Try selecting a different time range
              </p>
            </div>
          </div>
        ) : (
          // Chart with real data
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-desktop)"
                    stopOpacity={1.0}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-desktop)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-mobile)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-mobile)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                }}
              />
              <ChartTooltip
                cursor={false}
                defaultIndex={isMobile ? -1 : 10}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      return new Date(value).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      });
                    }}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="mobile"
                type="natural"
                fill="url(#fillMobile)"
                stroke="var(--color-mobile)"
                stackId="a"
              />
              <Area
                dataKey="desktop"
                type="natural"
                fill="url(#fillDesktop)"
                stroke="var(--color-desktop)"
                stackId="a"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
