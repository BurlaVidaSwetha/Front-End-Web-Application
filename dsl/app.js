/* ════════════════════════════════════════════════════
   DIGITAL SMART LIBRARY — app.js
   Shared data layer · Security · Error handling
════════════════════════════════════════════════════ */
'use strict';

/* ══════════════════════════════════════════════════
   CO4 — EXCEPTION HANDLING: Custom Error Classes
══════════════════════════════════════════════════ */
class BorrowError     extends Error { constructor(msg){ super(msg); this.name='BorrowError';     } }
class ValidationError extends Error { constructor(msg){ super(msg); this.name='ValidationError'; } }
class StorageError    extends Error { constructor(msg){ super(msg); this.name='StorageError';    } }

/* ── CO5 SECURITY: Input Sanitizer (XSS prevention) ── */
function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#x27;')
    .replace(/[/]/g,'&#x2F;')
    .replace(/on\w+\s*=/gi, '')        // strip inline event handlers
    .replace(/<script[\s\S]*?<\/script>/gi,'') // strip script tags
    .trim();
}

/* ── CO4 — Global Error Handler ── */
window.addEventListener('error', function(e) {
  console.error('[DSL Error]', e.message, e.filename, e.lineno);
  showToast('Something went wrong: ' + e.message, 'err');
});
window.addEventListener('unhandledrejection', function(e) {
  console.error('[DSL Unhandled Promise]', e.reason);
  showToast('Unexpected error occurred', 'err');
});

/* ════════════════════════════════════════════════════
   DIGITAL SMART LIBRARY — app.js
   Shared utilities, data store, book database
════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════
   KEYS
══════════════════════════════════════════════════ */
const KEYS = {
  currentUser: 'dsl_current_user',
  users:       'dsl_users',
  books:       'dsl_books',
  studentState: id => 'dsl_student_' + id
};

