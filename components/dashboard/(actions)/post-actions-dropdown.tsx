"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  Star,
  StarOff,
} from "lucide-react";
import {
  togglePostPublishAction,
  deletePostAction,
  approvePostAction,
  rejectPostAction,
  togglePostFeaturedAction,
} from "@/actions/posts";

interface Post {
  id: string;
  title: string;
  isPublished: boolean;
  isFeatured?: boolean;
  status?: string;
  authorId?: string;
}

interface PostActionsDropdownProps {
  post: Post;
  currentUserId?: string;
  currentUserRole?: string;
}

export function PostActionsDropdown({
  post,
  currentUserId,
  currentUserRole,
}: PostActionsDropdownProps) {
  const [isPending, startTransition] = useTransition();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isTogglingFeatured, setIsTogglingFeatured] = useState(false);

  const isAdmin = currentUserRole === "ADMIN";
  const isOwner = currentUserId === post.authorId;
  // Users can edit/delete their own posts only if they haven't been approved or rejected yet
  // Admins can edit/delete any post regardless of status
  const canEdit =
    isAdmin ||
    (isOwner && post.status !== "APPROVED" && post.status !== "REJECTED");
  const canDelete =
    isAdmin ||
    (isOwner && post.status !== "APPROVED" && post.status !== "REJECTED");
  const isPendingApproval = post.status === "PENDING_APPROVAL";

  const handleTogglePublish = async () => {
    if (isPending) return;

    setIsToggling(true);
    startTransition(async () => {
      try {
        const result = await togglePostPublishAction(post.id);
        if (result.success) {
          toast.success(result.message);
        }
      } catch (error) {
        console.error("Error toggling post publish status:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to update post status"
        );
      } finally {
        setIsToggling(false);
      }
    });
  };

  const handleDelete = async () => {
    if (isPending) return;

    setIsDeleting(true);
    startTransition(async () => {
      try {
        const result = await deletePostAction(post.id);
        if (result.success) {
          toast.success(result.message);
          setShowDeleteDialog(false);
        }
      } catch (error) {
        console.error("Error deleting post:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to delete post"
        );
      } finally {
        setIsDeleting(false);
      }
    });
  };

  const handleApprove = async () => {
    if (isPending) return;

    setIsApproving(true);
    startTransition(async () => {
      try {
        const result = await approvePostAction(post.id);
        if (result.success) {
          toast.success(result.message);
        }
      } catch (error) {
        console.error("Error approving post:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to approve post"
        );
      } finally {
        setIsApproving(false);
      }
    });
  };

  const handleReject = async () => {
    if (isPending) return;

    setIsRejecting(true);
    startTransition(async () => {
      try {
        const result = await rejectPostAction(post.id);
        if (result.success) {
          toast.success(result.message);
        }
      } catch (error) {
        console.error("Error rejecting post:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to reject post"
        );
      } finally {
        setIsRejecting(false);
      }
    });
  };

  const handleToggleFeatured = async () => {
    if (isPending) return;

    setIsTogglingFeatured(true);
    startTransition(async () => {
      try {
        const result = await togglePostFeaturedAction(post.id);
        if (result.success) {
          toast.success(result.message);
        }
      } catch (error) {
        console.error("Error toggling post featured status:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to update featured status"
        );
      } finally {
        setIsTogglingFeatured(false);
      }
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0" disabled={isPending}>
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/entry/${post.id}`} target="_blank">
              <Eye className="mr-2 h-4 w-4" />
              View
            </Link>
          </DropdownMenuItem>

          {canEdit && (
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/posts/edit/${post.id}`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </DropdownMenuItem>
          )}

          {/* Admin-only actions */}
          {isAdmin && (
            <>
              {isPendingApproval && (
                <>
                  <DropdownMenuItem
                    onClick={handleApprove}
                    disabled={isPending || isApproving}
                    className="text-green-600 focus:text-green-600"
                  >
                    {isApproving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Eye className="mr-2 h-4 w-4" />
                    )}
                    {isApproving ? "Approving..." : "Approve"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleReject}
                    disabled={isPending || isRejecting}
                    className="text-orange-600 focus:text-orange-600"
                  >
                    {isRejecting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <EyeOff className="mr-2 h-4 w-4" />
                    )}
                    {isRejecting ? "Rejecting..." : "Reject"}
                  </DropdownMenuItem>
                </>
              )}

              {!isPendingApproval && (
                <DropdownMenuItem
                  onClick={handleTogglePublish}
                  disabled={isPending || isToggling}
                >
                  {isToggling ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : post.isPublished ? (
                    <EyeOff className="mr-2 h-4 w-4" />
                  ) : (
                    <Eye className="mr-2 h-4 w-4" />
                  )}
                  {isToggling
                    ? "Processing..."
                    : post.isPublished
                    ? "Unpublish"
                    : "Publish"}
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                onClick={handleToggleFeatured}
                disabled={isPending || isTogglingFeatured}
                className="text-yellow-600 focus:text-yellow-600"
              >
                {isTogglingFeatured ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : post.isFeatured ? (
                  <StarOff className="mr-2 h-4 w-4" />
                ) : (
                  <Star className="mr-2 h-4 w-4" />
                )}
                {isTogglingFeatured
                  ? "Processing..."
                  : post.isFeatured
                  ? "Unfeature"
                  : "Feature"}
              </DropdownMenuItem>
            </>
          )}

          {canDelete && (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              post &quot;{post.title}&quot; and remove all associated data
              including bookmarks, favorites, and view statistics.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Post"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
