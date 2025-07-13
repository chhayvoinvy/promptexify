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
import { MoreHorizontal, Edit, Trash2, Loader2 } from "@/components/ui/icons";
import { deleteCategoryAction } from "@/actions";
import { useCSRFForm } from "@/hooks/use-csrf";

interface Category {
  id: string;
  name: string;
  children: Array<{ id: string; name: string; slug: string }>;
  _count: {
    posts: number;
  };
}

interface CategoryActionsDropdownProps {
  category: Category;
  isSubcategory?: boolean;
}

export function CategoryActionsDropdown({
  category,
  isSubcategory = false,
}: CategoryActionsDropdownProps) {
  const [isPending, startTransition] = useTransition();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { createFormDataWithCSRF, isReady } = useCSRFForm();

  const handleDelete = async () => {
    if (isPending || isDeleting || !isReady) {
      if (!isReady) {
        toast.error("Security verification in progress. Please wait.");
      }
      return;
    }

    setIsDeleting(true);
    startTransition(async () => {
      try {
        // Add CSRF protection to form data
        const secureFormData = createFormDataWithCSRF();
        secureFormData.set("id", category.id);
        const result = await deleteCategoryAction(secureFormData);

        if (result.success) {
          toast.success(
            result.message || `Category "${category.name}" deleted successfully`
          );
          setShowDeleteDialog(false);
        } else {
          toast.error(result.error || "Failed to delete category");
        }
      } catch (error) {
        console.error("Error deleting category:", error);
        toast.error("An unexpected error occurred");
      } finally {
        setIsDeleting(false);
      }
    });
  };

  const canDelete =
    category._count.posts === 0 && category.children.length === 0;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-8 w-8 p-0"
            disabled={isPending || isDeleting || !isReady}
          >
            <span className="sr-only">Open menu</span>
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/categories/edit/${category.id}`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit category
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setShowDeleteDialog(true);
            }}
            disabled={!canDelete || !isReady}
            className={!canDelete || !isReady ? "opacity-50" : ""}
          >
            <Trash2 className="mr-2 h-4 w-4 text-destructive" />
            <span className="text-destructive">Delete category</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete &ldquo;{category.name}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the{" "}
              {isSubcategory ? "subcategory" : "category"}
              {category.children.length > 0 &&
                ` and affect ${category.children.length} subcategories`}
              {category._count.posts > 0 &&
                ` and ${category._count.posts} posts`}
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={isDeleting || !canDelete || !isReady}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
