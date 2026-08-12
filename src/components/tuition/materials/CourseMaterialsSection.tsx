import { useState } from 'react';
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
  Clock,
  ChevronDown,
  ChevronUp,
  LucideIcon,
} from 'lucide-react';
import {
  CourseMaterialItem,
  CourseMaterials,
  MATERIAL_CATEGORIES,
} from '@/pages/tuition/tuitionCoursesData';

const CATEGORY_ICONS: Record<keyof CourseMaterials, LucideIcon> = {
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

interface CourseMaterialsSectionProps {
  materials: CourseMaterials;
}

export default function CourseMaterialsSection({ materials }: CourseMaterialsSectionProps) {
  const [activeCategory, setActiveCategory] = useState<keyof CourseMaterials>(
    MATERIAL_CATEGORIES[0].key
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const activeMeta = MATERIAL_CATEGORIES.find((c) => c.key === activeCategory)!;
  const activeItems = materials[activeCategory];

  const handleSelectCategory = (key: keyof CourseMaterials) => {
    setActiveCategory(key);
    setExpandedId(null);
  };

  return (
    <section aria-labelledby="learning-materials-heading">
      <div className="flex items-center gap-2 mb-1">
        <h2 id="learning-materials-heading" className="text-xl font-bold text-gray-900">
          Learning Materials
        </h2>
      </div>
      <p className="text-sm text-gray-600 mb-6">
        Browse course materials by category. Items marked as coming soon will be added as they
        become available.
      </p>

      {/* Category tabs */}
      <div
        role="tablist"
        aria-label="Learning material categories"
        className="flex flex-wrap gap-2 mb-6"
      >
        {MATERIAL_CATEGORIES.map(({ key, label }) => {
          const Icon = CATEGORY_ICONS[key];
          const isActive = key === activeCategory;
          const count = materials[key].length;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => handleSelectCategory(key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                isActive
                  ? 'bg-purple-600 border-purple-600 text-white'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-purple-300 hover:text-purple-700'
              }`}
            >
              <Icon size={15} />
              {label}
              <span
                className={`ml-0.5 text-xs rounded-full px-1.5 ${
                  isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active category panel */}
      <div
        role="tabpanel"
        aria-label={${activeMeta.label} materials}
        className="rounded-2xl border border-gray-200 bg-gray-50 p-5 md:p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          {(() => {
            const Icon = CATEGORY_ICONS[activeCategory];
            return (
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-100 text-purple-600">
                <Icon size={16} />
              </div>
            );
          })()}
          <div>
            <h3 className="text-sm font-bold text-gray-900">{activeMeta.label}</h3>
            <p className="text-xs text-gray-500">{activeMeta.description}</p>
          </div>
        </div>

        {activeItems.length === 0 ? (
          <EmptyCategoryState label={activeMeta.label} />
        ) : (
          <ul className="space-y-3">
            {activeItems.map((item) => (
              <MaterialListItem
                key={item.id}
                item={item}
                categoryLabel={activeMeta.label}
                expanded={expandedId === item.id}
                onToggle={() =>
                  setExpandedId((current) => (current === item.id ? null : item.id))
                }
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function EmptyCategoryState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4 rounded-xl border border-dashed border-gray-300 bg-white">
      <Clock size={24} className="text-gray-400 mb-2" />
      <p className="text-sm font-semibold text-gray-700">
        {label} will be available soon
      </p>
      <p className="text-xs text-gray-500 mt-1 max-w-xs">
        We're preparing this content. Check back later for updates.
      </p>
    </div>
  );
}

interface MaterialListItemProps {
  item: CourseMaterialItem;
  categoryLabel: string;
  expanded: boolean;
  onToggle: () => void;
}

function MaterialListItem({ item, categoryLabel, expanded, onToggle }: MaterialListItemProps) {
  const hasResource = Boolean(item.resourceUrl);
  const hasExternalLink = Boolean(item.externalLink);
  const hasAnyResource = hasResource || hasExternalLink;

  return (
    <li className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
            {item.topic && <span>{item.topic}</span>}
            {item.level && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">
                {item.level}
              </span>
            )}
            {!hasAnyResource && (
              <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                <Clock size={11} />
                Coming soon
              </span>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={18} className="text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown size={18} className="text-gray-400 flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-100">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mt-3 mb-1">
            {categoryLabel}
          </p>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">{item.description}</p>

          {hasAnyResource ? (
            <div className="flex flex-wrap gap-2">
              {hasResource && (
                <a
                  href={item.resourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors"
                >
                  <Download size={14} />
                  Download
                </a>
              )}
              {hasExternalLink && (
                <a
                  href={item.externalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:border-purple-300 hover:text-purple-700 text-xs font-semibold transition-colors"
                >
                  <ExternalLink size={14} />
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
