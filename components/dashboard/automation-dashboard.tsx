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
  Play,
  Trash2,
  RefreshCw,
  Code,
  FileSpreadsheet,
} from "@/components/ui/icons";
import { toast } from "sonner";
import { useCSRFForm } from "@/hooks/use-csrf";
import { getGenerationLogsAction, clearGenerationLogsAction } from "@/actions";

// New type for presigned URL response
interface PresignedUrlResponse {
  url: string;
  fileUrl: string; // The URL of the file after upload
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

interface GetLogsResponse {
  logs: GenerationLog[];
}

interface CsvImportOptions {
  delimiter: string;
  skipEmptyLines: boolean;
  maxRows: number;
}

export function AutomationDashboard() {
  const [logs, setLogs] = useState<GenerationLog[]>([]);

  // New state for JSON execution and CSV import
  const [isJsonDialogOpen, setIsJsonDialogOpen] = useState(false);
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false);
  const [jsonExecuting, setJsonExecuting] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);

  const { isReady, getHeadersWithCSRF } = useCSRFForm();

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
      toast.error("Failed to load logs");
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

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
        headers: await getHeadersWithCSRF({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(parsedContent),
        credentials: "same-origin",
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

  // New function to handle large file uploads
  const importLargeCsvFile = async (file: File, options: CsvImportOptions) => {
    if (!isReady) {
      toast.error("Security verification in progress. Please wait.");
      return;
    }

    setCsvImporting(true);
    const toastId = toast.loading(
      `Starting upload for ${file.name}. Please keep this browser tab open.`
    );

    try {
      // 1. Get a pre-signed URL from our server
      toast.info("Requesting secure upload URL...");
      const presignedUrlResponse = await fetch("/api/upload/presigned-url", {
        method: "POST",
        headers: await getHeadersWithCSRF({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
        }),
        credentials: "same-origin",
      });

      const { url: presignedUrl, fileUrl } =
        (await presignedUrlResponse.json()) as PresignedUrlResponse;

      if (!presignedUrlResponse.ok) {
        throw new Error("Could not get a secure upload URL.");
      }

      // 2. Upload the file directly to S3 using the pre-signed URL
      toast.info(`Uploading ${file.name}...`);
      const uploadResponse = await fetch(presignedUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload file to storage.`);
      }

      // 3. Notify the server to start processing the file
      toast.success("Upload complete! Starting processing...");
      const processResponse = await fetch(
        "/api/admin/automation/start-processing",
        {
          method: "POST",
          headers: await getHeadersWithCSRF({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            fileUrl,
            fileName: file.name,
            ...options,
          }),
          credentials: "same-origin",
        }
      );

      const result = await processResponse.json();

      if (!processResponse.ok) {
        throw new Error(result.error || "Failed to start processing.");
      }

      toast.success(
        `Job ${result.jobId} started successfully for ${file.name}. You can monitor its progress here.`
      );

      setIsCsvDialogOpen(false);
      await loadLogs(); // To show the new job in the logs
    } catch (error) {
      console.error("Error importing large CSV:", error);
      toast.error(
        error instanceof Error ? error.message : "CSV import failed."
      );
    } finally {
      setCsvImporting(false);
      toast.dismiss(toastId);
    }
  };

  // Helper function to generate compact JSON example
  const getCompactJsonExample = () => {
    const example = {
      category: "ai-prompts",
      tags: [
        { name: "AI", slug: "ai" },
        { name: "Writing", slug: "writing" },
      ],
      posts: [
        {
          title: "Creative Writing Prompt",
          slug: "creative-writing-prompt",
          description: "A prompt for creative writing",
          content: "Write a story about...",
          isPremium: false,
          isPublished: false,
          status: "PENDING_APPROVAL",
          isFeatured: false,
          featuredImage: "",
        },
      ],
    };

    return JSON.stringify(example, null, 2);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Content Automation
          </h1>
          <p className="text-muted-foreground">
            Execute content from direct JSON input or CSV imports
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadLogs} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Logs
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
                onSubmit={importLargeCsvFile}
                isImporting={csvImporting}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
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
      <Tabs defaultValue="logs" className="space-y-6">
        <TabsList>
          <TabsTrigger value="logs">Generation Logs</TabsTrigger>
          <TabsTrigger value="docs">Documentation</TabsTrigger>
        </TabsList>

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
                    {getCompactJsonExample()}
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
  const [isValidJson, setIsValidJson] = useState(true);

  const handleJsonChange = (value: string) => {
    setJsonContent(value);
    try {
      JSON.parse(value);
      setIsValidJson(true);
    } catch {
      if (value.trim() === "") {
        setIsValidJson(true);
      } else {
        setIsValidJson(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValidJson && jsonContent.trim() !== "") {
      onSubmit(jsonContent);
    } else {
      toast.error("Invalid or empty JSON. Please correct it.");
    }
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(jsonContent);
      const formatted = JSON.stringify(parsed, null, 2);
      setJsonContent(formatted);
      setIsValidJson(true);
    } catch {
      toast.error("Cannot format invalid JSON.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid flex-1 gap-2">
        <Label htmlFor="json-input">JSON Content</Label>
        <Textarea
          id="json-input"
          value={jsonContent}
          onChange={(e) => handleJsonChange(e.target.value)}
          rows={15}
          className={`font-mono ${!isValidJson ? "border-red-500" : ""} max-h-[60vh] overflow-y-auto`}
          placeholder={`{\n  "category": "example",\n  "tags": [],\n  "posts": []\n}`}
        />
        {!isValidJson && (
          <p className="text-xs text-red-600">
            Invalid JSON format. Please check your syntax.
          </p>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={formatJson}>
          Format JSON
        </Button>
        <Button type="submit" disabled={isExecuting || !isValidJson}>
          {isExecuting ? "Executing..." : "Execute"}
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
  onSubmit: (file: File, options: CsvImportOptions) => void;
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
      <div className="grid w-full max-w-sm items-center gap-1.5">
        <Label htmlFor="csv-file">CSV File</Label>
        <Input
          id="csv-file"
          type="file"
          accept=".csv"
          onChange={handleFileChange}
        />
        {selectedFile && (
          <p className="text-sm text-muted-foreground">
            Selected: {selectedFile.name}
          </p>
        )}
      </div>

      <details className="space-y-4 pt-2">
        <summary className="cursor-pointer text-sm font-medium">
          Advanced Options
        </summary>
        <div className="grid gap-4 sm:grid-cols-2 pt-2">
          <div className="space-y-2">
            <Label htmlFor="delimiter">Delimiter</Label>
            <Input
              id="delimiter"
              value={delimiter}
              onChange={(e) => setDelimiter(e.target.value)}
              maxLength={1}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxRows">Max Rows</Label>
            <Input
              id="maxRows"
              type="number"
              value={maxRows}
              onChange={(e) => setMaxRows(Number(e.target.value))}
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="skipEmptyLines"
              checked={skipEmptyLines}
              onChange={(e) => setSkipEmptyLines(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />

            <Label htmlFor="skipEmptyLines" className="text-sm font-normal">
              Skip empty lines
            </Label>
          </div>
        </div>
      </details>

      <div className="flex justify-end">
        <Button type="submit" disabled={isImporting || !selectedFile}>
          {isImporting ? "Importing..." : "Import and Execute"}
        </Button>
      </div>
    </form>
  );
}
