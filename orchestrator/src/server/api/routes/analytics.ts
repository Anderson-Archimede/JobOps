import { Router, Request, Response } from 'express';
import { db } from '../../db';
import { jobs, datasets, postApplicationMessages } from '../../db/schema';
import { sql, and, gte, desc, eq, lte } from 'drizzle-orm';

export const analyticsRouter = Router();

/**
 * GET /api/analytics/kpis
 * Get key performance indicators
 */
analyticsRouter.get('/kpis', async (req: Request, res: Response) => {
  try {
    // Total applications (jobs with status 'applied')
    const totalAppsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(eq(jobs.status, 'applied'));
    
    const totalApps = Number(totalAppsResult[0]?.count) || 0;

    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const currentMonthAppsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(
        and(
          eq(jobs.status, 'applied'),
          gte(jobs.appliedAt, startOfCurrentMonth)
        )
      );
    
    const previousMonthAppsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(
        and(
          eq(jobs.status, 'applied'),
          gte(jobs.appliedAt, startOfPreviousMonth),
          sql`${jobs.appliedAt} <= ${endOfPreviousMonth}`
        )
      );
    
    const currentMonthApps = Number(currentMonthAppsResult[0]?.count) || 0;
    const previousMonthApps = Number(previousMonthAppsResult[0]?.count) || 0;
    
    const monthOverMonthChange = previousMonthApps > 0 
      ? Math.round(((currentMonthApps - previousMonthApps) / previousMonthApps) * 100) 
      : 0;

    // Average suitability score
    const avgScoreResult = await db
      .select({ 
        avg: sql<number>`avg(${jobs.suitabilityScore})` 
      })
      .from(jobs)
      .where(sql`${jobs.suitabilityScore} IS NOT NULL`);
    
    const avgScore = Math.round(Number(avgScoreResult[0]?.avg) || 0);

    // Response rate (jobs with outcome in interview/offer vs total applied)
    const responsesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(
        and(
          eq(jobs.status, 'applied'),
          sql`${jobs.outcome} IN ('interview', 'offer')`
        )
      );
    
    const responses = Number(responsesResult[0]?.count) || 0;
    const responseRate = totalApps > 0 
      ? Math.round((responses / totalApps) * 100) 
      : 0;

    // Pending jobs (ready status)
    const pendingJobsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(eq(jobs.status, 'ready'));
    
    const pendingJobs = Number(pendingJobsResult[0]?.count) || 0;

    return res.json({
      ok: true,
      data: {
        totalApps,
        monthOverMonthChange,
        avgScore,
        responseRate,
        pendingJobs,
      },
      meta: { requestId: res.getHeader('x-request-id') }
    });
  } catch (error) {
    console.error('Analytics KPIs error:', error);
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      meta: { requestId: res.getHeader('x-request-id') }
    });
  }
});

/**
 * GET /api/analytics/daily
 * Get applications per day for the last 30 days
 */
analyticsRouter.get('/daily', async (req: Request, res: Response) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyData = await db
      .select({
        date: sql<string>`DATE(${jobs.createdAt})`,
        count: sql<number>`count(*)`,
      })
      .from(jobs)
      .where(
        and(
          sql`${jobs.status} NOT IN ('skipped', 'expired', 'discovered')`,
          gte(jobs.createdAt, thirtyDaysAgo)
        )
      )
      .groupBy(sql`DATE(${jobs.createdAt})`)
      .orderBy(sql`DATE(${jobs.createdAt})`);

    // Fill in missing dates with 0 count
    const result: Array<{ date: string; count: number }> = [];
    const today = new Date();
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const found = dailyData.find((d) => d.date === dateStr);
      result.push({
        date: dateStr,
        count: found ? Number(found.count) : 0,
      });
    }

    return res.json({
      ok: true,
      data: result,
      meta: { requestId: res.getHeader('x-request-id') }
    });
  } catch (error) {
    console.error('Analytics daily error:', error);
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      meta: { requestId: res.getHeader('x-request-id') }
    });
  }
});

/**
 * GET /api/analytics/status-distribution
 * Get distribution of job statuses
 */
