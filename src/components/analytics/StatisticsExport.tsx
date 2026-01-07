/**
 * Statistics export functionality
 * Export analytics and statistics to various formats
 */

import { useState, useCallback } from "react";
import { Download, FileText, Image, Table, Calendar } from "lucide-react";

/**
 * Export format
 */
export enum StatisticsExportFormat {
  PDF = "pdf",
  CSV = "csv",
  JSON = "json",
  PNG = "png",
  Excel = "excel",
}

/**
 * Time period for export
 */
export enum TimePeriod {
  Day = "day",
  Week = "week",
  Month = "month",
  Quarter = "quarter",
  Year = "year",
  All = "all",
  Custom = "custom",
}

/**
 * Statistics data
 */
export interface StatisticsData {
  period: TimePeriod;
  startDate: Date;
  endDate: Date;
  reviewStats: {
    totalReviews: number;
    uniqueCards: number;
    averageRating: number;
    completionRate: number;
  };
  retentionStats: {
    retentionByInterval: Record<string, number>;
    averageRetention: number;
    fsrsMetrics: {
      stability: number;
      difficulty: number;
      retrievability: number;
    };
  };
  learningProgress: {
    cardsLearned: number;
    cardsMature: number;
    cardsYoung: number;
    totalStudyTime: number;
    streakDays: number;
  };
  categoryPerformance: Array<{
    category: string;
    totalCards: number;
    averageRetention: number;
    totalReviews: number;
  }>;
  timeSeriesData: Array<{
    date: string;
    reviews: number;
    retention: number;
    studyTime: number;
  }>;
}

/**
 * Export statistics to CSV
 */
export function exportStatisticsToCSV(
  data: StatisticsData,
  filename?: string
): void {
  let csv = "Period,Start Date,End Date\n";
  csv += `${data.period},${data.startDate.toISOString()},${data.endDate.toISOString()}\n\n`;

  // Review Statistics
  csv += "Review Statistics\n";
  csv += "Metric,Value\n";
  csv += `Total Reviews,${data.reviewStats.totalReviews}\n`;
  csv += `Unique Cards,${data.reviewStats.uniqueCards}\n`;
  csv += `Average Rating,${data.reviewStats.averageRating}\n`;
  csv += `Completion Rate,${data.reviewStats.completionRate}\n\n`;

  // Learning Progress
  csv += "Learning Progress\n";
  csv += "Metric,Value\n";
  csv += `Cards Learned,${data.learningProgress.cardsLearned}\n`;
  csv += `Cards Mature,${data.learningProgress.cardsMature}\n`;
  csv += `Cards Young,${data.learningProgress.cardsYoung}\n`;
  csv += `Total Study Time,${data.learningProgress.totalStudyTime}\n`;
  csv += `Streak Days,${data.learningProgress.streakDays}\n\n`;

  // Category Performance
  csv += "Category Performance\n";
  csv += "Category,Total Cards,Average Retention,Total Reviews\n";
  data.categoryPerformance.forEach((cat) => {
    csv += `"${cat.category}",${cat.totalCards},${cat.averageRetention},${cat.totalReviews}\n`;
  });
  csv += "\n";

  // Time Series Data
  csv += "Time Series Data\n";
  csv += "Date,Reviews,Retention,Study Time\n";
  data.timeSeriesData.forEach((row) => {
    csv += `${row.date},${row.reviews},${row.retention},${row.studyTime}\n`;
  });

  downloadFile(csv, filename || `statistics-${data.period}-${Date.now()}.csv`, "text/csv");
}

/**
 * Export statistics to JSON
 */
export function exportStatisticsToJSON(
  data: StatisticsData,
  filename?: string
): void {
  const json = JSON.stringify(data, null, 2);
  downloadFile(json, filename || `statistics-${data.period}-${Date.now()}.json`, "application/json");
}

/**
 * Export statistics to PNG (chart capture)
 */