/* ══════════════════════════════════════════════════
   BOOK DATABASE
══════════════════════════════════════════════════ */
const DEFAULT_BOOKS = [
  { id:'b001', title:'Clean Code', author:'Robert C. Martin', category:'Programming', difficulty:'Intermediate', cover:'💻', rating:4.8, popularity:97, description:'A handbook of agile software craftsmanship. Learn to write clean, readable, maintainable code. Covers naming conventions, functions, comments, formatting, and refactoring.', concepts:['Refactoring','Functions','Classes','Unit Testing','Code Smells','SOLID'], pages:431, year:2008, copies:5, price:49, availableCopies:181 },
  { id:'b002', title:'The Pragmatic Programmer', author:'David Thomas & Andrew Hunt', category:'Programming', difficulty:'Intermediate', cover:'🔧', rating:4.7, popularity:94, description:'Your journey to mastery. From journeyman to master — covers career tips, coding philosophy, debugging, testing, and professional practices every developer must know.', concepts:['DRY Principle','Debugging','Automation','Testing','Design by Contract'], pages:352, year:2019, copies:4, price:49, availableCopies:114 },
  { id:'b003', title:'Introduction to Algorithms', author:'Cormen, Leiserson, Rivest', category:'Programming', difficulty:'Advanced', cover:'📐', rating:4.6, popularity:96, description:'The bible of algorithms — comprehensive coverage of data structures and algorithms with rigorous mathematical analysis. Used in top CS programs worldwide.', concepts:['Sorting','Graph Algorithms','Dynamic Programming','Complexity Analysis','Trees','Heaps'], pages:1292, year:2009, copies:3, price:79, availableCopies:103 },
  { id:'b004', title:'Cracking the Coding Interview', author:'Gayle Laakmann McDowell', category:'Programming', difficulty:'Intermediate', cover:'🎯', rating:4.8, popularity:99, description:'189 programming questions and solutions covering all major topics tested in tech interviews at FAANG companies. Includes behavioral tips, system design basics.', concepts:['Arrays','Linked Lists','Trees','Graphs','Recursion','Dynamic Programming','Bit Manipulation'], pages:696, year:2015, copies:6, price:59, availableCopies:194 },
  { id:'b005', title:"You Don't Know JS", author:'Kyle Simpson', category:'Programming', difficulty:'Intermediate', cover:'🟡', rating:4.7, popularity:91, description:'A deep dive into JavaScript mechanics — scope, closures, this keyword, prototypes, asynchrony, and performance. Go beyond surface-level understanding.', concepts:['Closures','Prototypes','Async/Await','Event Loop','Scope','this Keyword'], pages:278, year:2015, copies:5, price:39, availableCopies:135 },
  { id:'b006', title:'Python Crash Course', author:'Eric Matthes', category:'Programming', difficulty:'Beginner', cover:'🐍', rating:4.6, popularity:95, description:'Fast-paced, thorough introduction to Python. Perfect for beginners — covers syntax, data structures, functions, classes, and hands-on projects.', concepts:['Variables','Lists','Functions','Classes','Files','Testing','Django basics'], pages:544, year:2019, copies:7, price:35, availableCopies:131 },
  { id:'b007', title:'System Design Interview', author:'Alex Xu', category:'Programming', difficulty:'Advanced', cover:'🏗️', rating:4.8, popularity:93, description:"Insider's guide to system design interviews. Covers scalability, load balancing, caching, databases, microservices, and real-world system designs.", concepts:['Scalability','Load Balancing','Caching','Databases','Microservices','API Design'], pages:318, year:2020, copies:4, price:69, availableCopies:128 },
  { id:'b008', title:'Design Patterns', author:'Gang of Four', category:'Programming', difficulty:'Advanced', cover:'🧩', rating:4.5, popularity:88, description:'The classic book on software design patterns — covers 23 essential patterns including creational, structural, and behavioral patterns with real examples.', concepts:['Singleton','Factory','Observer','Strategy','Decorator','MVC','SOLID'], pages:395, year:1994, copies:3, price:79, availableCopies:117 },
  { id:'b009', title:'Operating System Concepts', author:'Silberschatz, Galvin', category:'Academic', difficulty:'Intermediate', cover:'⚙️', rating:4.5, popularity:92, description:'The definitive OS textbook. Covers processes, threads, CPU scheduling, memory management, file systems, security, and distributed systems.', concepts:['Processes','Threads','Scheduling','Memory Management','File Systems','Deadlock'], pages:976, year:2018, copies:5, price:55, availableCopies:194 },
  { id:'b010', title:'Database System Concepts', author:'Silberschatz, Korth, Sudarshan', category:'Academic', difficulty:'Intermediate', cover:'🗃️', rating:4.4, popularity:89, description:'Comprehensive coverage of database theory and practice — relational algebra, SQL, normalization, transactions, concurrency control, and NoSQL.', concepts:['SQL','Normalization','Transactions','ACID','Indexing','Query Optimization'], pages:1376, year:2019, copies:4, price:55, availableCopies:113 },
  { id:'b011', title:'Computer Networks', author:'Andrew Tanenbaum', category:'Academic', difficulty:'Intermediate', cover:'🌐', rating:4.5, popularity:87, description:'Top-down approach to networking. Covers all OSI layers, TCP/IP protocols, routing, congestion control, wireless networks, and network security.', concepts:['TCP/IP','DNS','HTTP','Routing','OSI Model','Socket Programming','Firewalls'], pages:960, year:2010, copies:4, price:55, availableCopies:186 },
  { id:'b012', title:'Discrete Mathematics', author:'Kenneth H. Rosen', category:'Academic', difficulty:'Intermediate', cover:'∑', rating:4.3, popularity:82, description:'Foundational math for computer science — logic, sets, number theory, induction, graph theory, combinatorics, probability, and Boolean algebra.', concepts:['Logic','Set Theory','Graph Theory','Combinatorics','Induction','Number Theory'], pages:1072, year:2018, copies:6, price:45, availableCopies:194 },
  { id:'b013', title:'Linear Algebra and Its Applications', author:'Gilbert Strang', category:'Academic', difficulty:'Intermediate', cover:'📊', rating:4.6, popularity:85, description:'Intuitive approach to linear algebra with applications in data science, machine learning, and engineering. Includes eigenvalues, SVD, and PCA.', concepts:['Matrices','Eigenvalues','Vector Spaces','SVD','Orthogonality','Transformations'], pages:576, year:2016, copies:5, price:45, availableCopies:169 },
  { id:'b014', title:'Artificial Intelligence: A Modern Approach', author:'Stuart Russell & Peter Norvig', category:'Academic', difficulty:'Advanced', cover:'🤖', rating:4.7, popularity:94, description:'The most widely used AI textbook. Covers search, logic, planning, learning, neural networks, robotics, and natural language processing.', concepts:['Search Algorithms','Machine Learning','Neural Networks','NLP','Planning','Robotics'], pages:1152, year:2020, copies:3, price:89, availableCopies:111 },
  { id:'b015', title:'Atomic Habits', author:'James Clear', category:'Personality', difficulty:'Beginner', cover:'⚛️', rating:4.9, popularity:99, description:'A proven framework for building good habits and breaking bad ones. The 1% rule — tiny changes, remarkable results. Transform your life through compound improvement.', concepts:['Habit Loop','Cue-Routine-Reward','Identity Change','Environment Design','1% Rule'], pages:320, year:2018, copies:8, price:29, availableCopies:175 },
  { id:'b016', title:'Deep Work', author:'Cal Newport', category:'Personality', difficulty:'Beginner', cover:'🎯', rating:4.7, popularity:93, description:'Rules for focused success in a distracted world. Learn to perform cognitively demanding tasks without distraction — the superpower of the 21st century.', concepts:['Focus','Flow State','Shallow Work','Deliberate Practice','Digital Minimalism'], pages:296, year:2016, copies:6, price:29, availableCopies:154 },
  { id:'b017', title:'The 7 Habits of Highly Effective People', author:'Stephen R. Covey', category:'Personality', difficulty:'Beginner', cover:'🌟', rating:4.6, popularity:95, description:'Timeless principles for personal and interpersonal effectiveness. Covers paradigm shifts, proactivity, prioritization, synergy, and continuous self-renewal.', concepts:['Proactivity','Prioritization','Win-Win','Empathic Listening','Synergy','Sharpening the Saw'], pages:381, year:2013, copies:7, price:29, availableCopies:104 },
  { id:'b018', title:'Thinking, Fast and Slow', author:'Daniel Kahneman', category:'Personality', difficulty:'Intermediate', cover:'🧠', rating:4.7, popularity:92, description:'Nobel laureate explores the two systems that drive the way we think — fast intuitive thinking vs. slow deliberate reasoning. Groundbreaking insights into decision-making.', concepts:['System 1 & 2','Cognitive Bias','Heuristics','Prospect Theory','Anchoring'], pages:499, year:2011, copies:5, price:35, availableCopies:103 },
  { id:'b019', title:'The Power of Now', author:'Eckhart Tolle', category:'Personality', difficulty:'Beginner', cover:'🌅', rating:4.5, popularity:88, description:'A guide to spiritual enlightenment and living in the present moment. Learn to silence your internal critic, stop overthinking, and find peace.', concepts:['Mindfulness','Present Moment','Ego','Consciousness','Acceptance'], pages:236, year:2004, copies:6, price:25, availableCopies:111 },
  { id:'b020', title:'Rich Dad Poor Dad', author:'Robert T. Kiyosaki', category:'Personality', difficulty:'Beginner', cover:'💰', rating:4.4, popularity:96, description:"The #1 personal finance book. Two fathers, two different mindsets about money. Learn to make money work for you through assets, investments, and financial literacy.", concepts:['Financial Literacy','Assets vs Liabilities','Cash Flow','Investing','Entrepreneurship'], pages:336, year:2011, copies:8, price:25, availableCopies:127 },
  { id:'b021', title:'The Alchemist', author:'Paulo Coelho', category:'Novels', difficulty:'Beginner', cover:'⭐', rating:4.7, popularity:97, description:"A magical fable about following your dreams. Santiago's journey from shepherd to treasure hunter teaches about personal legend, the soul of the world, and omens.", concepts:["Personal Legend",'Destiny','Perseverance','Self-Discovery','Spirituality'], pages:208, year:1988, copies:10, price:19, availableCopies:129 },
  { id:'b022', title:'To Kill a Mockingbird', author:'Harper Lee', category:'Novels', difficulty:'Beginner', cover:'🐦', rating:4.8, popularity:93, description:'A masterpiece of American literature. Scout Finch grows up in the Deep South during the 1930s, witnessing racial injustice and moral complexity through a child\'s eyes.', concepts:['Justice','Empathy','Racism','Childhood','Moral Courage'], pages:376, year:1960, copies:6, price:19, availableCopies:164 },
  { id:'b023', title:'1984', author:'George Orwell', category:'Novels', difficulty:'Intermediate', cover:'👁️', rating:4.8, popularity:95, description:'A dystopian masterpiece about totalitarianism, surveillance, and the destruction of truth. Winston Smith\'s rebellion against the oppressive Party remains eternally relevant.', concepts:['Totalitarianism','Surveillance','Propaganda','Truth','Freedom','Doublethink'], pages:328, year:1949, copies:7, price:19, availableCopies:177 },
  { id:'b024', title:'Harry Potter and the Philosopher\'s Stone', author:'J.K. Rowling', category:'Novels', difficulty:'Beginner', cover:'⚡', rating:4.9, popularity:99, description:'The magical beginning of the Harry Potter series. An orphan boy discovers he\'s a wizard on his 11th birthday and enters the world of Hogwarts School of Witchcraft and Wizardry.', concepts:['Magic','Friendship','Courage','Good vs Evil','Identity','Belonging'], pages:309, year:1997, copies:12, price:19, availableCopies:103 },
  { id:'b025', title:'The Hitchhiker\'s Guide to the Galaxy', author:'Douglas Adams', category:'Novels', difficulty:'Beginner', cover:'🌌', rating:4.7, popularity:89, description:"A hilarious science fiction comedy about Arthur Dent's adventures after Earth is demolished to make way for a hyperspace bypass. Don't forget your towel!", concepts:['Satire','Philosophy','Absurdism','Adventure','British Humor'], pages:224, year:1979, copies:5, price:19, availableCopies:171 },
  { id:'b026', title:'Elements of Programming Interviews', author:'Adnan Aziz, Tsung-Hsien Lee', category:'Career', difficulty:'Advanced', cover:'📋', rating:4.7, popularity:95, description:'Comprehensive preparation for programming interviews. 300+ problems with detailed solutions, covering all major data structures and algorithms topics.', concepts:['Data Structures','Algorithms','Problem Solving','Optimization','Code Review','Complexity'], pages:504, year:2018, copies:4, price:69, availableCopies:125 },
  { id:'b027', title:'What Color Is Your Parachute?', author:'Richard N. Bolles', category:'Career', difficulty:'Beginner', cover:'🪂', rating:4.3, popularity:82, description:"The world's most popular job-hunting book. Practical guide to finding your ideal career through self-assessment, networking, and modern job-search techniques.", concepts:['Career Planning','Job Search','Self Assessment','Networking','Interviews','Resume Writing'], pages:352, year:2020, copies:5, price:29, availableCopies:191 },
  { id:'b028', title:"Soft Skills: The Software Developer's Life Manual", author:'John Sonmez', category:'Career', difficulty:'Beginner', cover:'💼', rating:4.4, popularity:86, description:'A guide for developers beyond technical skills — career management, personal branding, productivity, finances, fitness, and relationships.', concepts:['Personal Branding','Networking','Productivity','Financial Independence','Career Growth'], pages:504, year:2014, copies:4, price:35, availableCopies:183 },
  { id:'b029', title:'Zero to One', author:'Peter Thiel & Blake Masters', category:'Career', difficulty:'Intermediate', cover:'🔮', rating:4.6, popularity:92, description:"Notes on startups, or how to build the future. Peter Thiel's contrarian thinking on monopolies, secrets, and building companies that create something new.", concepts:['Startups','Monopoly','Innovation','Technology','Venture Capital','Future'], pages:224, year:2014, copies:5, price:39, availableCopies:189 },
  { id:'b030', title:'The Art of the Start 2.0', author:'Guy Kawasaki', category:'Career', difficulty:'Intermediate', cover:'🎨', rating:4.3, popularity:80, description:'The time-tested guide for anyone starting anything. Practical advice on creating, fundraising, recruiting, launching, and managing.', concepts:['Entrepreneurship','Pitching','Business Model','Leadership','Marketing','Bootstrapping'], pages:330, year:2015, copies:4, price:39, availableCopies:169 }
];

