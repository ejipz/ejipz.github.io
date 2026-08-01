const catalogBackdrop = document.getElementById('catalogBackdrop');
const catalogList = document.getElementById('catalogList');
const catalogSearch = document.getElementById('catalogSearch');
const catalogEmpty = document.getElementById('catalogEmpty');

const catalogSectionLabel = { about:'About Me', experience:'Experience', projects:'Projects', certificates:'Achievements' };
const catalogSectionOrder = ['about','experience','certificates','projects'];

// dot colours
const catalogDotOverride = { projects:'#4F86C6' };
const ACHIEVEMENT_DOT_CERT = '#E08E3D';
const ACHIEVEMENT_DOT_AWARD = '#D4AF37';

function catalogDotColor(sectionKey, data, book, index) {
  // if the book is in the certificates section
  if(sectionKey === 'certificates') {
    // pick orange or gold based on the book type
    return book.type === 'award' ? ACHIEVEMENT_DOT_AWARD : ACHIEVEMENT_DOT_CERT;
  }

  // otherwise, use the catalogDotOverride if the section has one or fallback to the section's accent colour
  return catalogDotOverride[sectionKey] || data.accentCss;
}

// catalogue
function buildCatalogList() {
  // clears out any existing content
  catalogList.innerHTML = '';

  // loops through each section
  catalogSectionOrder.forEach(sectionKey => {
    const data = LIBRARY[sectionKey];

    // skips a section if it is missing, has no books property or has an empty books array
    if(!data || !data.books || !data.books.length) return;

    // build html
    const group = document.createElement('div');
    group.className = 'catalog-group';

    const heading = document.createElement('div');
    heading.className = 'catalog-group-title';
    heading.style.color = data.accentCss;

    // use the section label if defined, otherwise fallback to the raw key
    heading.textContent = catalogSectionLabel[sectionKey] || sectionKey;
    group.appendChild(heading);

    data.books.forEach((book, index) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'catalog-row';
      row.dataset.title = (book.title || '').toLowerCase();
      row.dataset.meta = (book.meta || '').toLowerCase();

      const dot = document.createElement('span');
      dot.className = 'catalog-dot';
      dot.style.background = catalogDotColor(sectionKey, data, book, index);

      const text = document.createElement('span');
      text.className = 'catalog-row-text';
      const titleEl = document.createElement('span');
      titleEl.className = 'catalog-row-title';
      titleEl.textContent = book.title || '';
      const metaEl = document.createElement('span');
      metaEl.className = 'catalog-row-meta';
      metaEl.textContent = book.meta || '';
      text.appendChild(titleEl);
      text.appendChild(metaEl);

      // assembles the dot and text into the row
      row.appendChild(dot);
      row.appendChild(text);

      // setup the click event listener
      row.addEventListener('click', () => {
        // close the catalogue and open the modal that was clicked
        closeCatalog();
        openModal(sectionKey, index);
      });

      group.appendChild(row);
    });

    catalogList.appendChild(group);
  });
}


function filterCatalog(query){
  const q = query.trim().toLowerCase();
  let anyVisible = false;
  document.querySelectorAll('.catalog-group').forEach(group => {
    let groupHasVisible = false;

    group.querySelectorAll('.catalog-row').forEach(row => {
      // math = !q means if the box is empty, everything matches
      // match checks if the query is a substring of either the title or meta
      const match = !q || row.dataset.title.includes(q) || row.dataset.meta.includes(q);
      row.style.display = match ? '' : 'none';
      if(match) groupHasVisible = true;
    });

    group.style.display = groupHasVisible ? '' : 'none';
    if(groupHasVisible) anyVisible = true;
  });
  catalogEmpty.style.display = anyVisible ? 'none' : 'block';
}

function openCatalog(){
  // reset the search box and show everything again
  catalogSearch.value = '';
  filterCatalog('');
  catalogBackdrop.classList.add('open');
  setTimeout(() => catalogSearch.focus(), 50);
}

function closeCatalog(){
  catalogBackdrop.classList.remove('open');
}

// builds the list once then sets up all the event listeners
function bindCatalog(){
  buildCatalogList();

  document.getElementById('catalogClose').addEventListener('click', closeCatalog);
  catalogBackdrop.addEventListener('click', e => { if(e.target.id === 'catalogBackdrop') closeCatalog(); });
  catalogSearch.addEventListener('input', () => filterCatalog(catalogSearch.value));

  // pressing the enter key while searching opens up the first result
  catalogSearch.addEventListener('keydown', e => {
    if(e.key === 'Enter'){
      const firstMatch = catalogList.querySelector('.catalog-row:not([style*="display: none"])');
      if(firstMatch) firstMatch.click();
    }
  });
}