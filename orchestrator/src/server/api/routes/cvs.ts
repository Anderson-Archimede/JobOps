import { Router, Request, Response } from "express";
import { nanoid } from "nanoid";
import multer from "multer";
import archiver from "archiver";
import { db } from "../../db";
import { cvs, cvVersions } from "../../db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { AuthRequest } from "../../middleware/authenticateJWT";
import path from "path";
import fs from "fs/promises";

export const cvsRouter = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), "uploads", "cvs");
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${nanoid()}-${file.originalname}`;
      cb(null, uniqueName);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["application/pdf", "application/json"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF and JSON are allowed."));
    }
  },
});

// GET /api/cvs - List all CVs for current user
cvsRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { role, active, includeDeleted } = req.query;

    let query = db
      .select()
      .from(cvs)
      .where(eq(cvs.userId, userId))
      .$dynamic();

    // Apply filters
    const conditions = [eq(cvs.userId, userId)];

    if (!includeDeleted) {
      conditions.push(eq(cvs.isDeleted, false));
    }

    if (role) {
      conditions.push(eq(cvs.role, role as string));
    }

    if (active === "true") {
      conditions.push(eq(cvs.isActive, true));
    }

    const results = await db
      .select()
      .from(cvs)
      .where(and(...conditions))
      .orderBy(desc(cvs.updatedAt));

    return res.json(results);
  } catch (error) {
    console.error("Get CVs error:", error);
    return res.status(500).json({ error: "Failed to fetch CVs" });
  }
});

// GET /api/cvs/stats - Get CV statistics
cvsRouter.get("/stats", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Total CVs
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(cvs)
      .where(and(eq(cvs.userId, userId), eq(cvs.isDeleted, false)));

    // Active CV
    const activeCV = await db
      .select()
      .from(cvs)
      .where(and(eq(cvs.userId, userId), eq(cvs.isActive, true), eq(cvs.isDeleted, false)))
      .limit(1);

    // By role
    const byRole = await db
      .select({
        role: cvs.role,
        count: sql<number>`count(*)`,
      })
      .from(cvs)
      .where(and(eq(cvs.userId, userId), eq(cvs.isDeleted, false)))
      .groupBy(cvs.role);

    // Recent uploads (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(cvs)
      .where(
        and(
          eq(cvs.userId, userId),
          eq(cvs.isDeleted, false),
          sql`${cvs.createdAt} >= ${sevenDaysAgo.toISOString()}`
        )
      );

    return res.json({
      totalCVs: totalResult[0]?.count || 0,
      activeCV: activeCV[0] || null,
      byRole: byRole.map((r) => ({ role: r.role || "No role", count: r.count })),
      recentUploads: recentResult[0]?.count || 0,
    });
  } catch (error) {
    console.error("Get CV stats error:", error);
    return res.status(500).json({ error: "Failed to fetch CV statistics" });
  }
});

// GET /api/cvs/:id - Get single CV
cvsRouter.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const [cv] = await db
      .select()
      .from(cvs)
      .where(and(eq(cvs.id, id), eq(cvs.userId, userId)))
      .limit(1);

    if (!cv) {
      return res.status(404).json({ error: "CV not found" });
    }

    return res.json(cv);
  } catch (error) {
    console.error("Get CV error:", error);
    return res.status(500).json({ error: "Failed to fetch CV" });
  }
});

// GET /api/cvs/:id/versions - Get version history
cvsRouter.get("/:id/versions", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Verify ownership
    const [cv] = await db
      .select()
      .from(cvs)
      .where(and(eq(cvs.id, id), eq(cvs.userId, userId)))
      .limit(1);

    if (!cv) {
      return res.status(404).json({ error: "CV not found" });
    }

    // Get all versions
    const versions = await db
      .select()
      .from(cvVersions)
      .where(eq(cvVersions.cvId, id))
      .orderBy(desc(cvVersions.version));

    return res.json(versions);
  } catch (error) {
    console.error("Get CV versions error:", error);
    return res.status(500).json({ error: "Failed to fetch CV versions" });
  }
});

// POST /api/cvs - Upload new CV
cvsRouter.post("/", upload.single("file"), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { name, role, resumeData } = req.body;
    const file = req.file;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    if (!file && !resumeData) {
      return res.status(400).json({ error: "Either file or resumeData is required" });
    }

    const cvId = nanoid();
    const versionId = nanoid();

    // Parse resumeData if provided as string
    let parsedResumeData = null;
    if (resumeData) {
      try {
        parsedResumeData = typeof resumeData === "string" ? JSON.parse(resumeData) : resumeData;
      } catch (e) {
        return res.status(400).json({ error: "Invalid JSON in resumeData" });
      }
    }

    // Create CV
    const [newCV] = await db
      .insert(cvs)
      .values({
        id: cvId,
        userId,
        name,
        role: role || null,
        version: 1,
        fileUrl: file ? `/uploads/cvs/${file.filename}` : null,
        filePath: file ? file.path : null,
        resumeData: parsedResumeData,
        metadata: {},
      })
      .returning();

    // Create first version
    await db.insert(cvVersions).values({
      id: versionId,
      cvId,
      version: 1,
      changesSummary: "Initial version",
      fileUrl: newCV.fileUrl,
      filePath: newCV.filePath,
      resumeData: parsedResumeData,
      metadata: {},
    });

    return res.status(201).json(newCV);
  } catch (error) {
    console.error("Upload CV error:", error);
    return res.status(500).json({ error: "Failed to upload CV" });
  }
});

// POST /api/cvs/:id/duplicate - Duplicate CV
cvsRouter.post("/:id/duplicate", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { newName, newRole } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!newName) {
      return res.status(400).json({ error: "New name is required" });
    }

    // Get original CV
    const [originalCV] = await db
      .select()
      .from(cvs)
      .where(and(eq(cvs.id, id), eq(cvs.userId, userId)))
      .limit(1);

    if (!originalCV) {
      return res.status(404).json({ error: "CV not found" });
    }

    const newCVId = nanoid();
    const newVersionId = nanoid();

    // Create duplicate
    const [duplicatedCV] = await db
      .insert(cvs)
      .values({
        id: newCVId,
        userId,
        name: newName,
        role: newRole || originalCV.role,
        version: 1,
        fileUrl: originalCV.fileUrl,
        filePath: originalCV.filePath,
        resumeData: originalCV.resumeData,
        metadata: originalCV.metadata,
      })
      .returning();

    // Create version
    await db.insert(cvVersions).values({
      id: newVersionId,
      cvId: newCVId,
      version: 1,
      changesSummary: `Duplicated from "${originalCV.name}"`,
      fileUrl: originalCV.fileUrl,
      filePath: originalCV.filePath,
      resumeData: originalCV.resumeData,
      metadata: originalCV.metadata,
    });

    return res.status(201).json(duplicatedCV);
  } catch (error) {
    console.error("Duplicate CV error:", error);
    return res.status(500).json({ error: "Failed to duplicate CV" });
  }
});

// POST /api/cvs/:id/set-active - Set as active CV
cvsRouter.post("/:id/set-active", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Verify ownership
    const [cv] = await db
      .select()
      .from(cvs)
      .where(and(eq(cvs.id, id), eq(cvs.userId, userId)))
      .limit(1);

    if (!cv) {
      return res.status(404).json({ error: "CV not found" });
    }

    // Deactivate all other CVs
    await db
      .update(cvs)
      .set({ isActive: false })
      .where(and(eq(cvs.userId, userId), eq(cvs.isDeleted, false)));

    // Activate this CV
    const [updatedCV] = await db
      .update(cvs)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(cvs.id, id))
      .returning();

    return res.json(updatedCV);
  } catch (error) {
    console.error("Set active CV error:", error);
    return res.status(500).json({ error: "Failed to set active CV" });
  }
});

// DELETE /api/cvs/:id - Soft delete CV
cvsRouter.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Verify ownership
    const [cv] = await db
      .select()
      .from(cvs)
      .where(and(eq(cvs.id, id), eq(cvs.userId, userId)))
      .limit(1);

    if (!cv) {
      return res.status(404).json({ error: "CV not found" });
    }

    // Soft delete
    await db
      .update(cvs)
      .set({ isDeleted: true, isActive: false, updatedAt: new Date() })
      .where(eq(cvs.id, id));

    return res.json({ message: "CV deleted successfully" });
  } catch (error) {
    console.error("Delete CV error:", error);
    return res.status(500).json({ error: "Failed to delete CV" });
  }
});

// POST /api/cvs/bulk-delete - Bulk delete CVs
cvsRouter.post("/bulk-delete", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { ids } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "IDs array is required" });
    }

    // Soft delete all specified CVs (only owned by user)
    await db
      .update(cvs)
      .set({ isDeleted: true, isActive: false, updatedAt: new Date() })
      .where(and(eq(cvs.userId, userId), sql`${cvs.id} = ANY(${ids})`));

    return res.json({ message: `${ids.length} CVs deleted successfully` });
  } catch (error) {
    console.error("Bulk delete CVs error:", error);
    return res.status(500).json({ error: "Failed to bulk delete CVs" });
  }
});

// POST /api/cvs/bulk-export - Export multiple CVs as ZIP
cvsRouter.post("/bulk-export", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { ids } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "IDs array is required" });
    }

    // Get CVs owned by user
    const selectedCVs = await db
      .select()
      .from(cvs)
      .where(and(eq(cvs.userId, userId), sql`${cvs.id} = ANY(${ids})`));

    if (selectedCVs.length === 0) {
      return res.status(404).json({ error: "No CVs found" });
    }

    // Set response headers
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="cvs-export-${Date.now()}.zip"`
    );

    // Create ZIP archive
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("error", (err) => {
      console.error("Archive error:", err);
      res.status(500).json({ error: "Failed to create archive" });
    });

    archive.pipe(res);

    // Add each CV file to archive
    for (const cv of selectedCVs) {
      if (cv.filePath) {
        try {
          await fs.access(cv.filePath);
          const fileName = `${cv.name.replace(/[^a-z0-9]/gi, '_')}_v${cv.version}.pdf`;
          archive.file(cv.filePath, { name: fileName });
        } catch (err) {
          console.warn(`File not found for CV ${cv.id}: ${cv.filePath}`);
        }
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error("Bulk export CVs error:", error);
    return res.status(500).json({ error: "Failed to export CVs" });
  }
});