/* ══════════════════════════════════════════════════
   STORAGE HELPERS
══════════════════════════════════════════════════ */
function getBooks() {
  try {
    const stored = localStorage.getItem(KEYS.books);
    if (stored) {
      const books = JSON.parse(stored);
      /* Migration: fill price + availableCopies if missing (old localStorage data) */
      let needsSave = false;
      books.forEach(b => {
        const def = DEFAULT_BOOKS.find(d => d.id === b.id);
        /* treat price===0 OR undefined as missing — 0 is never a valid borrow fee */
        const priceInvalid = (b.price === undefined || b.price === 0 || b.price === null);
        const availInvalid = (b.availableCopies === undefined || b.availableCopies === null);
        if (def) {
          if (priceInvalid)  { b.price = def.price;                     needsSave = true; }
          if (availInvalid)  { b.availableCopies = def.availableCopies; needsSave = true; }
        } else {
          if (priceInvalid)  { b.price = 39;   needsSave = true; }
          if (availInvalid)  { b.availableCopies = 150; needsSave = true; }
        }
      });
      if (needsSave) saveBooks(books); /* persist migrated data */
      return books;
    }
  } catch(e) {}
  return JSON.parse(JSON.stringify(DEFAULT_BOOKS));
}
function saveBooks(books) {
  try { localStorage.setItem(KEYS.books, JSON.stringify(books)); } catch(e) {}
}

