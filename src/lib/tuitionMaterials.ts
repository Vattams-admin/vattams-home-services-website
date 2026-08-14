// Data access layer for Vattams Online Tuition — Learning Materials.

import { supabase } from '@/lib/supabase';

import {
  CourseMaterialItem,
  CourseMaterials,
  createEmptyMaterials,
} from '@/pages/tuition/tuitionCoursesData';

/** Valid category keys used by the tuition materials UI. */
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
 * Converts a Storage file path into a public Supabase Storage URL.
 *
 * Database may contain either:
 *
 * 1. A complete https:// URL
 * 2. A Storage path such as:
 *    protected-mathematics-basic-practice-notes-WATERMARKED.pdf
 */
function getResourceUrl(
  resourcePath: string | null
): string | undefined {
  if (!resourcePath) return undefined;

  const value = resourcePath.trim();

  if (!value) return undefined;

  // Already a complete URL.
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  // Otherwise treat it as a file path inside the public bucket.
  const { data } = supabase.storage
    .from('tuition-materials')
    .getPublicUrl(value);

  return data?.publicUrl || undefined;
}

/**
 * Only allow http(s) external URLs.
 */
function sanitizeExternalUrl(
  url: string | null
): string | undefined {
  if (!url) return undefined;

  const trimmed = url.trim();

  if (!/^https?:\/\//i.test(trimmed)) {
    return undefined;
  }

  return trimmed;
}

function mapRowToItem(
  row: TuitionCourseMaterialRow
): CourseMaterialItem {
  return {
    id: row.id,

    title: row.title,

    description: row.description ?? '',

    topic: row.topic ?? undefined,

    /*
     * IMPORTANT:
     * resource_url may contain only the Storage filename.
     * Convert it into the real public Storage URL here.
     */
    resourceUrl: getResourceUrl(row.resource_url),

    externalLink: sanitizeExternalUrl(
      row.external_url
    ),

    subject: row.subject ?? undefined,

    grade: row.grade ?? undefined,

    fileType: row.file_type ?? undefined,

    fileSizeBytes:
      row.file_size ?? undefined,

    uploadedAt: row.created_at,

    isPublished: row.is_published,
  };
}

export interface CourseMaterialsResult {
  materials: CourseMaterials;

  /** Total number of published materials. */
  totalCount: number;
}

/**
 * Fetch all published learning materials
 * for a specific course.
 */
export async function fetchCourseMaterials(
  courseSlug: string
): Promise<CourseMaterialsResult> {
  const {
    data,
    error,
  } = await supabase
    .from('tuition_course_materials')
    .select(
      `
        id,
        course_slug,
        title,
        description,
        category,
        subject,
        topic,
        grade,
        resource_url,
        external_url,
        file_type,
        file_size,
        is_published,
        created_at,
        updated_at
      `
    )
    .eq('course_slug', courseSlug)
    .eq('is_published', true)
    .order('created_at', {
      ascending: false,
    });

  if (error) {
    console.error(
      '[tuitionMaterials] fetchCourseMaterials failed',
      {
        courseSlug,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      }
    );

    throw error;
  }

  const materials =
    createEmptyMaterials();

  let totalCount = 0;

  for (
    const row of (data ??
      []) as TuitionCourseMaterialRow[]
  ) {
    const category =
      row.category as keyof CourseMaterials;

    if (!VALID_CATEGORIES.has(category)) {
      console.warn(
        '[tuitionMaterials] Ignoring invalid category:',
        row.category
      );

      continue;
    }

    materials[category].push(
      mapRowToItem(row)
    );

    totalCount += 1;
  }

  return {
    materials,
    totalCount,
  };
}