// POST /api/cvs/:id/restore/:versionId - Restore a previous version
cvsRouter.post("/:id/restore/:versionId", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id, versionId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Verify ownership
    const [cv] = await db
      .select()
      .from(cvs)
      .where(and(eq(cvs.id, id), eq(cvs.userId, userId)))
      .limit(1);

    if (!cv) {
      return res.status(404).json({ error: "CV not found" });
    }

    // Get the version to restore
    const [version] = await db
      .select()
      .from(cvVersions)
      .where(and(eq(cvVersions.id, versionId), eq(cvVersions.cvId, id)))
      .limit(1);

    if (!version) {
      return res.status(404).json({ error: "Version not found" });
    }

    // Create new version with current data (before restore)
    const newVersionNumber = cv.version + 1;
    await db.insert(cvVersions).values({
      id: nanoid(),
      cvId: id,
      version: newVersionNumber,
      changesSummary: `Restored from version ${version.version}`,
      fileUrl: version.fileUrl,
      filePath: version.filePath,
      resumeData: version.resumeData,
      metadata: version.metadata,
    });

    // Update CV with restored data
    const [restoredCV] = await db
      .update(cvs)
      .set({
        version: newVersionNumber,
        fileUrl: version.fileUrl,
        filePath: version.filePath,
        resumeData: version.resumeData,
        metadata: version.metadata,
        updatedAt: new Date(),
      })
      .where(eq(cvs.id, id))
      .returning();

    return res.json(restoredCV);
  } catch (error) {
    console.error("Restore CV version error:", error);
    return res.status(500).json({ error: "Failed to restore version" });
  }
});
