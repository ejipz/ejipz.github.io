// setup database connection
const SUPABASE_URL = 'https://zxdnwfzpgndezdjmmgya.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4ZG53ZnpwZ25kZXpkam1tZ3lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2MTMyNTcsImV4cCI6MjEwMTE4OTI1N30.PRGgXK5--BkkkVam_KRimsU1VEX-RBtAW3__3DV47Vw';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// bookshelves styling
const SECTION_META = {
  projects: {
    accentHex: 0x5B9C93, accentCss:'var(--accent-projects)', callPrefix:'PRJ',
    colors:[0x5B9C93,0x8480B8,0xC98A4B,0x8FAE8B,0x9A6B54,0x4F7C93]
  },
  certificates: {
    accentHex:0xC98A4B, accentCss:'var(--accent-certs)', callPrefix:'CRT',
    colors:[0xC98A4B,0x9A6B54,0xC9A876,0x8480B8],
    awardColors:[0xD4AF37,0xB8860B,0xCD9B3F,0xE0B972]
  },
  experience: {
    accentHex:0x8480B8, accentCss:'var(--accent-exp)', callPrefix:'EXP',
    colors:[0x8480B8,0x5B9C93,0x9A6B54,0x4F7C93]
  },
  about: {
    accentHex:0x8FAE8B, accentCss:'var(--accent-about)', callPrefix:'ABT',
    colors:[0x8FAE8B,0xC98A4B,0x5B9C93]
  }
};

let LIBRARY = null;

// fetch content from the database
async function loadLibrary() {
  // create the library obj
  const library = {};
  Object.keys(SECTION_META).forEach(key => {
    library[key] = { ...SECTION_META[key], books: [] };
  });

  // select everything from the books table sorted by ascending order in the sort_order col
  // await waits until the req finishes before running the next line
  const { data: rows, error } = await supabaseClient
    .from('books')
    .select('*')
    .order('sort_order', { ascending: true });

  // error handling
  if(error) {
    // log the error to the browser console and use the empty library obj
    console.error('Failed to load portfolio content from Supabase:', error);
    LIBRARY = library;
    return LIBRARY;
  }

  rows.forEach(row => {
    const section = library[row.section];
    if(!section) return; 

    // create a book obj for each row
    const book = {
      slug: row.slug,
      title: row.title,
      meta: row.meta || '', // fallback to an empty string if there is no value
      description: row.description || '',
      tags: row.tags || [],
      links: row.links || []
    };

    if(row.type) book.type = row.type;
    if(row.bullets) book.bullets = row.bullets;
    if(row.schools) book.schools = row.schools;
    if(row.image) book.image = row.image;
    if(row.related) book.related = row.related;

    // push the book obj into the books array of the lib obj
    section.books.push(book);
  });

  LIBRARY = library;
  return LIBRARY;
}