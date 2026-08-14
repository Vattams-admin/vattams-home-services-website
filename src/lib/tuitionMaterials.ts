// Data access layer for Vattams Online Tuition — Learning Materials (Phase 5.1).

import { supabase } from '@/lib/supabase';
import {
  CourseMaterialItem,
  CourseMaterials,
  createEmptyMaterials,
} from '@/pages/tuition/tuitionCoursesData';

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
 * resource_url stores a PRIVATE Supabase Storage object path,
 * NOT a public URL.
 *
 * Examples:
 * protected-mathematics-basic-practice-notes-WATERMARKED.pdf
 * study-materials/mathematics/basic-practice.pdf
 */
function sanitizeStoragePath(
  path: string | null
): string | undefined {
  if (!path) return undefined;

  const trimmed = path.trim();

  if (!trimmed) return undefined;

  // Never allow a URL here.
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    return undefined;
  }

  // Prevent path traversal.
  if (
    trimmed.startsWith('/') ||
    trimmed.includes('..')
  ) {
    return undefined;
  }

  return trimmed;
}

/**
 * External URLs are still allowed only as normal HTTP(S) URLs.
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

    // IMPORTANT:
    // This is now a PRIVATE STORAGE PATH.
    resourceUrl: sanitizeStoragePath(
      row.resource_url
    ),

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
  totalCount: number;
}

/**
 * Fetch published materials for a course.
 *
 * Only published database rows are returned.
 */
export async function fetchCourseMaterials(
  courseSlug: string
): Promise<CourseMaterialsResult> {
  const { data, error } = await supabase
    .from('tuition_course_materials')
    .select(
      [
        'id',
        'course_slug',
        'title',
        'description',
        'category',
        'subject',
        'topic',
        'grade',
        'resource_url',
        'external_url',
        'file_type',
        'file_size',
        'is_published',
        'created_at',
        'updated_at',
      ].join(', ')
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

  for (const row of (data ??
    []) as TuitionCourseMaterialRow[]) {
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

/**
 * Creates a SHORT-LIVED signed URL for a protected
 * tuition material.
 *
 * The URL expires after 5 minutes.
 */
export async function getSignedMaterialUrl(
  storagePath: string
): Promise<string> {
  const cleanPath =
    sanitizeStoragePath(storagePath);

  if (!cleanPath) {
    throw new Error(
      'Invalid tuition material storage path.'
    );
  }

  const {
    data,
    error,
  } = await supabase.storage
    .from('tuition-materials')
    .createSignedUrl(
      cleanPath,
      60 * 5
    );

  if (error) {
    console.error(
      '[tuitionMaterials] Failed to create signed URL',
      error
    );

    throw error;
  }

  if (!data?.signedUrl) {
    throw new Error(
      'Supabase did not return a signed URL.'
    );
  }

  return data.signedUrl;
}