function getUsers() {
  try {
    const stored = localStorage.getItem(KEYS.users);
    if (stored) return JSON.parse(stored);
  } catch(e) {}
  return getDefaultUsers();
}
function saveUsers(users) {
  try { localStorage.setItem(KEYS.users, JSON.stringify(users)); } catch(e) {}
}

function getDefaultUsers() {
  return [
    { id:'admin', name:'Head Librarian', email:'admin@library.edu', role:'librarian', joinDate:'2024-01-01', status:'active' },
    { id:'STU2024001', name:'Arjun Sharma', email:'arjun@library.edu', role:'student', joinDate:'2024-08-01', booksIssued:2, fine:20, status:'active' },
    { id:'STU2024002', name:'Priya Reddy', email:'priya@library.edu', role:'student', joinDate:'2024-08-05', booksIssued:1, fine:0, status:'active' },
    { id:'STU2024003', name:'Kiran Patel', email:'kiran@library.edu', role:'student', joinDate:'2024-08-10', booksIssued:3, fine:50, status:'active' },
    { id:'STU2024004', name:'Sneha Iyer', email:'sneha@library.edu', role:'student', joinDate:'2024-09-01', booksIssued:0, fine:0, status:'active' }
  ];
}

function getCurrentUser() {
  try {
    const stored = localStorage.getItem(KEYS.currentUser);
    if (stored) return JSON.parse(stored);
  } catch(e) {}
  return null;
}
function setCurrentUser(user) {
  try { localStorage.setItem(KEYS.currentUser, JSON.stringify(user)); } catch(e) {}
}
function clearCurrentUser() {
  try { localStorage.removeItem(KEYS.currentUser); } catch(e) {}
}

