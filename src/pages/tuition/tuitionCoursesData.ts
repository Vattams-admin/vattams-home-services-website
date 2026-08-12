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
};

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
  },
];

export function getTuitionCourseBySlug(slug: string | null): TuitionCourse | undefined {
  if (!slug) return undefined;
  return tuitionCourses.find((course) => course.slug === slug);
}