analyticsRouter.get('/status-distribution', async (req: Request, res: Response) => {
  try {
    // Count by status
    const statusDist = await db
      .select({
        status: jobs.status,
        count: sql<number>`count(*)`,
      })
      .from(jobs)
      .where(eq(jobs.status, 'applied'))
      .groupBy(jobs.status);

    // Count by outcome for applied jobs
    const outcomeDist = await db
      .select({
        outcome: jobs.outcome,
        count: sql<number>`count(*)`,
      })
      .from(jobs)
      .where(
        and(
          eq(jobs.status, 'applied'),
          sql`${jobs.outcome} IS NOT NULL`
        )
      )
      .groupBy(jobs.outcome);

    // Combine results
    const result: Array<{ status: string; count: number }> = [];
    
    // Add applied count
    const appliedCount = statusDist.reduce((sum, d) => sum + Number(d.count), 0);
    if (appliedCount > 0) {
      result.push({ status: 'applied', count: appliedCount });
    }

    // Add outcome counts with friendly names
    outcomeDist.forEach((d) => {
      const status = d.outcome === 'rejected' ? 'rejected' :
                     d.outcome === 'offer_accepted' ? 'offer' :
                     d.outcome === 'offer_declined' ? 'offer' :
                     d.outcome;
      
      if (status && ['rejected', 'offer'].includes(status)) {
        const existing = result.find(r => r.status === status);
        if (existing) {
          existing.count += Number(d.count);
        } else {
          result.push({ status, count: Number(d.count) });
        }
      }
    });

    // Add a category for "interview" (in_progress status)
    const inProgressResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(eq(jobs.status, 'in_progress'));
    
    const inProgressCount = Number(inProgressResult[0]?.count) || 0;
    // Add interview count
    if (inProgressCount > 0) {
      result.push({ status: 'interview', count: inProgressCount });
    }

    // Add skipped jobs to 'other' or just skip them if we want a clean distribution
    // But let's add 'ready' jobs as 'potential'
    const readyResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(eq(jobs.status, 'ready'));
    const readyCount = Number(readyResult[0]?.count) || 0;
    if (readyCount > 0) {
      result.push({ status: 'ready', count: readyCount });
    }

    return res.json({
      ok: true,
      data: result,
      meta: { requestId: res.getHeader('x-request-id') }
    });
  } catch (error) {
    console.error('Analytics status distribution error:', error);
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      meta: { requestId: res.getHeader('x-request-id') }
    });
  }
});

/**
 * GET /api/analytics/top-companies
 * Get top 10 companies by average suitability score
 */
analyticsRouter.get('/top-companies', async (req: Request, res: Response) => {
  try {
    const topCompanies = await db
      .select({
        employer: jobs.employer,
        avgScore: sql<number>`avg(${jobs.suitabilityScore})`,
        count: sql<number>`count(*)`,
      })
      .from(jobs)
      .where(sql`${jobs.employer} IS NOT NULL AND ${jobs.suitabilityScore} IS NOT NULL`)
      .groupBy(jobs.employer)
      .orderBy(sql`avg(${jobs.suitabilityScore}) DESC`)
      .limit(10);

    const result = topCompanies.map((c) => ({
      employer: c.employer || 'Unknown',
      avgScore: Math.round(Number(c.avgScore)),
      count: Number(c.count),
    }));

    return res.json({
      ok: true,
      data: result,
      meta: { requestId: res.getHeader('x-request-id') }
    });
  } catch (error) {
    console.error('Analytics top companies error:', error);
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      meta: { requestId: res.getHeader('x-request-id') }
    });
  }
});

/**
 * GET /api/analytics/activity
 * Get recent activity feed (last 10 activities)
 */
