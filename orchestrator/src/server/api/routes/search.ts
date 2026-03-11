import { Router } from 'express';
import { db } from '../../db';
import { jobs } from '../../db/schema';
import { ilike, or, sql } from 'drizzle-orm';
import type { SearchResponse, SearchResult } from '../../../client/hooks/useSearch';

export const searchRouter = Router();

/**
 * GET /api/search?q=query
 * Global search across jobs, applications, and agents
 */
searchRouter.get('/', async (req, res) => {
  try {
    const query = req.query.q as string;

    if (!query || query.length < 2) {
      return res.json({
        results: [],
        totalCount: 0,
        categories: { jobs: 0, applications: 0, agents: 0 },
      } as SearchResponse);
    }

    const searchPattern = `%${query}%`;
    const results: SearchResult[] = [];

    // Search Jobs
    const jobResults = await db
      .select({
        id: jobs.id,
        title: jobs.title,
        employer: jobs.employer,
        location: jobs.location,
        status: jobs.status,
      })
      .from(jobs)
      .where(
        or(
          ilike(jobs.title, searchPattern),
          ilike(jobs.employer, searchPattern),
          ilike(jobs.location, searchPattern)
        )
      )
      .limit(10);

    jobResults.forEach((job) => {
      results.push({
        id: job.id,
        type: 'job',
        title: job.title || 'Untitled Job',
        subtitle: `${job.employer || 'Unknown'} • ${job.location || 'Remote'}`,
        url: `/job/${job.id}`,
        metadata: { status: job.status },
      });
    });

    // Search Applications (jobs with status 'applied')
    const applicationResults = await db
      .select({
        id: jobs.id,
        title: jobs.title,
        employer: jobs.employer,
        appliedAt: jobs.appliedAt,
      })
      .from(jobs)
      .where(
        sql`${jobs.status} IN ('applied', 'interview', 'offer') AND (
          ${jobs.title} ILIKE ${searchPattern} OR 
          ${jobs.employer} ILIKE ${searchPattern}
        )`
      )
      .limit(10);

    applicationResults.forEach((app) => {
      results.push({
        id: app.id,
        type: 'application',
        title: app.title || 'Untitled Application',
        subtitle: app.employer || 'Unknown Company',
        url: `/job/${app.id}`,
        metadata: { appliedAt: app.appliedAt },
      });
    });

    // TODO: Search Agents (when agents feature is implemented)
    // For now, return static agent results if query matches
    const agentKeywords = ['agent', 'ai', 'prompt', 'ghostwriter'];
    if (agentKeywords.some((keyword) => query.toLowerCase().includes(keyword))) {
      results.push({
        id: 'ghostwriter-agent',
        type: 'agent',
        title: 'Ghostwriter Agent',
        subtitle: 'AI-powered cover letter generator',
        url: '/agents',
        metadata: { type: 'ghostwriter' },
      });
    }

    // Count by category
    const categories = {
      jobs: results.filter((r) => r.type === 'job').length,
      applications: results.filter((r) => r.type === 'application').length,
      agents: results.filter((r) => r.type === 'agent').length,
    };

    return res.json({
      results,
      totalCount: results.length,
      categories,
    } as SearchResponse);
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
