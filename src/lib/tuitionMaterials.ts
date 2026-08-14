// Data access layer for Vattams Online Tuition — Learning Materials (Phase 5.1).
//
// Reads published rows from the `tuition_course_materials` Supabase table for
// a given course slug and shapes them into the existing `CourseMaterials`
// catalog type already used by CourseMaterialsSection, so no UI component
// needs to know whether a material came from the database or (for older,
// still-static courses) from tuitionCoursesData.ts.
//
// This module is intentionally read-only. Tutor/Admin write access is a
// Phase 5.2 concern.

import { supabase } from '@/lib/supabase';
import {
  CourseMaterialItem,
  CourseMaterials,
  createEmptyMaterials,
} from '@/pages/tuition/tuitionCoursesData';

/** The category keys accepted by the `category` column's CHECK constraint. */
const VALID_CATEGORIES = new Set<keyof CourseMaterials>([
  'courseMaterials',
  'studyMaterials',
  'worksheets',
  'questionBanks',
  'testPapers',
  'mockExams',
  'solutions',
  'revisionMaterials',
  'examPreparation',
]);

/** Row shape as returned by Supabase for `tuition_course_materials`. */
interface TuitionCourseMaterialRow {
  id: string;
  course_slug: string;
  title: string;
  description: string | null;
  category: string;
  subject: string | null;
  topic: string | null;
  grade: string | null;
  resource_url: string | null;
  external_url: string | null;
  file_type: string | null;
  file_size: number | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Only allow http(s) URLs through to the UI. Guards against a stray
 * javascript:/data: URL (or similar) ever being rendered as a clickable
 * href, regardless of what ends up in the database.
 */
function sanitizeUrl(url: string | null): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return undefined;
  return trimmed;
}

function mapRowToItem(row: TuitionCourseMaterialRow): CourseMaterialItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    topic: row.topic ?? undefined,
    resourceUrl: sanitizeUrl(row.resource_url),
    externalLink: sanitizeUrl(row.external_url),
    subject: row.subject ?? undefined,
    grade: row.grade ?? undefined,
    fileType: row.file_type ?? undefined,
    fileSizeBytes: row.file_size ?? undefined,
    uploadedAt: row.created_at,
    isPublished: row.is_published,
  };
}

export interface CourseMaterialsResult {
  materials: CourseMaterials;
  /** Total count of published materials across all categories. */
  totalCount: number;
}

/**
 * Fetches all published learning materials for a course (by slug) and
 * groups them into the category buckets the UI already renders.
 *
 * Throws on a genuine fetch/query error so the caller can show an error
 * state; an empty (but successful) result simply yields all-empty category
 * arrays, which the UI renders as "No materials available yet".
 */
export async function fetchCourseMaterials(courseSlug: string): Promise<CourseMaterialsResult> {
  const { data, error } = await supabase
    .from('tuition_course_materials')
    .select(
      'id, course_slug, title, description, category, subject, topic, grade, resource_url, external_url, file_type, file_size, is_published, created_at, updated_at'
    )
    .eq('course_slug', courseSlug)
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  const materials = createEmptyMaterials();
  let totalCount = 0;

  for (const row of (data ?? []) as TuitionCourseMaterialRow[]) {
    if (!VALID_CATEGORIES.has(row.category as keyof CourseMaterials)) {
      // Defensive: ignore any row with a category outside the known set
      // rather than letting it break the grouped view.
      continue;
    }
    materials[row.category as keyof CourseMaterials].push(mapRowToItem(row));
    totalCount += 1;
  }

  return { materials, totalCount };
}