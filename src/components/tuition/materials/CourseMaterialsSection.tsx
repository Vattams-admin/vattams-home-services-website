import { useEffect, useState } from 'react';

import {
  BookOpen,
  StickyNote,
  FileText,
  HelpCircle,
  ClipboardList,
  Timer,
  CheckSquare,
  RotateCcw,
  Target,
  ExternalLink,
  Download,
  Eye,
  Clock,
  ChevronDown,
  ChevronUp,
  LucideIcon,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

import {
  CourseMaterialItem,
  CourseMaterials,
  MATERIAL_CATEGORIES,
  createEmptyMaterials,
} from '@/pages/tuition/tuitionCoursesData';

import { fetchCourseMaterials } from '@/lib/tuitionMaterials';
import { supabase } from '@/lib/supabase';

/* ============================================================
   STORAGE
============================================================ */

const TUITION_BUCKET = 'tuition-materials';

/* ============================================================
   CATEGORY ICONS
============================================================ */

const CATEGORY_ICONS: Record<
  keyof CourseMaterials,
  LucideIcon
> = {
  courseMaterials: BookOpen,
  studyMaterials: StickyNote,
  worksheets: FileText,
  questionBanks: HelpCircle,
  testPapers: ClipboardList,
  mockExams: Timer,
  solutions: CheckSquare,
  revisionMaterials: RotateCcw,
  examPreparation: Target,
};

/* ============================================================
   PROPS
============================================================ */

interface CourseMaterialsSectionProps {
  courseSlug: string;
}

type LoadState =
  | 'loading'
  | 'ready'
  | 'error';

/* ============================================================
   MAIN COMPONENT
============================================================ */

export default function CourseMaterialsSection({
  courseSlug,
}: CourseMaterialsSectionProps) {
  const [status, setStatus] =
    useState<LoadState>('loading');

  const [materials, setMaterials] =
    useState<CourseMaterials>(
      createEmptyMaterials()
    );

  const [totalCount, setTotalCount] =
    useState(0);

  const [activeCategory, setActiveCategory] =
    useState<keyof CourseMaterials>(
      MATERIAL_CATEGORIES[0].key
    );

  const [expandedId, setExpandedId] =
    useState<string | null>(null);

  const [reloadToken, setReloadToken] =
    useState(0);

  const [errorDetail, setErrorDetail] =
    useState<string | null>(null);

  /* ==========================================================
     LOAD MATERIALS
  ========================================================== */

  useEffect(() => {
    let cancelled = false;

    setStatus('loading');
    setErrorDetail(null);

    fetchCourseMaterials(courseSlug)
      .then((result) => {
        if (cancelled) return;

        setMaterials(result.materials);
        setTotalCount(result.totalCount);

        setActiveCategory(
          MATERIAL_CATEGORIES[0].key
        );

        setExpandedId(null);
        setStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;

        const code =
          (err as { code?: string })?.code;

        const message =
          (err as { message?: string })?.message ??
          String(err);

        console.error(
          '[CourseMaterialsSection] Failed to load materials',
          err
        );

        if (import.meta.env.DEV) {
          setErrorDetail(
            `${code ? `[${code}] ` : ''}${message}`
          );
        } else if (
          code === '42P01' ||
          code === 'PGRST205'
        ) {
          setErrorDetail(
            'The materials table is not available yet.'
          );
        } else if (
          code === '42501' ||
          code === 'PGRST301'
        ) {
          setErrorDetail(
            'You do not have permission to view these materials.'
          );
        }

        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [courseSlug, reloadToken]);

  /* ==========================================================
     ACTIVE CATEGORY
  ========================================================== */

  const activeMeta =
    MATERIAL_CATEGORIES.find(
      (category) =>
        category.key === activeCategory
    )!;

  const activeItems =
    materials[activeCategory];

  /* ==========================================================
     CATEGORY SELECT
  ========================================================== */

  const handleSelectCategory = (
    key: keyof CourseMaterials
  ) => {
    setActiveCategory(key);
    setExpandedId(null);
  };

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <section
      aria-labelledby="learning-materials-heading"
    >
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex items-center gap-2 mb-1">
        <h2
          id="learning-materials-heading"
          className="text-xl font-bold text-gray-900"
        >
          Learning Materials
        </h2>

        {status === 'ready' &&
          totalCount > 0 && (
            <span className="text-xs font-semibold rounded-full px-2 py-0.5 bg-purple-100 text-purple-700">
              {totalCount}{' '}
              {totalCount === 1
                ? 'item'
                : 'items'}
            </span>
          )}
      </div>

      <p className="text-sm text-gray-600 mb-6">
        Browse course materials by category.
        Items marked as coming soon will be
        added as they become available.
      </p>

      {/* ======================================================
          LOADING
      ====================================================== */}

      {status === 'loading' && (
        <MaterialsLoadingState />
      )}

      {/* ======================================================
          ERROR
      ====================================================== */}

      {status === 'error' && (
        <MaterialsErrorState
          detail={errorDetail}
          onRetry={() =>
            setReloadToken(
              (token) => token + 1
            )
          }
        />
      )}

      {/* ======================================================
          NO MATERIALS
      ====================================================== */}

      {status === 'ready' &&
        totalCount === 0 && (
          <NoMaterialsState />
        )}

      {/* ======================================================
          MATERIALS
      ====================================================== */}

      {status === 'ready' &&
        totalCount > 0 && (
          <>
            {/* ==================================================
                CATEGORY BUTTONS
            ================================================== */}

            <div
              role="tablist"
              aria-label="Learning material categories"
              className="flex flex-wrap gap-2 mb-6"
            >
              {MATERIAL_CATEGORIES.map(
                ({ key, label }) => {
                  const Icon =
                    CATEGORY_ICONS[key];

                  const isActive =
                    key === activeCategory;

                  const count =
                    materials[key].length;

                  return (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() =>
                        handleSelectCategory(
                          key
                        )
                      }
                      className={
                        'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border transition-colors ' +
                        (isActive
                          ? 'bg-purple-600 border-purple-600 text-white'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-purple-300 hover:text-purple-700')
                      }
                    >
                      <Icon size={15} />

                      {label}

                      <span
                        className={
                          'ml-0.5 text-xs rounded-full px-1.5 ' +
                          (isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-gray-100 text-gray-500')
                        }
                      >
                        {count}
                      </span>
                    </button>
                  );
                }
              )}
            </div>

            {/* ==================================================
                ACTIVE CATEGORY PANEL
            ================================================== */}

            <div
              role="tabpanel"
              aria-label={`${activeMeta.label} materials`}
              className="rounded-2xl border border-gray-200 bg-gray-50 p-5 md:p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                {(() => {
                  const Icon =
                    CATEGORY_ICONS[
                      activeCategory
                    ];

                  return (
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-100 text-purple-600">
                      <Icon size={16} />
                    </div>
                  );
                })()}

                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    {activeMeta.label}
                  </h3>

                  <p className="text-xs text-gray-500">
                    {activeMeta.description}
                  </p>
                </div>
              </div>

              {activeItems.length === 0 ? (
                <EmptyCategoryState
                  label={activeMeta.label}
                />
              ) : (
                <ul className="space-y-3">
                  {activeItems.map(
                    (item) => (
                      <MaterialListItem
                        key={item.id}
                        item={item}
                        categoryLabel={
                          activeMeta.label
                        }
                        expanded={
                          expandedId ===
                          item.id
                        }
                        onToggle={() =>
                          setExpandedId(
                            (current) =>
                              current ===
                              item.id
                                ? null
                                : item.id
                          )
                        }
                      />
                    )
                  )}
                </ul>
              )}
            </div>
          </>
        )}
    </section>
  );
}

/* ============================================================
   LOADING STATE
============================================================ */

function MaterialsLoadingState() {
  return (
    <div
      className="space-y-3"
      aria-busy="true"
      aria-label="Loading learning materials"
    >
      <div className="flex flex-wrap gap-2 mb-2">
        {Array.from({
          length: 4,
        }).map((_, index) => (
          <div
            key={index}
            className="h-9 w-28 rounded-xl bg-gray-100 animate-pulse"
          />
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 md:p-6 space-y-3">
        {Array.from({
          length: 3,
        }).map((_, index) => (
          <div
            key={index}
            className="h-14 rounded-xl bg-white border border-gray-200 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   ERROR STATE
============================================================ */

function MaterialsErrorState({
  detail,
  onRetry,
}: {
  detail: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4 rounded-xl border border-dashed border-red-200 bg-red-50">
      <AlertTriangle
        size={24}
        className="text-red-500 mb-2"
      />

      <p className="text-sm font-semibold text-red-700">
        Couldn't load learning materials
      </p>

      <p className="text-xs text-red-500 mt-1 max-w-xs">
        Something went wrong while fetching
        materials for this course. Please try
        again.
      </p>

      {detail && (
        <p className="text-[11px] font-mono text-red-400 mt-2 max-w-sm break-words">
          {detail}
        </p>
      )}

      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 mt-4 px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
      >
        <RefreshCw size={13} />
        Retry
      </button>
    </div>
  );
}

/* ============================================================
   NO MATERIALS
============================================================ */

function NoMaterialsState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50">
      <Clock
        size={26}
        className="text-gray-400 mb-2"
      />

      <p className="text-sm font-semibold text-gray-700">
        No materials available yet
      </p>

      <p className="text-xs text-gray-500 mt-1 max-w-xs">
        We're preparing learning materials for
        this course. Check back later for
        updates.
      </p>
    </div>
  );
}

/* ============================================================
   EMPTY CATEGORY
============================================================ */

function EmptyCategoryState({
  label,
}: {
  label: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4 rounded-xl border border-dashed border-gray-300 bg-white">
      <Clock
        size={24}
        className="text-gray-400 mb-2"
      />

      <p className="text-sm font-semibold text-gray-700">
        {label} will be available soon
      </p>

      <p className="text-xs text-gray-500 mt-1 max-w-xs">
        We're preparing this content. Check
        back later for updates.
      </p>
    </div>
  );
}

/* ============================================================
   FILE SIZE
============================================================ */

function formatFileSize(
  bytes?: number
): string | null {
  if (!bytes || bytes <= 0) {
    return null;
  }

  const units = [
    'B',
    'KB',
    'MB',
    'GB',
  ];

  let value = bytes;
  let unitIndex = 0;

  while (
    value >= 1024 &&
    unitIndex <
      units.length - 1
  ) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(
    unitIndex === 0 ? 0 : 1
  )} ${units[unitIndex]}`;
}

/* ============================================================
   MATERIAL ITEM
============================================================ */

interface MaterialListItemProps {
  item: CourseMaterialItem;
  categoryLabel: string;
  expanded: boolean;
  onToggle: () => void;
}

function MaterialListItem({
  item,
  categoryLabel,
  expanded,
  onToggle,
}: MaterialListItemProps) {
  const hasResource =
    Boolean(item.resourceUrl);

  const hasExternalLink =
    Boolean(item.externalLink);

  /*
   * A material is available when:
   *
   * 1. It is published
   * 2. It has a storage resource
   */

  const isAvailable =
    item.isPublished === true &&
    hasResource;

  const hasAnyResource =
    isAvailable ||
    hasExternalLink;

  const fileSizeLabel =
    formatFileSize(
      item.fileSizeBytes
    );

  return (
    <li className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* ======================================================
          MATERIAL HEADER
      ====================================================== */}

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {item.title}
          </p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
            {item.subject && (
              <span>
                {item.subject}
              </span>
            )}

            {item.topic && (
              <span>
                {item.topic}
              </span>
            )}

            {(item.grade ||
              item.level) && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">
                {item.grade ??
                  item.level}
              </span>
            )}

            {item.fileType && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium uppercase">
                {item.fileType}
              </span>
            )}

            {isAvailable ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                <CheckCircle2
                  size={11}
                />
                Available
              </span>
            ) : (
              !hasAnyResource && (
                <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                  <Clock
                    size={11}
                  />
                  Coming soon
                </span>
              )
            )}
          </div>
        </div>

        {expanded ? (
          <ChevronUp
            size={18}
            className="text-gray-400 flex-shrink-0"
          />
        ) : (
          <ChevronDown
            size={18}
            className="text-gray-400 flex-shrink-0"
          />
        )}
      </button>

      {/* ======================================================
          EXPANDED CONTENT
      ====================================================== */}

      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-100">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mt-3 mb-1">
            {categoryLabel}
          </p>

          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            {item.description}
          </p>

          {fileSizeLabel && (
            <p className="text-xs text-gray-400 mb-3">
              File size:{' '}
              {fileSizeLabel}
            </p>
          )}

          {hasAnyResource ? (
            <div className="flex flex-wrap gap-2">
              {/* STORAGE FILE */}

              {isAvailable &&
                item.resourceUrl && (
                  <MaterialResourceActions
                    resourcePath={
                      item.resourceUrl
                    }
                    fileName={createFileName(
                      item.title,
                      item.fileType
                    )}
                  />
                )}

              {/* EXTERNAL RESOURCE */}

              {hasExternalLink && (
                <a
                  href={
                    item.externalLink
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:border-purple-300 hover:text-purple-700 text-xs font-semibold"
                >
                  <ExternalLink
                    size={14}
                  />
                  View Resource
                </a>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 w-fit">
              <Clock size={13} />
              Material will be available soon
            </div>
          )}
        </div>
      )}
    </li>
  );
}

/* ============================================================
   FILE NAME
============================================================ */

function createFileName(
  title: string,
  fileType?: string
): string {
  const safeTitle =
    title
      .trim()
      .replace(
        /[<>:"/\\|?*\x00-\x1F]/g,
        '-'
      )
      .replace(/\s+/g, ' ')
      .slice(0, 150);

  const extension =
    fileType
      ?.toLowerCase()
      .includes('pdf')
      ? 'pdf'
      : 'pdf';

  return `${safeTitle}.${extension}`;
}

/* ============================================================
   STORAGE PATH NORMALIZER
============================================================ */

/*
 * Database normally contains:
 *
 * protected-mathematics-basic-practice-notes-WATERMARKED.pdf
 *
 * But this also handles a full Supabase storage URL
 * if one was accidentally stored in the database.
 */

function normalizeStoragePath(
  value: string
): string {
  const trimmed =
    value.trim();

  if (
    !/^https?:\/\//i.test(
      trimmed
    )
  ) {
    return trimmed.replace(
      /^\/+/,
      ''
    );
  }

  try {
    const url =
      new URL(trimmed);

    const marker =
      '/storage/v1/object/';

    const index =
      url.pathname.indexOf(
        marker
      );

    if (index === -1) {
      return trimmed;
    }

    let rest =
      url.pathname.slice(
        index +
          marker.length
      );

    rest = rest.replace(
      /^sign\//,
      ''
    );

    rest = rest.replace(
      /^authenticated\//,
      ''
    );

    rest = rest.replace(
      /^public\//,
      ''
    );

    const bucketPrefix =
      `${TUITION_BUCKET}/`;

    if (
      rest.startsWith(
        bucketPrefix
      )
    ) {
      rest =
        rest.slice(
          bucketPrefix.length
        );
    }

    return decodeURIComponent(
      rest
    );
  } catch {
    return trimmed;
  }
}

/* ============================================================
   PUBLIC STORAGE URL
============================================================ */

/*
 * IMPORTANT:
 *
 * tuition-materials bucket is PUBLIC.
 *
 * Therefore we DO NOT use createSignedUrl().
 *
 * Supabase getPublicUrl() generates:
 *
 * https://YOUR-PROJECT.supabase.co/
 * storage/v1/object/public/
 * tuition-materials/
 * filename.pdf
 */

function getPublicMaterialUrl(
  resourcePath: string
): string {
  const normalizedPath =
    normalizeStoragePath(
      resourcePath
    );

  if (!normalizedPath) {
    throw new Error(
      'Invalid tuition material storage path.'
    );
  }

  const { data } =
    supabase.storage
      .from(TUITION_BUCKET)
      .getPublicUrl(
        normalizedPath
      );

  if (!data?.publicUrl) {
    throw new Error(
      'Unable to create the learning material URL.'
    );
  }

  return data.publicUrl;
}

/* ============================================================
   VIEW / DOWNLOAD
============================================================ */

type ResourceAction =
  | 'view'
  | 'download'
  | null;

function MaterialResourceActions({
  resourcePath,
  fileName,
}: {
  resourcePath: string;
  fileName: string;
}) {
  const [pending, setPending] =
    useState<ResourceAction>(
      null
    );

  const [error, setError] =
    useState<string | null>(
      null
    );

  /* ==========================================================
     VIEW
  ========================================================== */

  const handleView = () => {
    if (pending !== null) {
      return;
    }

    setError(null);
    setPending('view');

    try {
      const publicUrl =
        getPublicMaterialUrl(
          resourcePath
        );

      /*
       * IMPORTANT:
       *
       * We intentionally use the same tab.
       *
       * This avoids Android WebView / in-app browser
       * problems where window.open() can return to
       * the homepage.
       *
       * The browser/PDF viewer will open the actual PDF.
       * Pressing Back should return to the tuition page.
       */

      window.location.href =
        publicUrl;
    } catch (err) {
      console.error(
        '[Material View Error]',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Couldn't open this file. Please try again."
      );

      setPending(null);
    }
  };

  /* ==========================================================
     DOWNLOAD
  ========================================================== */

  const handleDownload =
    async () => {
      if (pending !== null) {
        return;
      }

      setError(null);
      setPending('download');

      let objectUrl:
        | string
        | null = null;

      try {
        const publicUrl =
          getPublicMaterialUrl(
            resourcePath
          );

        /*
         * Fetch the public PDF.
         */

        const response =
          await fetch(
            publicUrl,
            {
              method: 'GET',
            }
          );

        if (!response.ok) {
          throw new Error(
            `Download failed (${response.status}).`
          );
        }

        const blob =
          await response.blob();

        if (
          !blob ||
          blob.size === 0
        ) {
          throw new Error(
            'The downloaded file is empty.'
          );
        }

        /*
         * Convert PDF to Blob URL.
         */

        objectUrl =
          URL.createObjectURL(
            blob
          );

        /*
         * Trigger download.
         */

        const link =
          document.createElement(
            'a'
          );

        link.href =
          objectUrl;

        link.download =
          fileName;

        link.style.display =
          'none';

        document.body.appendChild(
          link
        );

        link.click();

        link.remove();

        /*
         * Give Android/browser enough time
         * to start the download.
         */

        const urlToRevoke =
          objectUrl;

        window.setTimeout(
          () => {
            URL.revokeObjectURL(
              urlToRevoke
            );
          },
          5000
        );

        objectUrl = null;
      } catch (err) {
        if (objectUrl) {
          URL.revokeObjectURL(
            objectUrl
          );
        }

        console.error(
          '[Material Download Error]',
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Couldn't download this file. Please try again."
        );
      } finally {
        setPending(null);
      }
    };

  /* ==========================================================
     BUTTONS
  ========================================================== */

  return (
    <div className="flex flex-wrap gap-2">

      {/* ======================================================
          VIEW BUTTON
      ====================================================== */}

      <button
        type="button"
        onClick={handleView}
        disabled={
          pending !== null
        }
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-purple-300 text-purple-700 hover:bg-purple-50 text-xs font-semibold transition-colors disabled:opacity-60 disabled:cursor-wait"
      >
        {pending === 'view' ? (
          <Loader2
            size={14}
            className="animate-spin"
          />
        ) : (
          <Eye size={14} />
        )}

        {pending === 'view'
          ? 'Opening...'
          : 'View'}
      </button>

      {/* ======================================================
          DOWNLOAD BUTTON
      ====================================================== */}

      <button
        type="button"
        onClick={handleDownload}
        disabled={
          pending !== null
        }
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors disabled:opacity-60 disabled:cursor-wait"
      >
        {pending === 'download' ? (
          <Loader2
            size={14}
            className="animate-spin"
          />
        ) : (
          <Download
            size={14}
          />
        )}

        {pending === 'download'
          ? 'Downloading...'
          : 'Download'}
      </button>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <p className="text-xs text-red-500 w-full mt-1">
          {error}
        </p>
      )}
    </div>
  );
}