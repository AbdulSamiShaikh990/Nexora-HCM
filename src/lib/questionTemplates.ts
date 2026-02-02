// Question templates for recruitment
export interface Question {
  id: string;
  text: string;
  type: 'text' | 'multiple-choice';
  options?: string[];
  correctAnswers?: string[];
  category: 'personal' | 'technical' | 'behavioral';
}

// Personal attitude questions (3)
const PERSONAL_QUESTIONS: Question[] = [
  {
    id: 'personal-1',
    text: 'What motivates you to do your best work?',
    type: 'text',
    category: 'personal'
  },
  {
    id: 'personal-2', 
    text: 'How do you handle criticism and feedback?',
    type: 'text',
    category: 'personal'
  },
  {
    id: 'personal-3',
    text: 'Describe a time when you had to learn something completely new. How did you approach it?',
    type: 'text',
    category: 'personal'
  }
];

// Behavioral/Soft skills questions (3)
const BEHAVIORAL_QUESTIONS: Question[] = [
  {
    id: 'behavioral-1',
    text: 'Tell me about a stressful situation at work and how you handled it.',
    type: 'text',
    category: 'behavioral'
  },
  {
    id: 'behavioral-2',
    text: 'How do you resolve conflicts within a team?',
    type: 'text', 
    category: 'behavioral'
  },
  {
    id: 'behavioral-3',
    text: 'What is your biggest weakness and how are you working to improve it?',
    type: 'text',
    category: 'behavioral'
  }
];

// Technical questions templates based on role keywords
const TECHNICAL_QUESTIONS: Record<string, Question[]> = {
  // React/Frontend
  react: [
    {
      id: 'tech-react-1',
      text: 'What are React hooks and explain the difference between useState and useEffect?',
      type: 'text',
      category: 'technical'
    },
    {
      id: 'tech-react-2',
      text: 'How do you handle state management in a large React application?',
      type: 'multiple-choice',
      options: ['Redux', 'Context API', 'Zustand', 'All of the above'],
      correctAnswers: ['All of the above'],
      category: 'technical'
    },
    {
      id: 'tech-react-3',
      text: 'Explain the Virtual DOM and its benefits.',
      type: 'text',
      category: 'technical'
    },
    {
      id: 'tech-react-4',
      text: 'What is the difference between controlled and uncontrolled components?',
      type: 'text',
      category: 'technical'
    }
  ],
  
  // JavaScript/Frontend
  javascript: [
    {
      id: 'tech-js-1', 
      text: 'What is the difference between let, const, and var in JavaScript?',
      type: 'text',
      category: 'technical'
    },
    {
      id: 'tech-js-2',
      text: 'Explain promises and async/await in JavaScript.',
      type: 'text',
      category: 'technical'
    },
    {
      id: 'tech-js-3',
      text: 'What is event delegation and why is it useful?',
      type: 'text',
      category: 'technical'
    },
    {
      id: 'tech-js-4',
      text: 'Which of these is NOT a JavaScript data type?',
      type: 'multiple-choice',
      options: ['undefined', 'boolean', 'integer', 'symbol'],
      correctAnswers: ['integer'],
      category: 'technical'
    }
  ],

  // Node.js/Backend  
  nodejs: [
    {
      id: 'tech-node-1',
      text: 'What is the Event Loop in Node.js and how does it work?',
      type: 'text',
      category: 'technical'
    },
    {
      id: 'tech-node-2',
      text: 'Explain the difference between require() and import in Node.js.',
      type: 'text',
      category: 'technical'
    },
    {
      id: 'tech-node-3',
      text: 'How do you handle errors in Node.js?',
      type: 'text', 
      category: 'technical'
    },
    {
      id: 'tech-node-4',
      text: 'What is middleware in Express.js?',
      type: 'text',
      category: 'technical'
    }
  ],

  // Database/SQL
  sql: [
    {
      id: 'tech-sql-1',
      text: 'What are SQL JOINs and explain the different types?',
      type: 'text',
      category: 'technical'
    },
    {
      id: 'tech-sql-2',
      text: 'What is the difference between DELETE, TRUNCATE, and DROP?',
      type: 'text',
      category: 'technical'
    },
    {
      id: 'tech-sql-3',
      text: 'Which SQL command is used to retrieve data from a database?',
      type: 'multiple-choice',
      options: ['GET', 'SELECT', 'FETCH', 'RETRIEVE'],
      correctAnswers: ['SELECT'],
      category: 'technical'
    },
    {
      id: 'tech-sql-4',
      text: 'What is a primary key and why is it important?',
      type: 'text',
      category: 'technical'
    }
  ],

  // Python
  python: [
    {
      id: 'tech-python-1',
      text: 'What is the difference between lists and tuples in Python?',
      type: 'text',
      category: 'technical'
    },
    {
      id: 'tech-python-2',
      text: 'Explain decorators in Python with an example.',
      type: 'text',
      category: 'technical'
    },
    {
      id: 'tech-python-3',
      text: 'What is list comprehension in Python?',
      type: 'text',
      category: 'technical'
    },
    {
      id: 'tech-python-4',
      text: 'Which of these is the correct way to create a virtual environment in Python?',
      type: 'multiple-choice',
      options: ['python -m venv myenv', 'python create-env myenv', 'python virtual myenv', 'python env myenv'],
      correctAnswers: ['python -m venv myenv'],
      category: 'technical'
    }
  ],

  // Java
  java: [
    {
      id: 'tech-java-1',
      text: 'Explain Object-Oriented Programming (OOP) concepts in Java.',
      type: 'text',
      category: 'technical'
    },
    {
      id: 'tech-java-2',
      text: 'What is the difference between abstract class and interface in Java?',
      type: 'text',
      category: 'technical'
    },
    {
      id: 'tech-java-3',
      text: 'What is garbage collection in Java?',
      type: 'text',
      category: 'technical'
    },
    {
      id: 'tech-java-4',
      text: 'Which access modifier makes a variable accessible only within the same class?',
      type: 'multiple-choice',
      options: ['public', 'private', 'protected', 'default'],
      correctAnswers: ['private'],
      category: 'technical'
    }
  ],

  // Generic/General programming
  general: [
    {
      id: 'tech-general-1',
      text: 'What is version control and why is it important?',
      type: 'text',
      category: 'technical'
    },
    {
      id: 'tech-general-2',
      text: 'Explain the difference between frontend and backend development.',
      type: 'text',
      category: 'technical'
    },
    {
      id: 'tech-general-3',
      text: 'What is API and how does it work?',
      type: 'text',
      category: 'technical'
    },
    {
      id: 'tech-general-4',
      text: 'Which of these is NOT a programming paradigm?',
      type: 'multiple-choice',
      options: ['Object-Oriented', 'Functional', 'Procedural', 'Database'],
      correctAnswers: ['Database'],
      category: 'technical'
    }
  ]
};

