"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Loader2,
  MessageSquare,
  QrCode,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getAdminDashboard } from "@/lib/api";
import type { DashboardStats } from "@/lib/api";
import type { Restaurant, ReviewEvent } from "@/lib/supabase";

type DashboardData = {
  restaurant: Restaurant;
  stats: DashboardStats;
  recentReviews: ReviewEvent[];
  labelCounts: { label: string; count: number }[];
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdminDashboard()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const ratingDistribution = useMemo(() => {
    const reviews = data?.recentReviews || [];
    return [5, 4, 3, 2, 1].map((star) => {
      const count = reviews.filter((review) => review.rating === star).length;
      const percentage = reviews.length ? Math.round((count / reviews.length) * 100) : 0;
      return { star, percentage };
    });
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">Unable to load dashboard</h2>
        <p className="text-muted-foreground mt-2">{error || "Please try again."}</p>
      </div>
    );
  }

  const cards = [
    { title: "Total Reviews", value: data.stats.totalReviews, icon: MessageSquare, description: "All time" },
    { title: "This Month", value: data.stats.reviewsThisMonth, icon: Calendar, description: "Calendar month" },
    { title: "Average Rating", value: data.stats.averageRating.toFixed(1), icon: Star, description: "All reviews" },
    { title: "Review Velocity", value: data.stats.reviewVelocity, icon: TrendingUp, description: "Avg/day last 7 days" },
    { title: "Scans Today", value: data.stats.scansToday, icon: QrCode, description: "QR scans" },
    { title: "Completion Rate", value: `${data.stats.completionRate}%`, icon: Users, description: "Last 30 days" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground">Live review performance for {data.restaurant.name}.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Calendar size={16} />
          Last 30 Days
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map((stat) => (
          <Card key={stat.title} className="border-none shadow-sm bg-white dark:bg-[#0F0F12] rounded-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <stat.icon size={20} />
                </div>
                <Badge variant="secondary" className="rounded-md">
                  Live
                </Badge>
              </div>
              <p className="text-sm font-medium text-muted-foreground mt-4">{stat.title}</p>
              <h2 className="text-3xl font-bold mt-1">{stat.value}</h2>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="rounded-lg lg:col-span-1 border-none shadow-sm bg-white dark:bg-[#0F0F12]">
          <CardHeader>
            <CardTitle>Recent Rating Mix</CardTitle>
            <CardDescription>Based on latest review events</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {ratingDistribution.map(({ star, percentage }) => (
              <div key={star} className="flex items-center gap-4">
                <div className="flex items-center gap-1 w-8">
                  <span className="text-sm font-bold">{star}</span>
                  <Star size={12} className="fill-yellow-400 text-yellow-400" />
                </div>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${percentage}%` }} />
                </div>
                <span className="text-xs text-muted-foreground w-10 text-right">{percentage}%</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-lg lg:col-span-2 border-none shadow-sm bg-white dark:bg-[#0F0F12]">
          <CardHeader>
            <CardTitle>Recent Reviews</CardTitle>
            <CardDescription>Latest customer submissions from QR codes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {data.recentReviews.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No reviews yet.</p>
              ) : (
                data.recentReviews.slice(0, 10).map((review) => (
                  <div key={review.id} className="flex gap-4 items-start pb-6 border-b last:border-0 last:pb-0">
                    <Avatar className="h-10 w-10 rounded-lg">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">A</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="font-bold text-sm">Anonymous diner</h4>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={12}
                            className={i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted/30"}
                          />
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed italic break-words">
                        &quot;{review.final_review}&quot;
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(review.selected_labels || []).map((label) => (
                          <Badge key={label} variant="secondary" className="text-[10px]">
                            {label}
                          </Badge>
                        ))}
                        {review.was_edited && (
                          <Badge variant="outline" className="text-[10px]">
                            Edited
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-lg border-none shadow-sm bg-white dark:bg-[#0F0F12]">
        <CardHeader>
          <CardTitle>Top Labels</CardTitle>
          <CardDescription>Most selected chips across reviews</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.labelCounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No label data yet.</p>
          ) : (
            data.labelCounts.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="w-40 text-sm font-medium truncate">{item.label}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${Math.max(8, (item.count / Math.max(...data.labelCounts.map((label) => label.count))) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-8 text-right">{item.count}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