function getStudentState(userId) {
  try {
    const stored = localStorage.getItem(KEYS.studentState(userId));
    if (stored) {
      const state = JSON.parse(stored);
      /* Migration: fill borrowFee from current book prices if missing or 0 */
      if (state.issued && state.issued.length) {
        let needsSave = false;
        const books = getBooks();
        state.issued.forEach(item => {
          if (!item.borrowFee || item.borrowFee === 0) {
            const book = books.find(b => b.id === item.bookId);
            if (book && book.price > 0) { item.borrowFee = book.price; needsSave = true; }
          }
        });
        if (needsSave) {
          saveStudentState(userId, state);
          /* Also sync user.fine to match sum of borrowFees */
          try {
            const users = getUsers();
            const idx = users.findIndex(u => u.id === userId);
            if (idx >= 0) {
              users[idx].fine = state.issued.reduce((s,i) => s + (i.borrowFee||0), 0);
              saveUsers(users);
            }
          } catch(e) {}
        }
      }
      return state;
    }
  } catch(e) {}
  return { favs: [], history: [], issued: [] };
}
function saveStudentState(userId, state) {
  try { localStorage.setItem(KEYS.studentState(userId), JSON.stringify(state)); } catch(e) {}
}

/* ══════════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════════ */
let _toastTimer = null;
function showToast(msg, type = 'info') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast ' + type + ' show';
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

