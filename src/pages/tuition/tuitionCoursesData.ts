// Static course catalog data for Vattams Online Tuition.
// Phase 2: static data only — no database tables, no Supabase, no auth.

export type TuitionCourse = {
  slug: string;
  name: string;
  category: string;
  shortDescription: string;
  suitableFor: string;
  mode: string;
  overview: string;
  whoItIsFor: string;
  whatYouWillLearn: string[];
  classFormat: string;
  /**
   * Optional learning-materials catalog for this course.
   * Fully optional and backward-compatible: courses without a "materials"
   * field render an empty/"coming soon" materials section rather than
   * breaking. No real file URLs are invented here — items either omit
   * "resourceUrl"/"externalLink" (shown as "coming soon" in the UI) or,
   * once real files exist, can have them added later.
   */
  materials?: CourseMaterials;
};

/** Indicative difficulty/level tag for a single material item. */
export type MaterialLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels';

/** A single learning-material entry (syllabus doc, worksheet, test paper, etc.). */
export type CourseMaterialItem = {
  /** Stable id, unique within its category for a given course. */
  id: string;
  title: string;
  description: string;
  /** Topic/chapter this material relates to, if applicable. */
  topic?: string;
  level?: MaterialLevel;
  /**
   * Direct file/document URL, when a real downloadable resource exists.
   * Leave undefined until an actual file is available — do not fabricate.
   */
  resourceUrl?: string;
  /**
   * Optional link to an external resource (article, video, tool) related
   * to this material, distinct from a downloadable file.
   */
  externalLink?: string;
  /**
   * The following fields are optional and mainly populated for materials
   * that come from the real tuition_course_materials table (Phase 5.1+).
   * Static demo entries above may safely omit all of them.
   */
  subject?: string;
  /** Grade/class this material targets, e.g. "Class 6" or "All Levels". */
  grade?: string;
  /** Display file type, e.g. "PDF", "DOCX", "Video". */
  fileType?: string;
  /** File size in bytes, when known. */
  fileSizeBytes?: number;
  /** ISO timestamp of when the material was uploaded/created. */
  uploadedAt?: string;
  /** Whether this material is published/visible to students. Defaults to true for static demo items. */
  isPublished?: boolean;
};

/** The 9 learning-material categories supported for every course. */
export type CourseMaterials = {
  courseMaterials: CourseMaterialItem[];
  studyMaterials: CourseMaterialItem[];
  worksheets: CourseMaterialItem[];
  questionBanks: CourseMaterialItem[];
  testPapers: CourseMaterialItem[];
  mockExams: CourseMaterialItem[];
  solutions: CourseMaterialItem[];
  revisionMaterials: CourseMaterialItem[];
  examPreparation: CourseMaterialItem[];
};

/** Ordered list of material categories with their display metadata. */
export const MATERIAL_CATEGORIES: {
  key: keyof CourseMaterials;
  label: string;
  description: string;
}[] = [
  { key: 'courseMaterials', label: 'Course Materials', description: 'Syllabus, curriculum, and course roadmap.' },
  { key: 'studyMaterials', label: 'Study Notes', description: 'Chapter and lesson notes, reference material.' },
  { key: 'worksheets', label: 'Worksheets', description: 'Practice, topic, and homework worksheets.' },
  { key: 'questionBanks', label: 'Question Bank', description: 'Practice and topic-wise questions.' },
  { key: 'testPapers', label: 'Test Papers', description: 'Unit, chapter, monthly, and term tests.' },
  { key: 'mockExams', label: 'Mock Exams', description: 'Full-length and timed practice exams.' },
  { key: 'solutions', label: 'Solutions', description: 'Answer keys and step-by-step solutions.' },
  { key: 'revisionMaterials', label: 'Revision', description: 'Quick revision sheets, formulas, key points.' },
  { key: 'examPreparation', label: 'Exam Preparation', description: 'Exam pattern, strategy, and sample papers.' },
];

