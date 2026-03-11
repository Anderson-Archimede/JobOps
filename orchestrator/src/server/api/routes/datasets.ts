/**
 * Datasets API routes
 * Handles dataset management, import, export, and preview
 */

import type {
  Dataset,
  DatasetExportRequest,
  DatasetPreview,
  DatasetStats,
  DatasetType,
} from "@shared/types/dataset";
import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs/promises";
import { db } from "../../db";
import { datasets } from "../../db/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { nanoid } from "nanoid";

const router = Router();

// Configure multer for file uploads
const uploadsDir = path.join(process.cwd(), "uploads", "datasets");
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${nanoid(8)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [".csv", ".json", ".xlsx", ".xls"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: ${allowedTypes.join(", ")}`));
    }
  },
});

// Helper: Parse uploaded file and extract data
async function parseDatasetFile(
  filePath: string,
  mimeType: string
): Promise<{ rows: Record<string, unknown>[]; columns: string[] }> {
  const content = await fs.readFile(filePath, "utf-8");

  if (mimeType === "text/csv" || filePath.endsWith(".csv")) {
    const parsed = Papa.parse<Record<string, unknown>>(content, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
    });
    return {
      rows: parsed.data,
      columns: parsed.meta.fields || [],
    };
  }

  if (mimeType === "application/json" || filePath.endsWith(".json")) {
    const data = JSON.parse(content);
    const rows = Array.isArray(data) ? data : [data];
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    return { rows, columns };
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    filePath.endsWith(".xlsx") ||
    filePath.endsWith(".xls")
  ) {
    const buffer = await fs.readFile(filePath);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    return { rows, columns };
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}

// Helper: Calculate column statistics
function calculateColumnStats(
  rows: Record<string, unknown>[],
  columnName: string
) {
  const values = rows.map((row) => row[columnName]).filter((v) => v != null);
  const numericValues = values.filter((v) => typeof v === "number") as number[];

  if (numericValues.length > 0) {
    return {
      min: Math.min(...numericValues),
      max: Math.max(...numericValues),
      avg: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
      unique: new Set(values).size,
      nullCount: rows.length - values.length,
    };
  }

  return {
    unique: new Set(values).size,
    nullCount: rows.length - values.length,
  };
}

// GET /api/datasets - List all datasets
router.get("/", async (_req, res) => {
  try {
    const allDatasets = await db
      .select({
        id: datasets.id,
        name: datasets.name,
        type: datasets.type,
        description: datasets.description,
        rowCount: datasets.rowCount,
        sizeBytes: datasets.sizeBytes,
        mimeType: datasets.mimeType,
        createdAt: datasets.createdAt,
        updatedAt: datasets.updatedAt,
      })
      .from(datasets)
      .orderBy(desc(datasets.updatedAt));

    res.json({
      ok: true,
      datasets: allDatasets.map((d) => ({
        ...d,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error fetching datasets:", error);
    res.status(500).json({
      ok: false,
      error: { code: "FETCH_ERROR", message: "Failed to fetch datasets" },
    });
  }
});

// GET /api/datasets/stats - Get dataset statistics
router.get("/stats", async (_req, res) => {
  try {
    const allDatasets = await db.select().from(datasets);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const stats: DatasetStats = {
      totalCount: allDatasets.length,
      byType: {
        job_postings: 0,
        cv_versions: 0,
        applications: 0,
        custom: 0,
      },
      totalSize: 0,
      recentlyUpdated: 0,
    };

    for (const dataset of allDatasets) {
      stats.byType[dataset.type as DatasetType] =
        (stats.byType[dataset.type as DatasetType] || 0) + 1;
      stats.totalSize += dataset.sizeBytes;
      if (dataset.updatedAt >= sevenDaysAgo) {
        stats.recentlyUpdated++;
      }
    }

    res.json({ ok: true, stats });
  } catch (error) {
    console.error("Error fetching dataset stats:", error);
    res.status(500).json({
      ok: false,
      error: { code: "STATS_ERROR", message: "Failed to fetch statistics" },
    });
  }
});

// GET /api/datasets/:id - Get dataset details
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const dataset = await db.query.datasets.findFirst({
      where: eq(datasets.id, id),
    });

    if (!dataset) {
      return res.status(404).json({
        ok: false,
        error: { code: "NOT_FOUND", message: "Dataset not found" },
      });
    }

    res.json({
      ok: true,
      dataset: {
        ...dataset,
        createdAt: dataset.createdAt.toISOString(),
        updatedAt: dataset.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching dataset:", error);
    res.status(500).json({
      ok: false,
      error: { code: "FETCH_ERROR", message: "Failed to fetch dataset" },
    });
  }
});

// GET /api/datasets/:id/preview - Preview first 10 rows
router.get("/:id/preview", async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    const dataset = await db.query.datasets.findFirst({
      where: eq(datasets.id, id),
    });

    if (!dataset) {
      return res.status(404).json({
        ok: false,
        error: { code: "NOT_FOUND", message: "Dataset not found" },
      });
    }

    let rows: Record<string, unknown>[] = [];
    let columns: string[] = [];

    if (dataset.data) {
      const allRows = dataset.data as Record<string, unknown>[];
      rows = allRows.slice(offset, offset + limit);
      columns = allRows.length > 0 ? Object.keys(allRows[0]) : [];
    } else if (dataset.filePath) {
      const parsed = await parseDatasetFile(
        dataset.filePath,
        dataset.mimeType || ""
      );
      rows = parsed.rows.slice(offset, offset + limit);
      columns = parsed.columns;
    }

    const preview: DatasetPreview = {
      columns,
      rows,
      totalRows: dataset.rowCount,
    };

    res.json({ ok: true, preview });
  } catch (error) {
    console.error("Error previewing dataset:", error);
    res.status(500).json({
      ok: false,
      error: { code: "PREVIEW_ERROR", message: "Failed to preview dataset" },
    });
  }
});

// POST /api/datasets/import - Import dataset
router.post("/import", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        error: { code: "NO_FILE", message: "No file provided" },
      });
    }

    const { name, type, description } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "MISSING_FIELDS",
          message: "Name and type are required",
        },
      });
    }

    const filePath = req.file.path;
    const mimeType = req.file.mimetype;
    const sizeBytes = req.file.size;

    const { rows, columns } = await parseDatasetFile(filePath, mimeType);

    const columnDefs = columns.map((col) => ({
      name: col,
      type: "string" as const,
      stats: calculateColumnStats(rows, col),
    }));

    const datasetId = nanoid();

    const storeData = rows.length <= 1000;

    await db.insert(datasets).values({
      id: datasetId,
      name,
      type,
      description: description || null,
      rowCount: rows.length,
      sizeBytes,
      filePath: storeData ? null : filePath,
      mimeType,
      data: storeData ? rows : null,
      columns: columnDefs,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (storeData) {
      await fs.unlink(filePath).catch(console.error);
    }

    res.json({
      ok: true,
      dataset: {
        id: datasetId,
        name,
        type,
        rowCount: rows.length,
        sizeBytes,
      },
    });
  } catch (error) {
    console.error("Error importing dataset:", error);
    if (req.file) {
      await fs.unlink(req.file.path).catch(console.error);
    }
    res.status(500).json({
      ok: false,
      error: {
        code: "IMPORT_ERROR",
        message: error instanceof Error ? error.message : "Import failed",
      },
    });
  }
});

// GET /api/datasets/:id/export - Export dataset
router.get("/:id/export", async (req, res) => {
  try {
    const { id } = req.params;
    const format = (req.query.format as string) || "csv";
    const selectedColumns = req.query.columns
      ? (req.query.columns as string).split(",")
      : null;

    const dataset = await db.query.datasets.findFirst({
      where: eq(datasets.id, id),
    });

    if (!dataset) {
      return res.status(404).json({
        ok: false,
        error: { code: "NOT_FOUND", message: "Dataset not found" },
      });
    }

    let rows: Record<string, unknown>[] = [];

    if (dataset.data) {
      rows = dataset.data as Record<string, unknown>[];
    } else if (dataset.filePath) {
      const parsed = await parseDatasetFile(
        dataset.filePath,
        dataset.mimeType || ""
      );
      rows = parsed.rows;
    }

    if (selectedColumns) {
      rows = rows.map((row) => {
        const filtered: Record<string, unknown> = {};
        for (const col of selectedColumns) {
          if (col in row) {
            filtered[col] = row[col];
          }
        }
        return filtered;
      });
    }

    if (format === "json") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${dataset.name}.json"`
      );
      return res.json(rows);
    }

    if (format === "csv") {
      const csv = Papa.unparse(rows);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${dataset.name}.csv"`
      );
      return res.send(csv);
    }

    if (format === "xlsx") {
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${dataset.name}.xlsx"`
      );
      return res.send(buffer);
    }

    res.status(400).json({
      ok: false,
      error: {
        code: "INVALID_FORMAT",
        message: "Format must be csv, json, or xlsx",
      },
    });
  } catch (error) {
    console.error("Error exporting dataset:", error);
    res.status(500).json({
      ok: false,
      error: { code: "EXPORT_ERROR", message: "Failed to export dataset" },
    });
  }
});

// DELETE /api/datasets/:id - Delete dataset
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const dataset = await db.query.datasets.findFirst({
      where: eq(datasets.id, id),
    });

    if (!dataset) {
      return res.status(404).json({
        ok: false,
        error: { code: "NOT_FOUND", message: "Dataset not found" },
      });
    }

    if (dataset.filePath) {
      await fs.unlink(dataset.filePath).catch(console.error);
    }

    await db.delete(datasets).where(eq(datasets.id, id));

    res.json({ ok: true, message: "Dataset deleted successfully" });
  } catch (error) {
    console.error("Error deleting dataset:", error);
    res.status(500).json({
      ok: false,
      error: { code: "DELETE_ERROR", message: "Failed to delete dataset" },
    });
  }
});

export { router as datasetsRouter };
