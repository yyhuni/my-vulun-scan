import type { CsvExportOptions } from "@/types/common.types"

export function exportToCsv<T>({ headers, data, filename, formatRow }: CsvExportOptions<T>) {
  if (data.length === 0) {
    throw new Error("No data to export.");
  }

  const csvHeaders = headers.map(h => h.label).join(",");

  const csvRows = data.map(item => {
    if (formatRow) {
      return formatRow(item).map(field => (
        (typeof field === 'string' && field.includes(',')) ? `"${field.replace(/"/g, '""')}"` : field
      )).join(",");
    } else {
      return headers.map(header => {
        const value = item[header.key];
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(",");
    }
  });

  const csvString = [csvHeaders, ...csvRows].join("\n");
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");

  if (link.download !== undefined) {
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } else {
    throw new Error("您的浏览器不支持自动下载。");
  }
} 