/** An empty materials catalog — the safe default for any course. */
export function createEmptyMaterials(): CourseMaterials {
  return {
    courseMaterials: [],
    studyMaterials: [],
    worksheets: [],
    questionBanks: [],
    testPapers: [],
    mockExams: [],
    solutions: [],
    revisionMaterials: [],
    examPreparation: [],
  };
}

/**
 * Returns a course's materials catalog, defaulting to an empty catalog
 * (all categories present, all empty) when the course hasn't defined one
 * yet. This keeps every course's Learning Materials section renderable
 * and category-complete without requiring every course to define data.
 */
export function getCourseMaterials(course: TuitionCourse): CourseMaterials {
  return course.materials ?? createEmptyMaterials();
}

export const tuitionCourses: TuitionCourse[] = [
  {
    slug: 'school-tuition',
    name: 'School Tuition (All Subjects)',
    category: 'School Tuition',
    shortDescription:
      'Personalized, subject-wise support for school students to build strong fundamentals and stay on top of schoolwork.',
    suitableFor: 'Class 1 – Class 10',
    mode: 'Live Online, 1-on-1 or Small Group',
    overview:
      'Our School Tuition program gives students dedicated academic support aligned with their school syllabus. Sessions are tailored to each student\'s pace, covering homework help, concept clarity, and exam readiness across core subjects.',
    whoItIsFor:
      'Students in Class 1 to Class 10 who want consistent academic support alongside their regular school curriculum.',
    whatYouWillLearn: [
      'Stronger grasp of core subject concepts',
      'Better homework and classwork discipline',
      'Improved exam preparation and time management',
      'Confidence to ask questions and clear doubts',
    ],
    classFormat:
      'Live 1-on-1 or small-group online classes, 2–5 sessions per week, with regular progress updates for parents.',
    materials: {
      courseMaterials: [
        {
          id: 'school-tuition-syllabus-map',
          title: 'School Tuition — Subject Coverage Map',
          description: 'An overview of how sessions are structured across core subjects for each class level.',
          topic: 'Full Course',
          level: 'All Levels',
        },
      ],
      studyMaterials: [
        {
          id: 'school-tuition-homework-notes',
          title: 'Homework Support — Concept Notes',
          description: 'Short concept refreshers used alongside homework help sessions.',
          topic: 'Core Subjects',
          level: 'All Levels',
        },
      ],
      worksheets: [
        {
          id: 'school-tuition-daily-practice',
          title: 'Daily Practice Worksheet Set',
          description: 'A rotating set of short practice sheets to reinforce classroom learning.',
          topic: 'Core Subjects',
          level: 'Beginner',
        },
      ],
      questionBanks: [
        {
          id: 'school-tuition-doubt-bank',
          title: 'Common Doubts Question Bank',
          description: 'Frequently asked questions gathered from past sessions, organized by subject.',
          topic: 'Core Subjects',
          level: 'All Levels',
        },
      ],
      testPapers: [
        {
          id: 'school-tuition-progress-check',
          title: 'Monthly Progress Check',
          description: 'A short assessment used to track improvement across core subjects.',
          topic: 'Core Subjects',
          level: 'All Levels',
        },
      ],
      mockExams: [],
      solutions: [
        {
          id: 'school-tuition-worksheet-solutions',
          title: 'Daily Practice Worksheet — Solutions',
          description: 'Worked solutions for the Daily Practice Worksheet Set.',
          topic: 'Core Subjects',
          level: 'Beginner',
        },
      ],
      revisionMaterials: [
        {
          id: 'school-tuition-quick-recap',
          title: 'Quick Recap Sheet',
          description: 'A condensed summary of key points covered in recent sessions.',
          topic: 'Core Subjects',
          level: 'All Levels',
        },
      ],
      examPreparation: [
        {
          id: 'school-tuition-exam-readiness',
          title: 'School Exam Readiness Guide',
          description: 'Tips on structuring revision time ahead of school exams.',
          topic: 'Full Course',
          level: 'All Levels',
        },
      ],
    },
  },
  {
    slug: 'spoken-english',
    name: 'Spoken English',
    category: 'Spoken English',
    shortDescription:
      'Build fluency, confidence, and correct pronunciation for everyday and academic communication.',
    suitableFor: 'Class 3 and above, and adult learners',
    mode: 'Live Online, Small Group',
    overview:
      'This course focuses on practical spoken English skills — pronunciation, vocabulary, grammar in conversation, and confident public speaking — through structured, interactive practice sessions.',
    whoItIsFor:
      'School students who want to improve classroom communication, and adult learners looking to build everyday conversational confidence.',
    whatYouWillLearn: [
      'Clear pronunciation and intonation',
      'Everyday conversational vocabulary',
      'Grammar used naturally in speech',
      'Confidence speaking in groups and presentations',
    ],
    classFormat:
      'Live small-group online classes with regular speaking practice, role-play, and feedback sessions.',
    materials: {
      courseMaterials: [
        {
          id: 'spoken-english-curriculum',
          title: 'Spoken English Curriculum Overview',
          description: 'An outline of the modules covered, from pronunciation basics to presentation skills.',
          topic: 'Full Course',
          level: 'All Levels',
        },
      ],
      studyMaterials: [
        {
          id: 'spoken-english-vocab-notes',
          title: 'Everyday Vocabulary — Notes',
          description: 'Common words and phrases grouped by everyday situations.',
          topic: 'Vocabulary',
          level: 'Beginner',
        },
      ],
      worksheets: [],
      questionBanks: [],
      testPapers: [],
      mockExams: [],
      solutions: [],
      revisionMaterials: [
        {
          id: 'spoken-english-flashcards',
          title: 'Vocabulary Flashcards',
          description: 'Quick-reference flashcards for commonly used conversational vocabulary.',
          topic: 'Vocabulary',
          level: 'All Levels',
        },
      ],
      examPreparation: [],
    },
  },
  {
    slug: 'abacus',
    name: 'Abacus & Mental Arithmetic',
    category: 'Abacus',
    shortDescription:
      'Develop mental math speed, accuracy, and concentration using the abacus method.',
    suitableFor: 'Age 5 – 12',
    mode: 'Live Online, Small Group',
    overview:
      'Our Abacus program builds strong mental arithmetic ability in young learners through a structured, level-based curriculum, improving calculation speed, memory, and focus.',
    whoItIsFor:
      'Children aged 5 to 12 who are beginning or continuing their abacus and mental math learning journey.',
    whatYouWillLearn: [
      'Fast and accurate mental calculation',
      'Improved concentration and memory',
      'Confidence with numbers',
      'A structured, level-based skill progression',
    ],
    classFormat:
      'Live small-group online classes, once or twice a week, with regular practice worksheets.',
    materials: {
      courseMaterials: [
        {
          id: 'abacus-level-roadmap',
          title: 'Abacus Level Roadmap',
          description: 'An outline of the level-based progression from beginner to advanced abacus skills.',
          topic: 'Full Course',
          level: 'All Levels',
        },
      ],
      studyMaterials: [
        {
          id: 'abacus-technique-notes',
          title: 'Bead Technique — Reference Notes',
          description: 'Notes explaining core abacus finger and bead movement techniques.',
          topic: 'Fundamentals',
          level: 'Beginner',
        },
      ],
      worksheets: [
        {
          id: 'abacus-practice-sheet-1',
          title: 'Beginner Practice Sheet — Addition & Subtraction',
          description: 'Practice problems for single and double-digit addition and subtraction on the abacus.',
          topic: 'Addition & Subtraction',
          level: 'Beginner',
        },
      ],
      questionBanks: [],
      testPapers: [
        {
          id: 'abacus-level-1-test',
          title: 'Level 1 Assessment',
          description: 'A short timed assessment to check readiness to progress to the next level.',
          topic: 'Level 1',
          level: 'Beginner',
        },
      ],
      mockExams: [],
      solutions: [
        {
          id: 'abacus-practice-sheet-1-solutions',
          title: 'Beginner Practice Sheet — Solutions',
          description: 'Answer key for the Beginner Practice Sheet.',
          topic: 'Addition & Subtraction',
          level: 'Beginner',
        },
      ],
      revisionMaterials: [
        {
          id: 'abacus-quick-reference',
          title: 'Bead Positions — Quick Reference',
          description: 'A one-page visual reference for common bead positions and movements.',
          topic: 'Fundamentals',
          level: 'All Levels',
        },
      ],
      examPreparation: [],
    },
  },
  {
    slug: 'maths',
    name: 'Mathematics',
    category: 'Maths',
    shortDescription:
      'Concept-first math tuition to strengthen problem-solving skills from basics to advanced topics.',
    suitableFor: 'Class 1 – Class 12',
    mode: 'Live Online, 1-on-1 or Small Group',
    overview:
      'A dedicated Mathematics program covering topics from foundational arithmetic to advanced algebra, geometry, and calculus, with an emphasis on conceptual understanding and problem-solving practice.',
    whoItIsFor:
      'Students in Class 1 to Class 12 who want stronger math fundamentals or focused help with specific topics.',
    whatYouWillLearn: [
      'Strong conceptual foundations',
      'Step-by-step problem-solving techniques',
      'Regular practice with worked examples',
      'Exam-focused revision strategies',
    ],
    classFormat:
      'Live 1-on-1 or small-group online classes, with topic-wise practice sheets and doubt-clearing sessions.',
    materials: {
      courseMaterials: [
        {
          id: 'maths-syllabus',
          title: 'Mathematics Syllabus & Roadmap',
          description: 'Chapter-by-chapter breakdown of topics covered across the course, aligned to grade level.',
          topic: 'Full Course',
          level: 'All Levels',
        },
      ],
      studyMaterials: [
        {
          id: 'maths-algebra-notes',
          title: 'Algebra — Chapter Notes',
          description: 'Concept notes covering linear equations, expressions, and word problems.',
          topic: 'Algebra',
          level: 'Intermediate',
        },
        {
          id: 'maths-geometry-notes',
          title: 'Geometry — Chapter Notes',
          description: 'Notes on angles, triangles, and basic geometric proofs.',
          topic: 'Geometry',
          level: 'Intermediate',
        },
      ],
      worksheets: [
        {
          id: 'maths-arithmetic-worksheet',
          title: 'Arithmetic Practice Worksheet',
          description: 'A set of practice problems covering the four basic operations and fractions.',
          topic: 'Arithmetic',
          level: 'Beginner',
        },
      ],
      questionBanks: [
        {
          id: 'maths-algebra-question-bank',
          title: 'Algebra Question Bank',
          description: 'Topic-wise practice questions ranging from basic to advanced difficulty.',
          topic: 'Algebra',
          level: 'Intermediate',
        },
      ],
      testPapers: [
        {
          id: 'maths-unit-test-1',
          title: 'Unit Test 1 — Numbers & Operations',
          description: 'A short unit test covering the first module of the course.',
          topic: 'Numbers & Operations',
          level: 'Beginner',
        },
      ],
      mockExams: [
        {
          id: 'maths-mock-exam-1',
          title: 'Full-Length Mock Exam',
          description: 'A timed, full-syllabus mock exam to simulate real exam conditions.',
          topic: 'Full Course',
          level: 'Advanced',
        },
      ],
      solutions: [
        {
          id: 'maths-worksheet-1-solutions',
          title: 'Arithmetic Practice Worksheet — Solutions',
          description: 'Step-by-step solutions for the Arithmetic Practice Worksheet.',
          topic: 'Arithmetic',
          level: 'Beginner',
        },
      ],
      revisionMaterials: [
        {
          id: 'maths-formula-sheet',
          title: 'Important Formulas — Quick Reference',
          description: 'A condensed sheet of key formulas for last-minute revision.',
          topic: 'Full Course',
          level: 'All Levels',
        },
      ],
      examPreparation: [
        {
          id: 'maths-exam-strategy',
          title: 'Exam Preparation Strategy Guide',
          description: 'Guidance on exam pattern, time management, and a suggested practice schedule.',
          topic: 'Full Course',
          level: 'All Levels',
        },
      ],
    },
  },
  {
    slug: 'science',
    name: 'Science (Physics, Chemistry, Biology)',
    category: 'Science',
    shortDescription:
      'Clear, concept-driven science tuition covering Physics, Chemistry, and Biology.',
    suitableFor: 'Class 6 – Class 12',
    mode: 'Live Online, 1-on-1 or Small Group',
    overview:
      'This course builds a strong understanding of core scientific concepts across Physics, Chemistry, and Biology, using visual explanations and real-world examples to make science engaging and easy to grasp.',
    whoItIsFor:
      'Students in Class 6 to Class 12 studying Physics, Chemistry, or Biology as part of their school curriculum.',
    whatYouWillLearn: [
      'Clear understanding of core scientific concepts',
      'Practical, real-world application of theory',
      'Diagram and experiment-based learning',
      'Exam-focused revision and practice',
    ],
    classFormat:
      'Live 1-on-1 or small-group online classes with visual aids and regular concept check-ins.',
    materials: {
      courseMaterials: [
        {
          id: 'science-syllabus-overview',
          title: 'Science Syllabus Overview',
          description: 'A breakdown of Physics, Chemistry, and Biology topics covered by class level.',
          topic: 'Full Course',
          level: 'All Levels',
        },
      ],
      studyMaterials: [
        {
          id: 'science-physics-notes',
          title: 'Physics — Core Concepts Notes',
          description: 'Concept notes on motion, force, and energy with real-world examples.',
          topic: 'Physics',
          level: 'Intermediate',
        },
        {
          id: 'science-biology-notes',
          title: 'Biology — Cell Structure Notes',
          description: 'Diagram-supported notes on cell structure and basic life processes.',
          topic: 'Biology',
          level: 'Intermediate',
        },
      ],
      worksheets: [
        {
          id: 'science-chemistry-worksheet',
          title: 'Chemistry Practice Worksheet',
          description: 'Practice questions on elements, compounds, and basic chemical reactions.',
          topic: 'Chemistry',
          level: 'Beginner',
        },
      ],
      questionBanks: [
        {
          id: 'science-physics-question-bank',
          title: 'Physics Question Bank',
          description: 'Topic-wise questions covering motion, force, and energy.',
          topic: 'Physics',
          level: 'Intermediate',
        },
      ],
      testPapers: [
        {
          id: 'science-unit-test-biology',
          title: 'Unit Test — Cell Structure',
          description: 'A short unit test on cell structure and basic life processes.',
          topic: 'Biology',
          level: 'Intermediate',
        },
      ],
      mockExams: [],
      solutions: [
        {
          id: 'science-chemistry-worksheet-solutions',
          title: 'Chemistry Practice Worksheet — Solutions',
          description: 'Step-by-step solutions for the Chemistry Practice Worksheet.',
          topic: 'Chemistry',
          level: 'Beginner',
        },
      ],
      revisionMaterials: [
        {
          id: 'science-key-diagrams',
          title: 'Key Diagrams — Quick Revision',
          description: 'A collection of commonly tested diagrams for quick last-minute review.',
          topic: 'Full Course',
          level: 'All Levels',
        },
      ],
      examPreparation: [
        {
          id: 'science-exam-focus-topics',
          title: 'High-Priority Topics Guide',
          description: 'Guidance on which topics typically carry the most exam weight.',
          topic: 'Full Course',
          level: 'All Levels',
        },
      ],
    },
  },
  {
    slug: 'cbse-icse-state-board',
    name: 'CBSE / ICSE / State Board Tuition',
    category: 'CBSE / ICSE / State Board',
    shortDescription:
      'Board-specific tuition aligned to CBSE, ICSE, and State Board syllabi and exam patterns.',
    suitableFor: 'Class 6 – Class 12',
    mode: 'Live Online, 1-on-1 or Small Group',
    overview:
      'Our board-specific tuition is tailored to the exact syllabus, marking scheme, and exam pattern of CBSE, ICSE, or State Board curricula, helping students prepare with precision for their specific board exams.',
    whoItIsFor:
      'Students in Class 6 to Class 12 following CBSE, ICSE, or a State Board curriculum who want board-aligned exam preparation.',
    whatYouWillLearn: [
      'Syllabus coverage aligned to your specific board',
      'Familiarity with board exam patterns and marking',
      'Previous years\' question practice',
      'Structured revision closer to exams',
    ],
    classFormat:
      'Live 1-on-1 or small-group online classes, with board-specific study material and mock tests.',
    materials: {
      courseMaterials: [
        {
          id: 'board-syllabus-map',
          title: 'Board-wise Syllabus Map',
          description: 'A comparison of how content is organized across CBSE, ICSE, and State Board syllabi.',
          topic: 'Full Course',
          level: 'All Levels',
        },
      ],
      studyMaterials: [
        {
          id: 'board-marking-scheme-notes',
          title: 'Marking Scheme — Reference Notes',
          description: 'Notes explaining how marks are typically distributed for each board.',
          topic: 'Exam Pattern',
          level: 'All Levels',
        },
      ],
      worksheets: [],
      questionBanks: [
        {
          id: 'board-previous-years-questions',
          title: 'Previous Years\' Question Set',
          description: 'A curated set of practice questions in the style of previous board exams.',
          topic: 'Full Course',
          level: 'Advanced',
        },
      ],
      testPapers: [
        {
          id: 'board-term-test-1',
          title: 'Term Test 1',
          description: 'A board-aligned term test covering the first portion of the syllabus.',
          topic: 'Full Course',
          level: 'Intermediate',
        },
      ],
      mockExams: [
        {
          id: 'board-mock-exam-1',
          title: 'Board-Pattern Mock Exam',
          description: 'A full-length mock exam following the structure of actual board papers.',
          topic: 'Full Course',
          level: 'Advanced',
        },
      ],
      solutions: [],
      revisionMaterials: [
        {
          id: 'board-last-minute-revision',
          title: 'Last-Minute Revision Checklist',
          description: 'A checklist of high-priority topics to review just before the exam.',
          topic: 'Full Course',
          level: 'All Levels',
        },
      ],
      examPreparation: [
        {
          id: 'board-exam-strategy-guide',
          title: 'Board Exam Strategy Guide',
          description: 'Guidance on answer presentation, time allocation, and common mistakes to avoid.',
          topic: 'Full Course',
          level: 'All Levels',
        },
      ],
    },
  },
  {
    slug: 'competitive-exam-preparation',
    name: 'Competitive Exam Preparation',
    category: 'Competitive Exam Preparation',
    shortDescription:
      'Focused preparation for competitive entrance and scholarship exams.',
    suitableFor: 'Class 8 – Class 12 and above',
    mode: 'Live Online, Small Group',
    overview:
      'This program prepares students for competitive exams through structured content coverage, timed practice tests, and strategy sessions designed to build both accuracy and speed.',
    whoItIsFor:
      'Students preparing for competitive entrance exams, olympiads, or scholarship tests.',
    whatYouWillLearn: [
      'Structured coverage of exam-relevant topics',
      'Timed mock tests and practice papers',
      'Exam strategy and time-management techniques',
      'Regular performance tracking',
    ],
    classFormat:
      'Live small-group online classes with scheduled mock tests and strategy review sessions.',
    materials: {
      courseMaterials: [
        {
          id: 'competitive-exam-topic-roadmap',
          title: 'Exam-Wise Topic Roadmap',
          description: 'A structured roadmap of topics typically covered for competitive and scholarship exams.',
          topic: 'Full Course',
          level: 'All Levels',
        },
      ],
      studyMaterials: [
        {
          id: 'competitive-exam-shortcut-notes',
          title: 'Quick-Solving Techniques — Notes',
          description: 'Notes on faster problem-solving approaches useful under timed conditions.',
          topic: 'Problem Solving',
          level: 'Advanced',
        },
      ],
      worksheets: [
        {
          id: 'competitive-exam-speed-drill',
          title: 'Speed Drill Worksheet',
          description: 'A set of timed practice problems to build calculation and reasoning speed.',
          topic: 'Speed & Accuracy',
          level: 'Advanced',
        },
      ],
      questionBanks: [
        {
          id: 'competitive-exam-question-bank',
          title: 'Competitive Exam Question Bank',
          description: 'Topic-wise questions in the style of common competitive and olympiad exams.',
          topic: 'Full Course',
          level: 'Advanced',
        },
      ],
      testPapers: [
        {
          id: 'competitive-exam-timed-test-1',
          title: 'Timed Practice Test 1',
          description: 'A timed test simulating exam-day conditions for an early practice checkpoint.',
          topic: 'Full Course',
          level: 'Advanced',
        },
      ],
      mockExams: [
        {
          id: 'competitive-exam-full-mock',
          title: 'Full-Length Mock Exam',
          description: 'A complete, timed mock exam covering the full syllabus scope.',
          topic: 'Full Course',
          level: 'Advanced',
        },
      ],
      solutions: [
        {
          id: 'competitive-exam-speed-drill-solutions',
          title: 'Speed Drill Worksheet — Solutions',
          description: 'Worked solutions and shortcut explanations for the Speed Drill Worksheet.',
          topic: 'Speed & Accuracy',
          level: 'Advanced',
        },
      ],
      revisionMaterials: [
        {
          id: 'competitive-exam-formula-sheet',
          title: 'Key Formulas & Shortcuts',
          description: 'A condensed reference sheet of frequently used formulas and shortcuts.',
          topic: 'Full Course',
          level: 'All Levels',
        },
      ],
      examPreparation: [
        {
          id: 'competitive-exam-strategy-plan',
          title: 'Preparation Strategy & Practice Schedule',
          description: 'A suggested week-by-week practice schedule leading up to the exam.',
          topic: 'Full Course',
          level: 'All Levels',
        },
      ],
    },
  },
  {
    slug: 'other-online-tuition',
    name: 'Other Online Tuition',
    category: 'Other Online Tuition',
    shortDescription:
      'Custom online tuition for subjects, skills, or learning needs not covered above.',
    suitableFor: 'All ages',
    mode: 'Live Online, Flexible Format',
    overview:
      'Have a learning need that doesn\'t fit into a standard category? This is a flexible tuition option covering additional subjects, skills, or custom learning plans tailored to individual requirements.',
    whoItIsFor:
      'Students or learners with specific subject or skill needs outside our standard course categories.',
    whatYouWillLearn: [
      'A learning plan customized to your specific goals',
      'Flexible pacing based on individual needs',
      'Focused attention on the areas that matter most to you',
    ],
    classFormat:
      'Live online classes with a format and schedule customized to the learner\'s needs.',
    materials: {
      courseMaterials: [
        {
          id: 'other-tuition-getting-started',
          title: 'Getting Started — What to Expect',
          description: 'An overview of how a custom learning plan is put together for this tuition option.',
          topic: 'Full Course',
          level: 'All Levels',
        },
      ],
      studyMaterials: [],
      worksheets: [],
      questionBanks: [],
      testPapers: [],
      mockExams: [],
      solutions: [],
      revisionMaterials: [],
      examPreparation: [],
    },
  },
];

export function getTuitionCourseBySlug(slug: string | null): TuitionCourse | undefined {
  if (!slug) return undefined;
  return tuitionCourses.find((course) => course.slug === slug);
}