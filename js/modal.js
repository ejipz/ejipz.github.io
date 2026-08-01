const backdrop = document.getElementById('modalBackdrop');
const card = document.getElementById('modalCard');

// grabs every element of the modal
const els = {
  stamp: document.getElementById('modalStamp'),
  callCode: document.getElementById('modalCallCode'),
  checkout: document.getElementById('modalCheckout'),
  eyebrow: document.getElementById('modalEyebrow'),
  title: document.getElementById('modalTitle'),
  meta: document.getElementById('modalMeta'),
  image: document.getElementById('modalImage'),
  desc: document.getElementById('modalDesc'),
  schools: document.getElementById('modalSchools'),
  bullets: document.getElementById('modalBullets'),
  tags: document.getElementById('modalTags'),
  links: document.getElementById('modalLinks'),
  related: document.getElementById('modalRelated')
};

// shelf names
const eyebrowLabel = { projects:'Project', certificates:'Achievement', experience:'Experience', about:'About' };
const stampLabel = { projects:'ON SHELF', certificates:'EARNED', experience:'ON RECORD', about:'REFERENCE ONLY' };

const typeEyebrowLabel = { cert:'Certificate', award:'Award' };
const typeStampLabel = { cert:'EARNED', award:'AWARDED' };

const LINK_ICONS = {
  email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>',
  github: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>'
};

// picking the icon of a link
function getLinkIcon(link) {
  // show nothing if the link obj's icon property is set to none
  if(link.icon === false || link.icon === 'none') return '';

  // if the link specified an icon, use the specified icon
  if(link.icon) return LINK_ICONS[link.icon] || '';

  // otherwise, infer icon from link label
  const label = (link.label||'').toLowerCase();
  const url = (link.url||'').toLowerCase();
  if(url.startsWith('mailto:') || label.includes('email')) return LINK_ICONS.email;
  if(label.includes('linkedin')) return LINK_ICONS.linkedin;
  if(label.includes('github')) return LINK_ICONS.github;
  if(url.startsWith('tel:') || label.includes('phone') || label.includes('call')) return LINK_ICONS.phone;
  
  return '';
}

// normalise book urls
function normalizeUrl(url) {
  if(!url || url === '#') return '#';

  //  if the url starts with http:, https: or mailto:, leave it as it is
  if(/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) return url;

  // if not, prepend https to the url
  return 'https://' + url;
}

function findBookIndexByTitle(sectionKey, title){
  const section = LIBRARY[sectionKey];
  if(!section) return -1;
  return section.books.findIndex(b => b.title === title);
}

function openModal(sectionKey, index){
  const data = LIBRARY[sectionKey];
  const book = data.books[index];
  const callCode = `${data.callPrefix}.${String(index+1).padStart(2,'0')}`;

  if (book.slug) {
    // history.replaceState is a browser API that allows whats shown in the address bar to be changed
    history.replaceState(null, '', `#${sectionKey}/${book.slug}`);
  }

  card.style.setProperty('--current-accent', data.accentCss);
  els.stamp.textContent = (book.type && typeStampLabel[book.type]) || stampLabel[sectionKey] || 'ISSUED';
  els.callCode.textContent = callCode;
  els.eyebrow.textContent = (book.type && typeEyebrowLabel[book.type]) || eyebrowLabel[sectionKey] || 'Entry';
  els.title.textContent = book.title;
  els.meta.textContent = book.meta || ''; // fallback to an empty string if the meta field is empty

  els.image.innerHTML = '';
  if(book.image){
    els.image.classList.add('show');
    const img = document.createElement('img');
    img.src = book.image;
    img.alt = book.title || '';
    els.image.appendChild(img);
  } else {
    els.image.classList.remove('show');
  }

  els.desc.innerHTML = book.description || '';

  // gets today's date, formats it nicely and adds it as a stamp
  const today = new Date();
  const issued = today.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
  els.checkout.innerHTML = `BORROWED BY<br><strong>You</strong><br><br>DATE ISSUED<br>${issued}`;

  if(els.schools){
    els.schools.innerHTML = '';
    if(book.schools && book.schools.length){
      els.schools.classList.add('show');
      book.schools.forEach(s=>{
        const row = document.createElement('div');
        row.className = 'school-row';

        const badge = document.createElement('div');
        badge.className = 'school-badge';

        if(s.logo){
          badge.classList.add('has-logo');
          const img = document.createElement('img');
          img.src = s.logo;
          img.alt = `${s.name||''} logo`;
          badge.appendChild(img);
        } else {
          badge.style.background = s.color || data.accentCss;
          badge.textContent = s.initials || '';
        }

        const info = document.createElement('div');
        info.className = 'school-info';
        info.innerHTML = '<div class="school-name"></div><div class="school-program"></div><div class="school-years"></div>';
        info.querySelector('.school-name').textContent = s.name || '';
        info.querySelector('.school-program').textContent = s.program || '';
        info.querySelector('.school-years').textContent = s.years || '';

        row.appendChild(badge);
        row.appendChild(info);
        els.schools.appendChild(row);
      });
    } else {
      els.schools.classList.remove('show');
    }
  }

  if(book.bullets && book.bullets.length){
    els.bullets.style.display = 'block';
    els.bullets.innerHTML = book.bullets.map(b=>`<li>${b}</li>`).join('');
  } else {
    els.bullets.style.display = 'none'; els.bullets.innerHTML = '';
  }
  els.tags.innerHTML = (book.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('');
  els.links.innerHTML = (book.links||[]).map(l=>`<a class="btn ${l.primary?'primary':''}" href="${normalizeUrl(l.url)}" target="_blank" rel="noopener">${getLinkIcon(l)}${l.label}</a>`).join('');

  if(els.related){
    const resolved = (book.related||[])
      // find the position of the related book
      .map(r => ({ section:r.section, index: findBookIndexByTitle(r.section, r.title) }))
      .filter(r => r.index !== -1);
    if(resolved.length){
      els.related.style.display = 'flex';
      els.related.innerHTML = '<span class="related-label">See also</span>' +
        resolved.map(r => {
          const relTitle = LIBRARY[r.section].books[r.index].title;
          return `<button type="button" class="related-btn" data-section="${r.section}" data-index="${r.index}">${relTitle}</button>`;
        }).join('');
    } else {
      els.related.style.display = 'none';
      els.related.innerHTML = '';
    }
  }

  backdrop.classList.add('open');
}

if(document.getElementById('modalRelated')){
  document.getElementById('modalRelated').addEventListener('click', (e) => {
    const btn = e.target.closest('.related-btn');
    if(!btn) return;
    openModal(btn.dataset.section, Number(btn.dataset.index));
  });
}

function closeModal(){
  backdrop.classList.remove('open');
  history.replaceState(null, '', location.pathname + location.search); // reset the address bar back
}

function openBookFromUrl(){
  // hash is what comes after the # in the url
  const hash = location.hash.replace(/^#/, '');

  // if there is nothing after the hash, return
  if(!hash) return;

  // split hash into sectionKey and slug
  const [sectionKey, slug] = hash.split('/');

  // if sectionKey or slug does not exist, return
  if(!sectionKey || !slug || !LIBRARY[sectionKey]) return;

  // search the section for the book
  const index = LIBRARY[sectionKey].books.findIndex(b => b.slug === slug);
  if(index !== -1) openModal(sectionKey, index); // if a match is found, open the modal
}

openBookFromUrl();

// run the openBookFromUrl function everytime the fragment identifier of the url changes
window.addEventListener('hashchange', openBookFromUrl);