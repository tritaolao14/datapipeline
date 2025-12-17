// ============================================================
// JOB-LISTING.TYPE.TS - Job board specific types
// ============================================================

import { BaseCrawlData, BaseListingItem } from '../../core/crawl-data.type';

export interface JobListing extends BaseCrawlData {
    domain: 'jobs';

    // ─────────────────────────────────────────────────────────
    // Job Specific Fields
    // ─────────────────────────────────────────────────────────

    // Position
    jobTitle: string;
    company: string;
    companyUrl?: string;

    // Location
    location: string;
    remote?: boolean;
    hybrid?: boolean;

    // Compensation
    salary?: {
        min?: number;
        max?: number;
        currency?: string;
        period?: 'hourly' | 'monthly' | 'yearly';
    };

    // Requirements
    experienceLevel?: string;
    skills?: string[];
    qualifications?: string[];

    // Details
    jobType?: 'full-time' | 'part-time' | 'contract' | 'internship';
    industry?: string;
    department?: string;

    // Dates
    postedAt?: string;
    expiresAt?: string;

    // Application
    applyUrl?: string;
    applicationDeadline?: string;
}