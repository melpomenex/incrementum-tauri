import { useState, useEffect } from "react";
import { X, Download, FileJson, FileSpreadsheet, Loader2, CheckCircle2 } from "lucide-react";
import { exportQueue, type QueueExportItem } from "../../api/queue";

interface ExportQueueDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportQueueDialog({ isOpen, onClose }: ExportQueueDialogProps) {
  const [exportData, setExportData] = useState<QueueExportItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      handleExport();
    }
  }, [isOpen]);

  const handleExport = async () => {
    setIsLoading(true);
    setError(null);
    setExportData([]);

    try {
      const data = await exportQueue();
      setExportData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export queue");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadAsJson = () => {
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `queue-export-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExportSuccess("Downloaded as JSON");
    setTimeout(() => setExportSuccess(null), 2000);
  };

  const downloadAsCsv = () => {
    if (exportData.length === 0) return;

    const headers = [
      "Document Title",
      "Type",
      "Question",
      "Answer",
      "Due Date",
      "State",
      "Interval",
      "Tags",
      "Category",
    ];

    const rows = exportData.map((item) => [
      `"${item.document_title.replace(/"/g, '""')}"`,
      `"${item.item_type}"`,
      `"${item.question.replace(/"/g, '""')}"`,
      `"${(item.answer || "").replace(/"/g, '""')}"`,
      `"${item.due_date || ""}"`,
      `"${item.state}"`,
      `"${item.interval}"`,
      `"${item.tags.join("; ")}"`,
      `"${(item.category || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const dataBlob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `queue-export-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExportSuccess("Downloaded as CSV");
    setTimeout(() => setExportSuccess(null), 2000);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const getRowClass = (state: string) => {
    switch (state) {
      case "New":
        return "bg-blue-500/10 text-blue-500";
      case "Learning":
        return "bg-yellow-500/10 text-yellow-500";
      case "Review":
        return "bg-green-500/10 text-green-500";
      case "Suspended":
        return "bg-gray-500/10 text-gray-500";
      default:
        return "";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              Export Queue
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-muted-foreground">Exporting queue data...</p>
              </div>
            </div>
          ) : error ? (
            <div className="p-4 bg-destructive/10 border border-destructive text-destructive rounded-lg">
              Failed to export queue: {error}
            </div>
          ) : exportData.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Queue is empty
              </h3>
              <p className="text-muted-foreground">
                There are no items in your queue to export
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total items</p>
                    <p className="text-2xl font-bold text-foreground">{exportData.length}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={downloadAsJson}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity flex items-center gap-2"
                      title="Download as JSON"
                    >
                      <FileJson className="w-4 h-4" />
                      JSON
                    </button>
                    <button
                      onClick={downloadAsCsv}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity flex items-center gap-2"
                      title="Download as CSV"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      CSV
                    </button>
                  </div>
                </div>
                {exportSuccess && (
                  <div className="flex items-center gap-2 mt-3 text-green-500">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm">{exportSuccess}</span>
                  </div>
                )}
              </div>

              {/* Export Data Table */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-foreground">Document</th>
                        <th className="px-4 py-2 text-left font-medium text-foreground">Type</th>
                        <th className="px-4 py-2 text-left font-medium text-foreground">Question</th>
                        <th className="px-4 py-2 text-left font-medium text-foreground">State</th>
                        <th className="px-4 py-2 text-left font-medium text-foreground">Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {exportData.map((item) => (
                        <tr key={item.id} className="hover:bg-muted/50">
                          <td className="px-4 py-2 text-foreground">
                            {item.document_title}
                          </td>
                          <td className="px-4 py-2">
                            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
                              {item.item_type}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-foreground max-w-md truncate">
                            {item.question}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 rounded text-xs ${getRowClass(item.state)}`}>
                              {item.state}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">
                            {formatDate(item.due_date)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-4 gap-4">
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">New</p>
                  <p className="text-lg font-semibold text-blue-500">
                    {exportData.filter((i) => i.state === "New").length}
                  </p>
                </div>
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Learning</p>
                  <p className="text-lg font-semibold text-yellow-500">
                    {exportData.filter((i) => i.state === "Learning").length}
                  </p>
                </div>
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Review</p>
                  <p className="text-lg font-semibold text-green-500">
                    {exportData.filter((i) => i.state === "Review").length}
                  </p>
                </div>
                <div className="p-3 bg-gray-500/10 border border-gray-500/20 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Suspended</p>
                  <p className="text-lg font-semibold text-gray-500">
                    {exportData.filter((i) => i.state === "Suspended").length}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-card border border-border text-foreground rounded-md hover:bg-muted transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