export function exportStatisticsToPNG(
  element: HTMLElement,
  filename?: string
): void {
  // Use html2canvas or similar library
  // For now, create a simple canvas export
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Set canvas size
  canvas.width = 1200;
  canvas.height = 800;

  // Draw background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw title
  ctx.fillStyle = "#000000";
  ctx.font = "bold 24px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Statistics Report", canvas.width / 2, 50);

  // Draw period
  ctx.font = "16px Arial";
  ctx.fillText(
    `${data.period.toUpperCase()}: ${formatDate(data.startDate)} - ${formatDate(data.endDate)}`,
    canvas.width / 2,
    80
  );

  // Draw summary stats
  let y = 150;
  ctx.textAlign = "left";
  ctx.font = "18px Arial";

  ctx.fillText(`Total Reviews: ${data.reviewStats.totalReviews}`, 50, y);
  y += 30;
  ctx.fillText(`Unique Cards: ${data.reviewStats.uniqueCards}`, 50, y);
  y += 30;
  ctx.fillText(`Average Rating: ${data.reviewStats.averageRating.toFixed(2)}`, 50, y);
  y += 30;
  ctx.fillText(`Completion Rate: ${(data.reviewStats.completionRate * 100).toFixed(1)}%`, 50, y);
  y += 50;

  // Draw learning progress
  ctx.fillText("Learning Progress", 50, y);
  y += 30;
  ctx.fillText(`Cards Learned: ${data.learningProgress.cardsLearned}`, 70, y);
  y += 25;
  ctx.fillText(`Cards Mature: ${data.learningProgress.cardsMature}`, 70, y);
  y += 25;
  ctx.fillText(`Study Time: ${formatDuration(data.learningProgress.totalStudyTime)}`, 70, y);
  y += 25;
  ctx.fillText(`Streak: ${data.learningProgress.streakDays} days`, 70, y);

  // Export
  canvas.toBlob((blob) => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = filename || `statistics-${data.period}-${Date.now()}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    }
  });
}

/**
 * Export statistics to Excel format (HTML-based XLS)
 */
export function exportStatisticsToExcel(
  data: StatisticsData,
  filename?: string
): void {
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
    <head>
      <meta charset="UTF-8">
      <style>
        table { border-collapse: collapse; }
        td, th { border: 1px solid #ccc; padding: 8px; }
        th { background: #f0f0f0; font-weight: bold; }
        .header { font-size: 16px; font-weight: bold; margin-bottom: 10px; }
        .section { margin-top: 20px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header">Statistics Report - ${data.period.toUpperCase()}</div>
      <div>Period: ${formatDate(data.startDate)} to ${formatDate(data.endDate)}</div>

      <div class="section">Review Statistics</div>
      <table>
        <tr><th>Metric</th><th>Value</th></tr>
        <tr><td>Total Reviews</td><td>${data.reviewStats.totalReviews}</td></tr>
        <tr><td>Unique Cards</td><td>${data.reviewStats.uniqueCards}</td></tr>
        <tr><td>Average Rating</td><td>${data.reviewStats.averageRating.toFixed(2)}</td></tr>
        <tr><td>Completion Rate</td><td>${(data.reviewStats.completionRate * 100).toFixed(1)}%</td></tr>
      </table>

      <div class="section">Learning Progress</div>
      <table>
        <tr><th>Metric</th><th>Value</th></tr>
        <tr><td>Cards Learned</td><td>${data.learningProgress.cardsLearned}</td></tr>
        <tr><td>Cards Mature</td><td>${data.learningProgress.cardsMature}</td></tr>
        <tr><td>Cards Young</td><td>${data.learningProgress.cardsYoung}</td></tr>
        <tr><td>Total Study Time</td><td>${formatDuration(data.learningProgress.totalStudyTime)}</td></tr>
        <tr><td>Streak Days</td><td>${data.learningProgress.streakDays}</td></tr>
      </table>

      <div class="section">Category Performance</div>
      <table>
        <tr><th>Category</th><th>Total Cards</th><th>Average Retention</th><th>Total Reviews</th></tr>
        ${data.categoryPerformance.map(
          (cat) => `
          <tr>
            <td>${cat.category}</td>
            <td>${cat.totalCards}</td>
            <td>${cat.averageRetention.toFixed(2)}</td>
            <td>${cat.totalReviews}</td>
          </tr>
        `
        ).join("")}
      </table>

      <div class="section">Time Series Data</div>
      <table>
        <tr><th>Date</th><th>Reviews</th><th>Retention</th><th>Study Time</th></tr>
        ${data.timeSeriesData.map(
          (row) => `
          <tr>
            <td>${row.date}</td>
            <td>${row.reviews}</td>
            <td>${row.retention.toFixed(2)}</td>
            <td>${formatDuration(row.studyTime)}</td>
          </tr>
        `
        ).join("")}
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename || `statistics-${data.period}-${Date.now()}.xls`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Export statistics to PDF (via print)
 */
export function exportStatisticsToPDF(
  data: StatisticsData,
  filename?: string
): void {
  // Create a print-friendly HTML document
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Statistics Report - ${data.period}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #333; }
        h2 { color: #666; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background: #f5f5f5; }
        tr:nth-child(even) { background: #f9f9f9; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: #f5f5f5; padding: 15px; border-radius: 5px; flex: 1; }
        .metric-value { font-size: 24px; font-weight: bold; color: #333; }
        .metric-label { font-size: 12px; color: #666; }
        @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
      </style>
    </head>
    <body>
      <h1>Statistics Report</h1>
      <p><strong>Period:</strong> ${data.period.toUpperCase()}</p>
      <p><strong>Date Range:</strong> ${formatDate(data.startDate)} - ${formatDate(data.endDate)}</p>

      <h2>Review Statistics</h2>
      <div class="summary">
        <div class="metric">
          <div class="metric-value">${data.reviewStats.totalReviews}</div>
          <div class="metric-label">Total Reviews</div>
        </div>
        <div class="metric">
          <div class="metric-value">${data.reviewStats.uniqueCards}</div>
          <div class="metric-label">Unique Cards</div>
        </div>
        <div class="metric">
          <div class="metric-value">${data.reviewStats.averageRating.toFixed(2)}</div>
          <div class="metric-label">Average Rating</div>
        </div>
        <div class="metric">
          <div class="metric-value">${(data.reviewStats.completionRate * 100).toFixed(0)}%</div>
          <div class="metric-label">Completion Rate</div>
        </div>
      </div>

      <h2>Learning Progress</h2>
      <table>
        <tr><th>Metric</th><th>Value</th></tr>
        <tr><td>Cards Learned</td><td>${data.learningProgress.cardsLearned}</td></tr>
        <tr><td>Cards Mature</td><td>${data.learningProgress.cardsMature}</td></tr>
        <tr><td>Cards Young</td><td>${data.learningProgress.cardsYoung}</td></tr>
        <tr><td>Total Study Time</td><td>${formatDuration(data.learningProgress.totalStudyTime)}</td></tr>
        <tr><td>Current Streak</td><td>${data.learningProgress.streakDays} days</td></tr>
      </table>

      <h2>Category Performance</h2>
      <table>
        <tr><th>Category</th><th>Total Cards</th><th>Average Retention</th><th>Total Reviews</th></tr>
        ${data.categoryPerformance.map(
          (cat) => `
          <tr>
            <td>${cat.category}</td>
            <td>${cat.totalCards}</td>
            <td>${(cat.averageRetention * 100).toFixed(1)}%</td>
            <td>${cat.totalReviews}</td>
          </tr>
        `
        ).join("")}
      </table>

      <h2>Retention by Interval</h2>
      <table>
        <tr><th>Interval</th><th>Retention Rate</th></tr>
        ${Object.entries(data.retentionStats.retentionByInterval)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .map(
            ([interval, rate]) => `
            <tr>
              <td>${interval} days</td>
              <td>${(rate * 100).toFixed(1)}%</td>
            </tr>
          `
          ).join("")}
      </table>

      <script>
        setTimeout(() => { window.print(); }, 500);
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

/**
 * Helper function to download file
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format duration for display
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Statistics export button component
 */
export function StatisticsExportButton({ data }: { data: StatisticsData }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(
    async (format: StatisticsExportFormat) => {
      setIsExporting(true);
      try {
        switch (format) {
          case StatisticsExportFormat.CSV:
            exportStatisticsToCSV(data);
            break;
          case StatisticsExportFormat.JSON:
            exportStatisticsToJSON(data);
            break;
          case StatisticsExportFormat.PNG:
            exportStatisticsToPNG(data);
            break;
          case StatisticsExportFormat.Excel:
            exportStatisticsToExcel(data);
            break;
          case StatisticsExportFormat.PDF:
            exportStatisticsToPDF(data);
            break;
        }
        setIsOpen(false);
      } finally {
        setIsExporting(false);
      }
    },
    [data]
  );

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        <Download className="w-4 h-4" />
        {isExporting ? "Exporting..." : "Export"}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-20 bg-card border border-border rounded-lg shadow-lg min-w-48">
            <div className="p-1">
              <button
                onClick={() => handleExport(StatisticsExportFormat.CSV)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted rounded text-left"
              >
                <Table className="w-4 h-4" />
                Export as CSV
              </button>
              <button
                onClick={() => handleExport(StatisticsExportFormat.Excel)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted rounded text-left"
              >
                <Table className="w-4 h-4" />
                Export as Excel
              </button>
              <button
                onClick={() => handleExport(StatisticsExportFormat.JSON)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted rounded text-left"
              >
                <FileText className="w-4 h-4" />
                Export as JSON
              </button>
              <button
                onClick={() => handleExport(StatisticsExportFormat.PDF)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted rounded text-left"
              >
                <FileText className="w-4 h-4" />
                Export as PDF
              </button>
              <button
                onClick={() => handleExport(StatisticsExportFormat.PNG)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted rounded text-left"
              >
                <Image className="w-4 h-4" />
                Export as Image
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
