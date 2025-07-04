"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Play,
  Plus,
  FileText,
  MoreVertical,
  Edit,
  Trash2,
  Download,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useCSRFForm } from "@/hooks/use-csrf";
import {
  getContentFilesAction,
  createContentFileAction,
  updateContentFileAction,
  deleteContentFileAction,
  runContentGenerationAction,
  getGenerationLogsAction,
  clearGenerationLogsAction,
} from "@/actions";

interface ContentFile {
  name: string;
  category: string;
  tags: Array<{ name: string; slug: string }>;
  posts: Array<{
    title: string;
    slug: string;
    description: string;
    content: string;
    isPremium: boolean;
    isPublished: boolean;
    status: "APPROVED" | "PENDING" | "REJECTED";
    isFeatured: boolean;
    featuredImage?: string;
  }>;
}

interface GenerationLog {
  id: string;
  timestamp: string;
  status: "success" | "error";
  message: string;
  filesProcessed?: number;
  postsCreated?: number;
  statusMessages?: string[];
  error?: string;
  userId?: string;
  severity: string;
}

interface GetFilesResponse {
  files: ContentFile[];
}

interface GetLogsResponse {
  logs: GenerationLog[];
}

interface GenerationResponse {
  message: string;
  duration: number;
  filesProcessed: number;
  postsCreated: number;
  statusMessages: string[];
  output: string;
}