/* ══════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════ */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const diff = Math.floor((Date.now() - d) / 1000);
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return d.toLocaleDateString('en-IN', { month:'short', day:'numeric' });
}

/* ══════════════════════════════════════════════════
   SIDEBAR TOGGLE (shared)
══════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════
   LECTURER STATE
══════════════════════════════════════════════════ */
function getLecturerState(userId) {
  try {
    var s = localStorage.getItem('dsl_lecturer_' + userId);
    if (s) {
      var state = JSON.parse(s);
      /* Migration: fill borrowFee from current book prices if missing or 0 */
      if (state.issued && state.issued.length) {
        var needsSave = false;
        var books = getBooks();
        state.issued.forEach(function(item) {
          if (!item.borrowFee || item.borrowFee === 0) {
            var book = books.find(function(b){ return b.id === item.bookId; });
            if (book && book.price > 0) { item.borrowFee = book.price; needsSave = true; }
          }
        });
        if (needsSave) {
          saveLecturerState(userId, state);
          try {
            var users = getUsers();
            var idx = users.findIndex(function(u){ return u.id === userId; });
            if (idx >= 0) {
              users[idx].fine = state.issued.reduce(function(s,i){ return s + (i.borrowFee||0); }, 0);
              saveUsers(users);
            }
          } catch(e) {}
        }
      }
      return state;
    }
  } catch(e) {}
  return { issued: [] };
}
function saveLecturerState(userId, state) {
  try { localStorage.setItem('dsl_lecturer_' + userId, JSON.stringify(state)); } catch(e) {}
}

/* ══════════════════════════════════════════════════
   SUBJECT-BOOKS  (librarian assigns → student/lecturer read)
══════════════════════════════════════════════════ */
function getSubjectBooks() {
  try { var s = localStorage.getItem('dsl_subject_books'); if (s) return JSON.parse(s); } catch(e) {}
  return {};
}
function saveSubjectBooks(data) {
  try { localStorage.setItem('dsl_subject_books', JSON.stringify(data)); } catch(e) {}
}
function getSubjectBookIds(branch, year, subjectId) {
  return (getSubjectBooks())[branch + '_' + year + '_' + subjectId] || [];
}
function setSubjectBookIds(branch, year, subjectId, bookIds) {
  var all = getSubjectBooks();
  all[branch + '_' + year + '_' + subjectId] = bookIds;
  saveSubjectBooks(all);
}

/* ══════════════════════════════════════════════════
   SUGGESTIONS  (lecturer writes → librarian reads)
══════════════════════════════════════════════════ */
function getSuggestions() {
  try { var s = localStorage.getItem('dsl_suggestions'); if (s) return JSON.parse(s); } catch(e) {}
  return [];
}
function saveSuggestions(list) {
  try { localStorage.setItem('dsl_suggestions', JSON.stringify(list)); } catch(e) {}
}
