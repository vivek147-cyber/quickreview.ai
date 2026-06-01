"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { listAdminReviews } from "@/lib/api";
import type { ReviewEvent } from "@/lib/supabase";
import { toast } from "sonner";

const STAR_COLORS: Record<number, string> = {
  5: "text-green-600",
  4: "text-green-500",
  3: "text-amber-500",
  2: "text-orange-500",
  1: "text-red-500",
};

function toDateInput(date: Date) {
  return date.toISOString().split("T")[0];
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ReviewEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [rating, setRating] = useState<number | null>(null);
  const [from, setFrom] = useState(() => toDateInput(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
  const [to, setTo] = useState(() => toDateInput(new Date()));

  const fetchReviews = useCallback(async (currentPage = page) => {
    setLoading(true);
    try {
      const data = await listAdminReviews({ page: currentPage, rating, from, to });
      setReviews(data.reviews);
      setTotal(data.total);
      setPage(data.page);
      setPages(data.pages);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [page, rating, from, to]);

  useEffect(() => { fetchReviews(1); }, [rating, from, to]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyFilters = () => { setPage(1); fetchReviews(1); };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">All Reviews</h1>
        <p className="text-muted-foreground mt-1">
          {loading ? "Loading..." : `${total} review${total !== 1 ? "s" : ""} found`}
        </p>
      </div>

      {/* Filters */}
      <Card className="border-none shadow-sm bg-white rounded-lg">
        <CardContent className="p-4 flex flex-wrap gap-4 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Rating</Label>
            <div className="flex gap-1">
              {[null, 5, 4, 3, 2, 1].map((r) => (
                <button
                  key={r ?? "all"}
                  onClick={() => { setRating(r); setPage(1); }}
                  className={`h-9 px-3 rounded-lg border text-sm font-medium transition-colors ${
                    rating === r
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted border-border"
                  }`}
                >
                  {r === null ? "All" : `${r}★`}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36 h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36 h-9" />
          </div>
          <Button onClick={applyFilters} disabled={loading} size="sm">
            {loading ? "Loading..." : "Apply"}
          </Button>
        </CardContent>
      </Card>

      {/* Reviews Table */}
      <Card className="border-none shadow-sm bg-white rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="pl-6 py-4">Date</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Labels</TableHead>
              <TableHead>Review</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-center">Edited</TableHead>
              <TableHead className="text-right pr-6">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}>
                      <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : reviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No reviews found for the selected filters.
                </TableCell>
              </TableRow>
            ) : (
              reviews.map((review) => (
                <TableRow key={review.id}>
                  <TableCell className="pl-6 text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(review.created_at).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <span className={`flex items-center gap-1 font-bold text-sm ${STAR_COLORS[review.rating] ?? ""}`}>
                      <Star size={14} fill="currentColor" />
                      {review.rating}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[220px]">
                      {(review.selected_labels ?? []).slice(0, 3).map((label) => (
                        <Badge key={label} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {label}
                        </Badge>
                      ))}
                      {(review.selected_labels ?? []).length > 3 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          +{review.selected_labels.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="text-sm line-clamp-2 text-muted-foreground">{review.final_review}</p>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5 min-w-[130px]">
                      {(review as ReviewEvent & { customer_phone?: string | null }).customer_phone ? (
                        <p className="text-xs font-medium text-gray-700">
                          📱 {(review as ReviewEvent & { customer_phone?: string | null }).customer_phone}
                        </p>
                      ) : null}
                      {(review as ReviewEvent & { customer_email?: string | null }).customer_email ? (
                        <p className="text-xs text-gray-500 truncate max-w-[140px]">
                          ✉️ {(review as ReviewEvent & { customer_email?: string | null }).customer_email}
                        </p>
                      ) : null}
                      {!(review as ReviewEvent & { customer_phone?: string | null }).customer_phone &&
                       !(review as ReviewEvent & { customer_email?: string | null }).customer_email && (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`text-xs font-medium ${review.was_edited ? "text-amber-600" : "text-muted-foreground"}`}>
                      {review.was_edited ? "Yes" : "No"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right pr-6 text-sm text-muted-foreground whitespace-nowrap">
                    {review.time_to_submit != null ? `${review.time_to_submit}s` : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <p className="text-sm text-muted-foreground">
              Page {page} of {pages} · {total} total
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => { const p = page - 1; setPage(p); fetchReviews(p); }}
                className="gap-1"
              >
                <ChevronLeft size={16} /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pages || loading}
                onClick={() => { const p = page + 1; setPage(p); fetchReviews(p); }}
                className="gap-1"
              >
                Next <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