analyticsRouter.get('/activity', async (req: Request, res: Response) => {
  try {
    // Get recent jobs (various activities)
    const recentJobs = await db
      .select({
        id: jobs.id,
        title: jobs.title,
        employer: jobs.employer,
        status: jobs.status,
        outcome: jobs.outcome,
        suitabilityScore: jobs.suitabilityScore,
        pdfPath: jobs.pdfPath,
        appliedAt: jobs.appliedAt,
        updatedAt: jobs.updatedAt,
        createdAt: jobs.createdAt,
      })
      .from(jobs)
      .orderBy(desc(jobs.updatedAt))
      .limit(20);

    // Get recent emails
    const recentEmails = await db
      .select({
        id: postApplicationMessages.id,
        subject: postApplicationMessages.subject,
        fromAddress: postApplicationMessages.fromAddress,
        receivedAt: postApplicationMessages.receivedAt,
        matchedJobId: postApplicationMessages.matchedJobId,
      })
      .from(postApplicationMessages)
      .orderBy(desc(postApplicationMessages.createdAt))
      .limit(10);

    const activities: Array<{
      type: 'job_matched' | 'cv_tailored' | 'application_sent' | 'status_changed' | 'email_received';
      entity: string;
      entityId: string;
      timestamp: Date | number;
      link: string;
      metadata?: Record<string, unknown>;
    }> = [];

    // Add email activities
    for (const email of recentEmails) {
      activities.push({
        type: 'email_received',
        entity: `Email: ${email.subject}`,
        entityId: email.id,
        timestamp: typeof email.receivedAt === 'number' ? new Date(email.receivedAt * 1000) : email.receivedAt,
        link: email.matchedJobId ? `/job/${email.matchedJobId}` : '/messages',
        metadata: { from: email.fromAddress }
      });
    }

    for (const job of recentJobs) {
      // Job matched (new ready job)
      if (job.status === 'ready' && job.suitabilityScore) {
        activities.push({
          type: 'job_matched',
          entity: `${job.title} at ${job.employer}`,
          entityId: job.id,
          timestamp: job.createdAt,
          link: `/job/${job.id}`,
          metadata: { score: job.suitabilityScore },
        });
      }

      // CV tailored (has PDF)
      if (job.pdfPath && job.status === 'ready') {
        activities.push({
          type: 'cv_tailored',
          entity: `CV for ${job.title}`,
          entityId: job.id,
          timestamp: job.updatedAt,
          link: `/job/${job.id}`,
        });
      }

      // Application sent
      if (job.status === 'applied' && job.appliedAt) {
        activities.push({
          type: 'application_sent',
          entity: `Application to ${job.employer}`,
          entityId: job.id,
          timestamp: job.appliedAt,
          link: `/job/${job.id}`,
        });
      }

      // Status changed (in_progress, outcome = offer/rejected)
      if (job.status === 'in_progress') {
        activities.push({
          type: 'status_changed',
          entity: `${job.title} - Interview`,
          entityId: job.id,
          timestamp: job.updatedAt,
          link: `/job/${job.id}`,
          metadata: { status: 'interview' },
        });
      } else if (job.outcome === 'offer_accepted' || job.outcome === 'offer_declined') {
        activities.push({
          type: 'status_changed',
          entity: `${job.title} - Offer`,
          entityId: job.id,
          timestamp: job.updatedAt,
          link: `/job/${job.id}`,
          metadata: { status: 'offer' },
        });
      } else if (job.outcome === 'rejected') {
        activities.push({
          type: 'status_changed',
          entity: `${job.title} - Rejected`,
          entityId: job.id,
          timestamp: job.updatedAt,
          link: `/job/${job.id}`,
          metadata: { status: 'rejected' },
        });
      }
    }

    // Sort by timestamp and take last 10
    activities.sort((a, b) => {
      const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
      const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
      return timeB - timeA;
    });
    const result = activities.slice(0, 10);

    return res.json({
      ok: true,
      data: result,
      meta: { requestId: res.getHeader('x-request-id') }
    });
  } catch (error) {
    console.error('Analytics activity error:', error);
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      meta: { requestId: res.getHeader('x-request-id') }
    });
  }
});

/**
 * GET /api/analytics/datasets-summary
 * Get summary of available datasets for dashboard widget
 */
analyticsRouter.get('/datasets-summary', async (req: Request, res: Response) => {
  try {
    const allDatasets = await db.select().from(datasets);
    
    const summary = {
      totalCount: allDatasets.length,
      totalRows: allDatasets.reduce((sum, d) => sum + (d.rowCount || 0), 0),
      byType: allDatasets.reduce((acc: Record<string, number>, d) => {
        acc[d.type] = (acc[d.type] || 0) + 1;
        return acc;
      }, {}),
      recent: allDatasets
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, 3)
        .map(d => ({
          id: d.id,
          name: d.name,
          type: d.type,
          rowCount: d.rowCount,
          updatedAt: d.updatedAt
        }))
    };

    return res.json({
      ok: true,
      data: summary,
      meta: { requestId: res.getHeader('x-request-id') }
    });
  } catch (error) {
    console.error('Datasets summary error:', error);
    return res.status(500).json({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      meta: { requestId: res.getHeader('x-request-id') }
    });
  }
});
