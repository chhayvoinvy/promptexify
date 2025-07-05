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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Upload,
  Code,
  FileSpreadsheet,
  Info,
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

  // New state for JSON execution and CSV import
  const [isJsonDialogOpen, setIsJsonDialogOpen] = useState(false);
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false);
  const [jsonExecuting, setJsonExecuting] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);

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

      // No FormData needed for generation action anymore
      const result = await runContentGenerationAction();

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

  // Execute JSON directly
  const executeJsonContent = async (jsonContent: string) => {
    if (!isReady) {
      toast.error("Security verification in progress. Please wait.");
      return;
    }

    try {
      setJsonExecuting(true);
      toast.info("Executing JSON content...");

      // Parse and validate JSON
      let parsedContent;
      try {
        parsedContent = JSON.parse(jsonContent);
      } catch {
        throw new Error("Invalid JSON format");
      }

      // Send to API
      const response = await fetch("/api/admin/automation/execute-json", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsedContent),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.details?.join(", ") || result.error || "Execution failed"
        );
      }

      toast.success(
        `JSON execution completed! ${result.filesProcessed || 0} items processed, ` +
          `${result.postsCreated || 0} posts created in ${result.duration || 0}s`
      );

      setIsJsonDialogOpen(false);
      await loadLogs();
    } catch (error) {
      console.error("Error executing JSON:", error);
      toast.error(
        error instanceof Error ? error.message : "JSON execution failed"
      );
    } finally {
      setJsonExecuting(false);
    }
  };

  // Import CSV file
  const importCsvFile = async (
    file: File,
    options: {
      delimiter?: string;
      skipEmptyLines?: boolean;
      maxRows?: number;
    } = {}
  ) => {
    if (!isReady) {
      toast.error("Security verification in progress. Please wait.");
      return;
    }

    try {
      setCsvImporting(true);
      toast.info("Importing CSV file...");

      // Create form data
      const formData = new FormData();
      formData.append("file", file);
      formData.append("delimiter", options.delimiter || ",");
      formData.append(
        "skipEmptyLines",
        options.skipEmptyLines !== false ? "true" : "false"
      );
      formData.append("maxRows", String(options.maxRows || 1000));

      // Send to API
      const response = await fetch("/api/admin/automation/import-csv", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.details?.join(", ") || result.error || "Import failed"
        );
      }

      // Show warnings if any
      if (result.parseWarnings && result.parseWarnings.length > 0) {
        result.parseWarnings.forEach((warning: string) => {
          toast.warning(warning);
        });
      }

      toast.success(
        `CSV import completed! ${result.filesProcessed || 0} items processed, ` +
          `${result.postsCreated || 0} posts created in ${result.duration || 0}s`
      );

      setIsCsvDialogOpen(false);
      await loadLogs();
    } catch (error) {
      console.error("Error importing CSV:", error);
      toast.error(error instanceof Error ? error.message : "CSV import failed");
    } finally {
      setCsvImporting(false);
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
            Generate content from JSON files, direct input, or CSV imports
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadFiles} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>

          {/* JSON Execution Dialog */}
          <Dialog open={isJsonDialogOpen} onOpenChange={setIsJsonDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Code className="h-4 w-4 mr-2" />
                Execute JSON
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Execute JSON Content</DialogTitle>
                <DialogDescription>
                  Paste JSON content to execute directly without file storage
                </DialogDescription>
              </DialogHeader>
              <JsonExecutionForm
                onSubmit={executeJsonContent}
                isExecuting={jsonExecuting}
              />
            </DialogContent>
          </Dialog>

          {/* CSV Import Dialog */}
          <Dialog open={isCsvDialogOpen} onOpenChange={setIsCsvDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Import CSV File</DialogTitle>
                <DialogDescription>
                  Upload a CSV file to convert and execute content
                </DialogDescription>
              </DialogHeader>
              <CsvImportForm
                onSubmit={importCsvFile}
                isImporting={csvImporting}
              />
            </DialogContent>
          </Dialog>

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

      {/* Main Content Tabs */}
      <Tabs defaultValue="files" className="space-y-6">
        <TabsList>
          <TabsTrigger value="files">Content Files</TabsTrigger>
          <TabsTrigger value="logs">Generation Logs</TabsTrigger>
          <TabsTrigger value="docs">Documentation</TabsTrigger>
        </TabsList>

        {/* Content Files Tab */}
        <TabsContent value="files">
          <Card>
            <CardHeader>
              <CardTitle>Content Files</CardTitle>
              <CardDescription>
                JSON files in the content/ directory
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
                          <CardTitle className="text-lg">
                            {file.category}
                          </CardTitle>
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
                                    <AlertDialogTitle>
                                      Delete File
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete{" "}
                                      {file.name}? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
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
                            <Badge variant="secondary">
                              {file.posts.length}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span>Tags:</span>
                            <Badge variant="secondary">
                              {file.tags.length}
                            </Badge>
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
        </TabsContent>

        {/* Generation Logs Tab */}
        <TabsContent value="logs">
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
                        const result = await clearGenerationLogsAction();
                        if (result.success) {
                          toast.success(
                            result.message || "Logs cleared successfully"
                          );
                          setLogs([]);
                        } else {
                          throw new Error(
                            result.error || "Failed to clear logs"
                          );
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
                              log.status === "success"
                                ? "default"
                                : "destructive"
                            }
                          >
                            {log.status}
                          </Badge>
                          <span className="text-sm font-medium">
                            {log.message}
                          </span>
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
        </TabsContent>

        {/* Documentation Tab */}
        <TabsContent value="docs">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  JSON Execution
                </CardTitle>
                <CardDescription>
                  Execute content directly from JSON input
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Format Example:</h4>
                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                    {`{
  "category": "ai-prompts",
  "tags": [
    {"name": "AI", "slug": "ai"},
    {"name": "Writing", "slug": "writing"}
  ],
  "posts": [
    {
      "title": "Creative Writing Prompt",
      "slug": "creative-writing-prompt",
      "description": "A prompt for creative writing",
      "content": "Write a story about...",
      "isPremium": false,
      "isPublished": false,
      "status": "PENDING_APPROVAL",
      "isFeatured": false,
      "featuredImage": ""
    }
  ]
}`}
                  </pre>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Features:</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Direct execution without file storage</li>
                    <li>• Supports single objects or arrays</li>
                    <li>• Real-time validation and feedback</li>
                    <li>• Size limit: 10MB</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  CSV Import
                </CardTitle>
                <CardDescription>Import content from CSV files</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Required Columns:</h4>
                  <ul className="text-sm space-y-1">
                    <li>
                      • <code>category</code> - Content category
                    </li>
                    <li>
                      • <code>title</code> - Post title
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Optional Columns:</h4>
                  <ul className="text-sm space-y-1">
                    <li>
                      • <code>description</code>, <code>content</code>
                    </li>
                    <li>
                      • <code>tag_name</code>, <code>tag_slug</code>
                    </li>
                    <li>
                      • <code>is_premium</code>, <code>is_published</code>
                    </li>
                    <li>
                      • <code>status</code>, <code>featured_image</code>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Limits:</h4>
                  <ul className="text-sm space-y-1">
                    <li>• File size: 10MB max</li>
                    <li>• Rows: 1000 max</li>
                    <li>• Format: .csv files only</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

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

// JSON Execution Form Component
function JsonExecutionForm({
  onSubmit,
  isExecuting,
}: {
  onSubmit: (jsonContent: string) => void;
  isExecuting: boolean;
}) {
  const [jsonContent, setJsonContent] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleJsonChange = (value: string) => {
    setJsonContent(value);
    try {
      if (value.trim()) {
        JSON.parse(value);
        setJsonError(null);
      }
    } catch {
      setJsonError("Invalid JSON format");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jsonError && jsonContent.trim()) {
      onSubmit(jsonContent);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="json-content">JSON Content</Label>
        <Textarea
          id="json-content"
          value={jsonContent}
          onChange={(e) => handleJsonChange(e.target.value)}
          placeholder="Paste your JSON content here..."
          className="min-h-[400px] font-mono text-sm"
        />
        {jsonError && <p className="text-sm text-red-600 mt-1">{jsonError}</p>}
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Info className="h-4 w-4" />
        <span>Supports both single objects and arrays. Max size: 10MB</span>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="submit"
          disabled={!jsonContent.trim() || !!jsonError || isExecuting}
        >
          {isExecuting ? "Executing..." : "Execute JSON"}
        </Button>
      </div>
    </form>
  );
}

// CSV Import Form Component
function CsvImportForm({
  onSubmit,
  isImporting,
}: {
  onSubmit: (file: File, options: any) => void;
  isImporting: boolean;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [delimiter, setDelimiter] = useState(",");
  const [skipEmptyLines, setSkipEmptyLines] = useState(true);
  const [maxRows, setMaxRows] = useState(1000);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.toLowerCase().endsWith(".csv")) {
      setSelectedFile(file);
    } else {
      toast.error("Please select a CSV file");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFile) {
      onSubmit(selectedFile, {
        delimiter,
        skipEmptyLines,
        maxRows,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="csv-file">CSV File</Label>
        <Input
          id="csv-file"
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          required
        />
        {selectedFile && (
          <p className="text-sm text-muted-foreground mt-1">
            Selected: {selectedFile.name} (
            {(selectedFile.size / 1024).toFixed(1)} KB)
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="delimiter">Delimiter</Label>
          <Input
            id="delimiter"
            value={delimiter}
            onChange={(e) => setDelimiter(e.target.value)}
            placeholder=","
            maxLength={1}
          />
        </div>
        <div>
          <Label htmlFor="maxRows">Max Rows</Label>
          <Input
            id="maxRows"
            type="number"
            value={maxRows}
            onChange={(e) => setMaxRows(parseInt(e.target.value) || 1000)}
            min={1}
            max={10000}
          />
        </div>
        <div className="flex items-center space-x-2 pt-6">
          <input
            type="checkbox"
            id="skipEmptyLines"
            checked={skipEmptyLines}
            onChange={(e) => setSkipEmptyLines(e.target.checked)}
          />
          <Label htmlFor="skipEmptyLines" className="text-sm">
            Skip empty lines
          </Label>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Info className="h-4 w-4" />
        <span>Required columns: category, title. Max file size: 10MB</span>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={!selectedFile || isImporting}>
          {isImporting ? "Importing..." : "Import CSV"}
        </Button>
      </div>
    </form>
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