export function generateQuestionTemplate(jobTitle: string, jobDescription: string): Question[] {
  const title = jobTitle.toLowerCase();
  const description = (jobDescription || '').toLowerCase();
  const combinedText = `${title} ${description}`;
  
  // Always include personal and behavioral questions
  let questions: Question[] = [...PERSONAL_QUESTIONS, ...BEHAVIORAL_QUESTIONS];
  
  // Determine technical questions based on keywords
  let technicalQuestions: Question[] = [];
  
  // Check for specific technologies/frameworks
  if (combinedText.includes('react')) {
    technicalQuestions = TECHNICAL_QUESTIONS.react;
  } else if (combinedText.includes('javascript') || combinedText.includes('js') || combinedText.includes('frontend')) {
    technicalQuestions = TECHNICAL_QUESTIONS.javascript;
  } else if (combinedText.includes('node') || combinedText.includes('backend') || combinedText.includes('server')) {
    technicalQuestions = TECHNICAL_QUESTIONS.nodejs;
  } else if (combinedText.includes('sql') || combinedText.includes('database') || combinedText.includes('mysql') || combinedText.includes('postgresql')) {
    technicalQuestions = TECHNICAL_QUESTIONS.sql;
  } else if (combinedText.includes('python')) {
    technicalQuestions = TECHNICAL_QUESTIONS.python;
  } else if (combinedText.includes('java')) {
    technicalQuestions = TECHNICAL_QUESTIONS.java;
  } else {
    // Default to general programming questions
    technicalQuestions = TECHNICAL_QUESTIONS.general;
  }
  
  // Add 4 technical questions
  questions = [...questions, ...technicalQuestions];
  
  // Ensure we have exactly 10 questions
  return questions.slice(0, 10);
}

export function getDefaultQuestions(): Question[] {
  return [
    ...PERSONAL_QUESTIONS,
    ...BEHAVIORAL_QUESTIONS,
    ...TECHNICAL_QUESTIONS.general
  ].slice(0, 10);
}