export function AutomationDashboard() {
  const [files, setFiles] = useState<ContentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [logs, setLogs] = useState<GenerationLog[]>([]);
  const [selectedFile, setSelectedFile] = useState<ContentFile | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { createFormDataWithCSRF, isReady } = useCSRFForm();

  // Load content files
  const loadFiles = async () => {
    try {
      setLoading(true);
      const result = await getContentFilesAction();
      if (result.success) {
        const data = result.data as GetFilesResponse;
        setFiles(data?.files || []);
      } else {
        throw new Error(result.error || "Failed to load files");
      }
    } catch (error) {
      console.error("Error loading files:", error);
      toast.error("Failed to load content files");
    } finally {
      setLoading(false);
    }
  };

  // Load generation logs
  const loadLogs = async () => {
    try {
      const result = await getGenerationLogsAction();
      if (result.success) {
        const data = result.data as GetLogsResponse;
        setLogs(data?.logs || []);
      } else {
        throw new Error(result.error || "Failed to load logs");
      }
    } catch (error) {
      console.error("Error loading logs:", error);
    }
  };

  // Run content generation
  const runGeneration = async () => {
    if (!isReady) {
      toast.error("Security verification in progress. Please wait.");
      return;
    }

    try {
      setGenerating(true);
      toast.info("Starting automated content seed...");

      // Create FormData with CSRF token for the generation action
      const formData = createFormDataWithCSRF({});
      const result = await runContentGenerationAction(formData);

      if (result.success) {
        const data = result.data as GenerationResponse;

        // Show detailed status messages
        if (data?.statusMessages && data.statusMessages.length > 0) {
          // Show key status messages as toasts
          const completedMessage = data.statusMessages.find((msg: string) =>
            msg.includes("🎉 Automated content seeding completed")
          );
          const filesFoundMessage = data.statusMessages.find((msg: string) =>
            msg.includes("📁 Found")
          );

          if (filesFoundMessage) {
            toast.info(filesFoundMessage);
          }

          if (completedMessage) {
            toast.success(completedMessage);
          }
        }

        toast.success(
          `Content generation completed! ` +
            `${data?.filesProcessed || 0} files processed, ` +
            `${data?.postsCreated || 0} posts created in ${
              data?.duration || 0
            }s`
        );

        // Reload logs to show the latest generation
        await loadLogs();
      } else {
        throw new Error(result.error || "Generation failed");
      }
    } catch (error) {
      console.error("Error running generation:", error);
      toast.error("Content generation failed");
    } finally {
      setGenerating(false);
    }
  };

  // Delete file
  const deleteFile = async (fileName: string) => {
    if (!isReady) {
      toast.error("Security verification in progress. Please wait.");
      return;
    }

    try {
      const formData = createFormDataWithCSRF({ fileName });

      const result = await deleteContentFileAction(formData);

      if (result.success) {
        toast.success("File deleted successfully");
        await loadFiles();
      } else {
        throw new Error(result.error || "Failed to delete file");
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Failed to delete file");
    }
  };

  // Create new file
  const createFile = async (
    fileData: Omit<ContentFile, "name">,
    setLoading?: (loading: boolean) => void
  ) => {
    if (!isReady) {
      toast.error("Security verification in progress. Please wait.");
      return;
    }

    try {
      setLoading?.(true);
      const fileName = `${fileData.category}-prompts.json`;

      const formData = createFormDataWithCSRF({
        fileName,
        category: fileData.category,
        tags: JSON.stringify(fileData.tags),
        posts: JSON.stringify(fileData.posts),
      });

      const result = await createContentFileAction(formData);

      if (result.success) {
        toast.success("File created successfully");
        setIsCreateDialogOpen(false);
        await loadFiles();
      } else {
        throw new Error(result.error || "Failed to create file");
      }
    } catch (error) {
      console.error("Error creating file:", error);
      toast.error("Failed to create file");
    } finally {
      setLoading?.(false);
    }
  };

  // Update file
  const updateFile = async (
    fileName: string,
    fileData: Omit<ContentFile, "name">,
    setLoading?: (loading: boolean) => void
  ) => {
    if (!isReady) {
      toast.error("Security verification in progress. Please wait.");
      return;
    }

    try {
      setLoading?.(true);

      const formData = createFormDataWithCSRF({
        fileName,
        category: fileData.category,
        tags: JSON.stringify(fileData.tags),
        posts: JSON.stringify(fileData.posts),
      });

      const result = await updateContentFileAction(formData);

      if (result.success) {
        toast.success("File updated successfully");
        setIsEditDialogOpen(false);
        setSelectedFile(null);
        await loadFiles();
      } else {
        throw new Error(result.error || "Failed to update file");
      }
    } catch (error) {
      console.error("Error updating file:", error);
      toast.error("Failed to update file");
    } finally {
      setLoading?.(false);
    }
  };

  useEffect(() => {
    loadFiles();
    loadLogs();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Content Automation
          </h1>
          <p className="text-muted-foreground">
            Manage JSON content files and generate posts automatically
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadFiles} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New File
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Content File</DialogTitle>
                <DialogDescription>
                  Create a new JSON file for content generation
                </DialogDescription>
              </DialogHeader>
              <CreateFileForm
                onSubmit={(data, setLoading) => createFile(data, setLoading)}
              />
            </DialogContent>
          </Dialog>
          <Button onClick={runGeneration} disabled={generating}>
            <Play className="h-4 w-4 mr-2" />
            {generating ? "Generating..." : "Run Generation"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Files</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{files.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {files.reduce((acc, file) => acc + file.posts.length, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(files.map((f) => f.category)).size}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Last Generation
            </CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {logs.length > 0
                ? new Date(logs[0].timestamp).toLocaleDateString()
                : "Never"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Files */}
      <Card>
        <CardHeader>
          <CardTitle>Content Files</CardTitle>
          <CardDescription>
            JSON files in the automate/seeds directory
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading files...</div>
          ) : files.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No content files found. Create your first file to get started.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {files.map((file) => (
                <Card key={file.name} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{file.category}</CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedFile(file);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              const dataStr = JSON.stringify(file, null, 2);
                              const dataBlob = new Blob([dataStr], {
                                type: "application/json",
                              });
                              const url = URL.createObjectURL(dataBlob);
                              const link = document.createElement("a");
                              link.href = url;
                              link.download = file.name;
                              link.click();
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete File</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {file.name}?
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteFile(file.name)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <CardDescription>{file.name}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Posts:</span>
                        <Badge variant="secondary">{file.posts.length}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Tags:</span>
                        <Badge variant="secondary">{file.tags.length}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {file.tags.slice(0, 3).map((tag) => (
                          <Badge
                            key={tag.slug}
                            variant="outline"
                            className="text-xs"
                          >
                            {tag.name}
                          </Badge>
                        ))}
                        {file.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{file.tags.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generation Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Generation Logs</CardTitle>
              <CardDescription>
                Recent content generation activity
              </CardDescription>
            </div>
            {logs.length > 0 && (
              <Button
                onClick={async () => {
                  if (!isReady) {
                    toast.error(
                      "Security verification in progress. Please wait."
                    );
                    return;
                  }

                  try {
                    // Create FormData with CSRF token for the clear logs action
                    const formData = createFormDataWithCSRF({});
                    const result = await clearGenerationLogsAction(formData);
                    if (result.success) {
                      toast.success(
                        result.message || "Logs cleared successfully"
                      );
                      setLogs([]);
                    } else {
                      throw new Error(result.error || "Failed to clear logs");
                    }
                  } catch (error) {
                    console.error("Error clearing logs:", error);
                    toast.error("Failed to clear logs");
                  }
                }}
                variant="outline"
                size="sm"
                disabled={!isReady}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Logs
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No generation logs yet. Run your first generation to see logs
              here.
            </div>
          ) : (
            <div className="space-y-3">
              {logs.slice(0, 10).map((log, index) => (
                <Card key={index} className="p-4 gap-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          log.status === "success" ? "default" : "destructive"
                        }
                      >
                        {log.status}
                      </Badge>
                      <span className="text-sm font-medium">{log.message}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>

                  {/* Show error details if available */}
                  {log.status === "error" && log.error && (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded mt-2">
                      {log.error}
                    </div>
                  )}

                  {/* Show status messages if available */}
                  {log.statusMessages && log.statusMessages.length > 0 && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        View detailed status ({log.statusMessages.length}{" "}
                        messages)
                      </summary>
                      <div className="space-y-1 pl-4 border-l-2 border-muted">
                        {log.statusMessages.map((msg, msgIndex) => (
                          <div key={msgIndex} className="text-xs font-mono">
                            {msg}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {selectedFile && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Content File</DialogTitle>
              <DialogDescription>
                Edit the content file: {selectedFile.name}
              </DialogDescription>
            </DialogHeader>
            <CreateFileForm
              initialData={selectedFile}
              onSubmit={(data, setLoading) =>
                updateFile(selectedFile.name, data, setLoading)
              }
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Create/Edit File Form Component
function CreateFileForm({
  initialData,
  onSubmit,
}: {
  initialData?: ContentFile;
  onSubmit: (
    data: Omit<ContentFile, "name">,
    setLoading: (loading: boolean) => void
  ) => void;
}) {
  const defaultData = {
    category: "",
    tags: [{ name: "", slug: "" }],
    posts: [
      {
        title: "",
        slug: "",
        description: "",
        content: "",
        isPremium: false,
        isPublished: false,
        status: "PENDING_APPROVAL" as const,
        isFeatured: false,
        featuredImage: "",
        featuredVideo: "",
      },
    ],
  };

  const [jsonContent, setJsonContent] = useState(() => {
    const data = initialData || defaultData;
    return JSON.stringify(data, null, 2);
  });
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleJsonChange = (value: string) => {
    setJsonContent(value);
    try {
      JSON.parse(value);
      setJsonError(null);
    } catch {
      setJsonError("Invalid JSON format");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsedData = JSON.parse(jsonContent);
      onSubmit(parsedData, setIsSubmitting);
    } catch {
      setJsonError("Invalid JSON format");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 max-h-[70vh] overflow-y-auto"
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="json-editor">Content JSON</Label>
          <div className="text-xs text-muted-foreground">
            Edit the JSON structure directly. Include category, tags, and posts.
          </div>
        </div>
        <Textarea
          id="json-editor"
          value={jsonContent}
          onChange={(e) => handleJsonChange(e.target.value)}
          placeholder="Enter JSON content..."
          className={`font-mono text-sm min-h-[400px] ${
            jsonError ? "border-red-500" : ""
          }`}
          required
        />
        {jsonError && (
          <div className="text-sm text-red-500 flex items-center gap-1">
            <span>⚠️</span>
            {jsonError}
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={!!jsonError || isSubmitting}>
          {isSubmitting ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              {initialData ? "Updating..." : "Creating..."}
            </>
          ) : initialData ? (
            "Update File"
          ) : (
            "Create File"
          )}
        </Button>
      </div>
    </form>
  );
}
