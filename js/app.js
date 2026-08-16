(function () {
  'use strict';

  var STORAGE_KEY = 'lagosplaces_saved_v1';

  var state = {
    q: '',
    area: '',
    budget: 0,
    vibe: '',
    occasion: '',
    sort: 'score',
    collection: ''
  };

  var data = { places: [], collections: [], config: { areas: [], budgets: [], occasions: [], vibes: [], categories: [] } };
  var saved = loadSaved();

  function loadSaved() {
    try {
      return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
    } catch (e) {
      return new Set();
    }
  }

  function persistSaved() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(saved)));
    } catch (e) {}
  }

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function icon(name) {
    return '<i class="hgi-stroke hgi-' + name + '" aria-hidden="true"></i>';
  }

  function byId(id) {
    for (var i = 0; i < data.places.length; i++) {
      if (data.places[i].id === id) return data.places[i];
    }
    return null;
  }

  function categoryOf(id) {
    for (var i = 0; i < data.config.categories.length; i++) {
      if (data.config.categories[i].id === id) return data.config.categories[i];
    }
    return { id: id, label: id, icon: 'star' };
  }

  function vibeLabel(id) {
    for (var i = 0; i < data.config.vibes.length; i++) {
      if (data.config.vibes[i].id === id) return data.config.vibes[i].label;
    }
    return id;
  }

  function occasionLabel(id) {
    for (var i = 0; i < data.config.occasions.length; i++) {
      if (data.config.occasions[i].id === id) return data.config.occasions[i].label;
    }
    return id;
  }

  function budgetOf(level) {
    for (var i = 0; i < data.config.budgets.length; i++) {
      if (data.config.budgets[i].level === level) return data.config.budgets[i];
    }
    return { level: level, price: '', label: '' };
  }

  function priceMark(p) {
    return budgetOf(p.price).price;
  }

  function isSaved(id) {
    return saved.has(id);
  }

  function toggleSave(id) {
    if (isSaved(id)) {
      saved.delete(id);
    } else {
      saved.add(id);
    }
    persistSaved();
    updateSaveButtons(id);
    updateSavedCount();
  }

  function updateSaveButtons(id) {
    var on = isSaved(id);
    var p = byId(id);
    var label = p ? p.name : 'place';
    $$('[data-save="' + id + '"]').forEach(function (btn) {
      btn.classList.toggle('is-saved', on);
      btn.setAttribute('aria-pressed', String(on));
      btn.setAttribute('aria-label', (on ? 'Remove ' : 'Save ') + label);
      var hasSpan = btn.querySelector('span');
      btn.innerHTML = icon(on ? 'bookmark-01' : 'bookmark-02') + (hasSpan ? ' <span>' + (on ? 'Saved' : 'Save') + '</span>' : '');
      if (btn.classList.contains('btn--primary') || btn.classList.contains('btn--dark')) {
        btn.classList.toggle('btn--dark', on);
        btn.classList.toggle('btn--primary', !on);
      }
    });
  }

  function updateSavedCount() {
    var el = $('#saved-count');
    if (!el) return;
    var n = saved.size;
    if (n > 0) {
      el.textContent = n;
      el.hidden = false;
    } else {
      el.hidden = true;
    }
  }

  var toastTimer = null;
  function toast(msg) {
    var el = $('#toast');
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove('is-visible');
    }, 2200);
  }

  function mapsUrl(p) {
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.name + ', ' + p.area + ', Lagos');
  }

  function placeUrl(id) {
    return '#/place/' + id;
  }

  function sharePlace(p) {
    var url = location.origin + location.pathname + '#/place/' + p.id;
    var payload = { title: p.name + ' | Lagos Places', text: p.bestFor, url: url };
    if (navigator.share) {
      navigator.share(payload).catch(function () {});
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        toast('Link copied');
      }).catch(function () {
        toast('Could not copy the link');
      });
    } else {
      toast('Sharing is not supported here');
    }
  }

  function placeCardHtml(p) {
    var on = isSaved(p.id);
    var cat = categoryOf(p.category);
    var chips = (p.vibe || []).slice(0, 2).map(function (v) {
      return '<span class="mini-chip">' + esc(vibeLabel(v)) + '</span>';
    }).join('');
    return '' +
      '<article class="place-card" data-card="' + esc(p.id) + '" tabindex="0" role="link" aria-label="Open ' + esc(p.name) + '">' +
        '<div class="place-card__media">' +
          '<img src="' + esc(p.image) + '" alt="' + esc(p.name) + ' in ' + esc(p.area) + '" loading="lazy" decoding="async" onerror="this.style.display=\'none\'">' +
          '<span class="place-card__badge">' + icon(cat.icon) + esc(cat.label) + '</span>' +
          '<button class="btn btn--icon place-card__save' + (on ? ' is-saved' : '') + '" data-save="' + esc(p.id) + '" aria-label="' + (on ? 'Remove ' : 'Save ') + esc(p.name) + '" aria-pressed="' + on + '">' +
            icon(on ? 'bookmark-01' : 'bookmark-02') +
          '</button>' +
        '</div>' +
        '<div class="place-card__body">' +
          '<h3 class="place-card__title">' + esc(p.name) + '</h3>' +
          '<div class="place-card__facts">' +
            '<span class="score">' + icon('star') + p.score + '</span>' +
            '<span class="fact">' + icon('location-01') + esc(p.area) + '</span>' +
            '<span class="fact">' + esc(priceMark(p)) + '</span>' +
          '</div>' +
          (chips ? '<div class="place-card__chips">' + chips + '</div>' : '') +
          '<p class="place-card__best">' + esc(p.bestFor) + '</p>' +
        '</div>' +
      '</article>';
  }

  function cardGrid(list) {
    return '<div class="card-grid">' + list.map(placeCardHtml).join('') + '</div>';
  }

  function renderHome() {
    var featured = data.places.filter(function (p) { return p.featured; }).sort(function (a, b) { return b.score - a.score; });

    var moods = [
      { id: 'date-night', label: 'Date night', icon: 'heart-check' },
      { id: 'brunch', label: 'Brunch', icon: 'restaurant-table' },
      { id: 'birthday', label: 'Birthday', icon: 'gift' },
      { id: 'work', label: 'Work', icon: 'briefcase-01' },
      { id: 'chill', label: 'Chill', icon: 'sofa-01' },
      { id: 'party', label: 'Party', icon: 'sparkles' },
      { id: 'family', label: 'Family', icon: 'happy' },
      { id: 'beach-day', label: 'Beach day', icon: 'beach' },
      { id: 'night-out', label: 'Night out', icon: 'moon-01' },
      { id: 'tourist', label: 'Tourist', icon: 'compass-01' }
    ];

    var moodHtml = moods.map(function (m, i) {
      var dark = i % 3 === 0 ? ' mood--dark' : '';
      return '<a class="mood' + dark + '" href="#/explore?occasion=' + m.id + '">' +
        '<span class="mood__icon">' + icon(m.icon) + '</span>' +
        '<span class="mood__label">' + m.label + '</span>' +
      '</a>';
    }).join('');

    var heroChips = [
      { label: 'Date night', href: '#/explore?occasion=date-night' },
      { label: 'Brunch', href: '#/explore?occasion=brunch' },
      { label: 'Under ₦20k', href: '#/explore?budget=1' },
      { label: 'Open late', href: '#/explore?collection=open-late' },
      { label: 'Mainland gems', href: '#/explore?collection=mainland-gems' },
      { label: 'First dates', href: '#/explore?collection=first-dates' }
    ].map(function (c) {
      return '<a class="chip" href="' + c.href + '">' + esc(c.label) + '</a>';
    }).join('');

    var collHtml = data.collections.map(function (c) {
      var cover = c.places.length ? byId(c.places[0]) : null;
      return '<a class="coll-card" href="#/collection/' + c.id + '">' +
        '<span class="coll-card__bg"><img src="' + (cover ? esc(cover.image) : '') + '" alt="" loading="lazy" decoding="async"></span>' +
        '<span class="coll-card__body">' +
          '<span class="coll-card__name">' + icon(c.icon) + esc(c.name) + '</span>' +
          '<span class="coll-card__blurb">' + esc(c.blurb) + '</span>' +
          '<span class="coll-card__count">' + c.places.length + ' places</span>' +
        '</span>' +
      '</a>';
    }).join('');

    $('#main').innerHTML =
      '<section class="hero">' +
        '<div class="container hero__inner">' +
          '<h1 class="hero__title">Know where to <span class="hl">go.</span></h1>' +
          '<p class="hero__lead">Restaurants, bars, coffee spots and more across Lagos, picked by hand and checked against the things that matter here: price, noise, parking, security, dress code.</p>' +
          '<form class="search" id="hero-search">' +
            '<div class="search__box">' + icon('search-01') +
              '<input type="search" name="q" placeholder="Search a place, an area or a vibe" aria-label="Search places" autocomplete="off">' +
            '</div>' +
            '<button class="btn btn--primary" type="submit">Search</button>' +
          '</form>' +
          '<div class="hero__chips">' + heroChips + '</div>' +
          '<p class="hero__trust">' + icon('checkmark-badge-01') + ' Paid visibility never buys a score.</p>' +
        '</div>' +
      '</section>' +

      '<section class="section">' +
        '<div class="container">' +
          '<div class="section__head">' +
            '<div><h2 class="section__title">What are you in the mood for?</h2></div>' +
          '</div>' +
          '<div class="mood-grid">' + moodHtml + '</div>' +
        '</div>' +
      '</section>' +

      '<section class="section section--tint">' +
        '<div class="container">' +
          '<div class="section__head">' +
            '<div><h2 class="section__title">Editor\'s picks this week</h2></div>' +
            '<a class="section__link" href="#/explore">See all places ' + icon('arrow-right-01') + '</a>' +
          '</div>' +
          cardGrid(featured) +
        '</div>' +
      '</section>' +

      '<section class="section">' +
        '<div class="container">' +
          '<div class="section__head">' +
            '<div><h2 class="section__title">Shortlists worth copying</h2><p class="section__sub">Curated lists for the moments that come up again and again.</p></div>' +
            '<a class="section__link" href="#/collections">All collections ' + icon('arrow-right-01') + '</a>' +
          '</div>' +
          '<div class="coll-grid">' + collHtml + '</div>' +
        '</div>' +
      '</section>' +

      '<section class="trust">' +
        '<div class="container section">' +
          '<div class="trust__grid">' +
            '<div class="trust__item">' +
              '<span class="trust__icon">' + icon('checkmark-badge-01') + '</span>' +
              '<div><h2 class="trust__title">Researched, not scraped</h2><p class="trust__text">Each place is vetted by a human and judged on what Lagos actually asks about.</p></div>' +
            '</div>' +
            '<div class="trust__item">' +
              '<span class="trust__icon">' + icon('security') + '</span>' +
              '<div><h2 class="trust__title">Paid visibility, never paid opinions</h2><p class="trust__text">Venues can pay to be seen. They cannot pay for a score or a recommendation.</p></div>' +
            '</div>' +
            '<div class="trust__item">' +
              '<span class="trust__icon">' + icon('location-01') + '</span>' +
              '<div><h2 class="trust__title">Built for Lagos</h2><p class="trust__text">Price per head, traffic, security, dress code. The stuff map apps get wrong.</p></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</section>';
  }

  function activeFilterLabels() {
    var labels = [];
    if (state.q) labels.push('Search: ' + state.q);
    if (state.collection) {
      var coll = data.collections.find(function (c) { return c.id === state.collection; });
      if (coll) labels.push(coll.name);
    }
    if (state.area) labels.push(state.area);
    if (state.budget) labels.push(budgetOf(state.budget).label);
    if (state.vibe) labels.push(vibeLabel(state.vibe));
    if (state.occasion) labels.push(occasionLabel(state.occasion));
    return labels;
  }

  function hasActiveFilters() {
    return state.q || state.area || state.budget || state.vibe || state.occasion || state.collection;
  }

  function getFiltered() {
    var list = data.places.slice();
    if (state.collection) {
      var coll = data.collections.find(function (c) { return c.id === state.collection; });
      if (coll) {
        list = coll.places.map(byId).filter(function (p) { return !!p; });
      }
    }
    if (state.q) {
      var q = state.q.toLowerCase();
      list = list.filter(function (p) {
        return (p.name + ' ' + p.area + ' ' + p.category + ' ' + p.bestFor + ' ' + p.description + ' ' + (p.vibe || []).join(' ') + ' ' + (p.occasions || []).join(' ') + ' ' + (p.tags || []).join(' ')).toLowerCase().indexOf(q) !== -1;
      });
    }
    if (state.area) {
      list = list.filter(function (p) { return p.area === state.area; });
    }
    if (state.budget) {
      list = list.filter(function (p) { return p.price === state.budget; });
    }
    if (state.vibe) {
      list = list.filter(function (p) { return (p.vibe || []).indexOf(state.vibe) !== -1; });
    }
    if (state.occasion) {
      list = list.filter(function (p) { return (p.occasions || []).indexOf(state.occasion) !== -1; });
    }
    list.sort(function (a, b) {
      if (state.sort === 'price-asc') return a.price - b.price || b.score - a.score;
      if (state.sort === 'price-desc') return b.price - a.price || b.score - a.score;
      return b.score - a.score;
    });
    return list;
  }

  function renderResults() {
    var list = getFiltered();
    var results = $('#results');
    if (list.length) {
      results.innerHTML = cardGrid(list);
    } else {
      results.innerHTML =
        '<div class="empty">' +
          '<span class="empty__icon">' + icon('search-01') + '</span>' +
          '<h3 class="empty__title">No places match those filters</h3>' +
          '<p class="empty__text">Try a wider budget or a different area.</p>' +
          '<button class="btn btn--outline" data-clear>Clear all filters</button>' +
        '</div>';
    }
    var countEl = $('#results-count');
    if (countEl) {
      countEl.textContent = (state.collection ? 'In this shortlist: ' : 'Showing ') + list.length + (list.length === 1 ? ' place' : ' places');
    }
    var summary = $('#filters-summary');
    if (summary) {
      var labels = activeFilterLabels();
      summary.textContent = labels.length ? 'Filters: ' + labels.join(', ') : '';
    }
    var clearBtn = $('#clear-filters');
    if (clearBtn) {
      clearBtn.hidden = !hasActiveFilters();
    }
    var metaEl = $('#filters-meta');
    if (metaEl) {
      metaEl.hidden = !hasActiveFilters();
    }
  }

  function chipActiveStates() {
    $$('[data-chip]').forEach(function (chip) {
      var f = chip.getAttribute('data-filter');
      var v = chip.getAttribute('data-value');
      var on = false;
      if (f === 'occasion') on = state.occasion === v;
      if (f === 'vibe') on = state.vibe === v;
      if (f === 'budget') on = String(state.budget) === v;
      chip.classList.toggle('is-active', on);
      chip.setAttribute('aria-pressed', String(on));
    });
  }

  function syncInputsFromState() {
    var qEl = $('#explore-q');
    if (qEl) qEl.value = state.q;
    var areaEl = $('#filter-area');
    if (areaEl) areaEl.value = state.area;
    var budgetEl = $('#filter-budget');
    if (budgetEl) budgetEl.value = state.budget ? String(state.budget) : '';
    var vibeEl = $('#filter-vibe');
    if (vibeEl) vibeEl.value = state.vibe;
    var sortEl = $('#filter-sort');
    if (sortEl) sortEl.value = state.sort;
    chipActiveStates();
  }

  function selectOptions(configList, selected, emptyLabel) {
    var html = '<option value="">' + emptyLabel + '</option>';
    configList.forEach(function (item) {
      var val = typeof item === 'object' ? item.id || item.level : item;
      var label = typeof item === 'object' ? item.label : item;
      html += '<option value="' + val + '"' + (String(selected) === String(val) ? ' selected' : '') + '>' + esc(label) + '</option>';
    });
    return html;
  }

  function renderExplore() {
    var head = 'Find your kind of place';
    if (state.collection) {
      var coll = data.collections.find(function (c) { return c.id === state.collection; });
      if (coll) head = coll.name;
    }

    var occasionChips = data.config.occasions.map(function (o) {
      return '<button class="chip" data-chip data-filter="occasion" data-value="' + o.id + '" aria-pressed="false">' + esc(o.label) + '</button>';
    }).join('');

    var vibeChips = data.config.vibes.map(function (v) {
      return '<button class="chip" data-chip data-filter="vibe" data-value="' + v.id + '" aria-pressed="false">' + esc(v.label) + '</button>';
    }).join('');

    var budgetChips = data.config.budgets.map(function (b) {
      return '<button class="chip" data-chip data-filter="budget" data-value="' + b.level + '" aria-pressed="false">' + esc(b.label) + '</button>';
    }).join('');

    $('#main').innerHTML =
      '<div class="container explore__head">' +
        '<h1 class="explore__title">' + esc(head) + '</h1>' +
        '<p class="explore__count" id="results-count"></p>' +
      '</div>' +

      '<div class="filters">' +
        '<div class="container">' +
          '<div class="filters__row">' +
            '<div class="search filters__search">' +
              '<div class="search__box">' + icon('search-01') +
                '<input type="search" id="explore-q" placeholder="Search within these results" aria-label="Search within results" autocomplete="off">' +
              '</div>' +
            '</div>' +
            '<div class="filters__selects">' +
              '<div class="field"><select id="filter-area" aria-label="Area">' + selectOptions(data.config.areas, state.area, 'Any area') + '</select><span class="field__icon">' + icon('arrow-down-01') + '</span></div>' +
              '<div class="field"><select id="filter-budget" aria-label="Budget">' + selectOptions(data.config.budgets.map(function (b) { return { id: b.level, label: b.label }; }), state.budget, 'Any budget') + '</select><span class="field__icon">' + icon('arrow-down-01') + '</span></div>' +
              '<div class="field"><select id="filter-vibe" aria-label="Vibe">' + selectOptions(data.config.vibes, state.vibe, 'Any vibe') + '</select><span class="field__icon">' + icon('arrow-down-01') + '</span></div>' +
              '<div class="field"><select id="filter-sort" aria-label="Sort">' + selectOptions([{ id: 'score', label: 'Score' }, { id: 'price-asc', label: 'Price, low to high' }, { id: 'price-desc', label: 'Price, high to low' }], state.sort, 'Score') + '</select><span class="field__icon">' + icon('arrow-down-01') + '</span></div>' +
            '</div>' +
            '<button class="btn btn--outline mobile-filters-btn" data-open-sheet>' + icon('filter-horizontal') + ' Filters</button>' +
          '</div>' +
          '<div class="chips-row filters__occasions" aria-label="Occasions">' + occasionChips + '</div>' +
          '<div class="filters__meta" id="filters-meta">' +
            '<span class="filters__summary" id="filters-summary"></span>' +
            '<button class="btn btn--ghost" id="clear-filters" hidden>Clear</button>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="results container" id="results"></div>';
    syncInputsFromState();
    renderResults();
    bindExploreInputs();
  }

  function buildSheet() {
    var vibeChips = data.config.vibes.map(function (v) {
      return '<button class="chip" data-chip data-filter="vibe" data-value="' + v.id + '" aria-pressed="false">' + esc(v.label) + '</button>';
    }).join('');
    var budgetChips = data.config.budgets.map(function (b) {
      return '<button class="chip" data-chip data-filter="budget" data-value="' + b.level + '" aria-pressed="false">' + esc(b.label) + '</button>';
    }).join('');

    $('#filter-sheet').innerHTML =
      '<p class="sheet__title">Filters</p>' +
      '<div class="sheet__group">' +
        '<p class="sheet__label">Area</p>' +
        '<div class="field"><select id="sheet-area" aria-label="Area">' + selectOptions(data.config.areas, state.area, 'Any area') + '</select><span class="field__icon">' + icon('arrow-down-01') + '</span></div>' +
      '</div>' +
      '<div class="sheet__group">' +
        '<p class="sheet__label">Budget</p>' +
        '<div class="sheet__chips">' + budgetChips + '</div>' +
      '</div>' +
      '<div class="sheet__group">' +
        '<p class="sheet__label">Vibe</p>' +
        '<div class="sheet__chips">' + vibeChips + '</div>' +
      '</div>' +
      '<div class="sheet__group">' +
        '<p class="sheet__label">Sort</p>' +
        '<div class="field"><select id="sheet-sort" aria-label="Sort">' + selectOptions([{ id: 'score', label: 'Score' }, { id: 'price-asc', label: 'Price, low to high' }, { id: 'price-desc', label: 'Price, high to low' }], state.sort, 'Score') + '</select><span class="field__icon">' + icon('arrow-down-01') + '</span></div>' +
      '</div>' +
      '<div class="sheet__footer">' +
        '<button class="btn btn--outline" data-sheet-clear>Clear</button>' +
        '<button class="btn btn--primary" data-sheet-close>Done</button>' +
      '</div>';
  }

  function openSheet() {
    buildSheet();
    var sheet = $('#filter-sheet');
    sheet.hidden = false;
    $('#sheet-backdrop').hidden = false;
    requestAnimationFrame(function () {
      sheet.classList.add('is-open');
    });
    syncInputsFromState();
    var first = $('select,button', sheet);
    if (first) first.focus();
  }

  function closeSheet() {
    var sheet = $('#filter-sheet');
    sheet.classList.remove('is-open');
    $('#sheet-backdrop').hidden = true;
    setTimeout(function () {
      sheet.hidden = true;
    }, 260);
  }

  function clearFilters() {
    state.q = '';
    state.area = '';
    state.budget = 0;
    state.vibe = '';
    state.occasion = '';
    state.collection = '';
    syncInputsFromState();
    renderResults();
  }

  function bindExploreInputs() {
    var qEl = $('#explore-q');
    if (qEl) {
      qEl.addEventListener('input', function () {
        state.q = qEl.value.trim();
        renderResults();
      });
    }
    var map = { 'filter-area': 'area', 'filter-budget': 'budget', 'filter-vibe': 'vibe', 'filter-sort': 'sort' };
    Object.keys(map).forEach(function (sel) {
      var el = document.getElementById(sel);
      if (!el) return;
      el.addEventListener('change', function () {
        var key = map[sel];
        var val = el.value;
        state[key] = (key === 'budget') ? Number(val) : val;
        chipActiveStates();
        renderResults();
      });
    });
  }

  function attributeRows(p) {
    var items = [
      ['money-01', 'Average spend', p.spend],
      ['heart-check', 'Dates', p.dates],
      ['gift', 'Birthdays', p.birthdays],
      ['user-group', 'Groups', p.groups],
      ['volume-high', 'Noise', p.noise],
      ['car-parking-01', 'Parking', p.parking],
      ['shirt-01', 'Dress code', p.dressCode],
      ['security', 'Security', p.security],
      ['checkmark-circle-01', 'Reservation', p.reservation],
      ['sun-01', 'Best time to go', p.bestTime],
      ['sun-01', 'Setting', p.setting],
      ['wifi-01', 'Power and Wi-Fi', p.wifi],
      ['music-note-01', 'Music', p.music],
      ['user-multiple', 'Crowd', p.crowd]
    ];
    return items.filter(function (it) { return it[2]; }).map(function (it) {
      return '<div class="attr">' +
        '<span class="attr__icon">' + icon(it[0]) + '</span>' +
        '<div><p class="attr__label">' + it[1] + '</p><p class="attr__value">' + esc(it[2]) + '</p></div>' +
      '</div>';
    }).join('');
  }

  function hoursRows(p) {
    if (!p.hours) return '';
    var keys = Object.keys(p.hours);
    return '<div class="hours">' + keys.map(function (k) {
      return '<div class="hours__row"><span>' + esc(k) + '</span><strong>' + esc(p.hours[k]) + '</strong></div>';
    }).join('') + '</div>' +
      '<p class="hours__note">Hours change. Check with the venue before you go.</p>';
  }

  function contactRows(p) {
    var rows = [];
    if (p.area) rows.push(['location-01', 'Address', p.area + ', Lagos']);
    if (p.phone) rows.push(['call', 'Phone', p.phone]);
    if (p.website) rows.push(['globe', 'Website', p.website]);
    if (p.instagram) rows.push(['instagram', 'Instagram', '@' + p.instagram]);
    if (!rows.length) return '';
    return rows.map(function (r) {
      return '<div class="attr">' +
        '<span class="attr__icon">' + icon(r[0]) + '</span>' +
        '<div><p class="attr__label">' + r[1] + '</p><p class="attr__value">' + esc(r[2]) + '</p></div>' +
      '</div>';
    }).join('');
  }

  function renderPlace(id) {
    var p = byId(id);
    if (!p) {
      renderNotFound('That place is not in the guide yet');
      return;
    }
    var cat = categoryOf(p.category);
    var on = isSaved(p.id);
    var budget = budgetOf(p.price);

    var actions = '';
    actions += '<button class="btn ' + (on ? 'btn--dark' : 'btn--primary') + '" data-save="' + esc(p.id) + '" aria-pressed="' + on + '">' + icon(on ? 'bookmark-01' : 'bookmark-02') + ' <span>' + (on ? 'Saved' : 'Save') + '</span></button>';
    actions += '<button class="btn btn--outline" data-share="' + esc(p.id) + '">' + icon('share-01') + ' Share</button>';
    actions += '<a class="btn btn--dark" href="' + esc(mapsUrl(p)) + '" target="_blank" rel="noopener">' + icon('navigation-01') + ' Directions</a>';
    if (p.website) actions += '<a class="btn btn--outline" href="' + esc(p.website) + '" target="_blank" rel="noopener">' + icon('globe') + ' Website</a>';
    if (p.instagram) actions += '<a class="btn btn--outline" href="https://instagram.com/' + esc(p.instagram) + '" target="_blank" rel="noopener">' + icon('instagram') + ' Instagram</a>';
    if (p.phone) actions += '<a class="btn btn--outline" href="tel:' + esc(p.phone) + '">' + icon('call') + ' Call</a>';

    var gallery = (p.gallery && p.gallery.length) ?
      '<div class="block-title">Photos</div><div class="rail">' + p.gallery.map(function (g) {
        return '<img src="' + esc(g) + '" alt="More photos of ' + esc(p.name) + '" loading="lazy" decoding="async" onerror="this.style.display=\'none\'">';
      }).join('') + '</div>' : '';

    var similar = data.places.filter(function (x) {
      return x.id !== p.id && (x.category === p.category || (x.vibe || []).some(function (v) { return (p.vibe || []).indexOf(v) !== -1; }));
    }).sort(function (a, b) { return b.score - a.score; }).slice(0, 3);

    var relatedHtml = similar.length ? '<div class="block-title">You might also like</div>' + cardGrid(similar) : '';

    $('#main').innerHTML =
      '<div class="place container">' +
        '<a class="btn btn--outline place__back" href="#/explore">' + icon('arrow-left-01') + ' Back to explore</a>' +
        '<div class="place__hero"><img src="' + esc(p.image) + '" alt="' + esc(p.name) + ' in ' + esc(p.area) + '" onerror="this.style.display=\'none\'"></div>' +

        '<div class="place__head">' +
          '<h1 class="place__title">' + esc(p.name) + '</h1>' +
          '<div class="place__meta">' +
            '<span class="place__score">' + icon('star') + p.score + ' <span>Lagos score</span></span>' +
            '<span class="meta-pill">' + icon(cat.icon) + esc(cat.label) + '</span>' +
            '<span class="meta-pill">' + icon('location-01') + esc(p.area) + '</span>' +
            '<span class="meta-pill">' + icon('wallet-01') + esc(budget.label) + '</span>' +
          '</div>' +
          '<div class="place__actions">' + actions + '</div>' +
        '</div>' +

        '<div class="place__layout">' +
          '<div>' +
            '<p class="place__desc">' + esc(p.description) + '</p>' +
            '<div class="callouts">' +
              '<div class="callout"><p class="callout__head">' + icon('sparkles') + ' Best for</p><p class="callout__text">' + esc(p.bestFor) + '</p></div>' +
              '<div class="callout"><p class="callout__head">' + icon('sun-01') + ' When to go</p><p class="callout__text">' + esc(p.goWhen) + '</p></div>' +
              '<div class="callout"><p class="callout__head">' + icon('eye') + ' Skip it if</p><p class="callout__text">' + esc(p.skipIf) + '</p></div>' +
            '</div>' +
            gallery +
          '</div>' +
          '<div>' +
            '<div class="block-title block-title--flush">Hours</div>' + hoursRows(p) +
            '<div class="block-title">Get there</div>' +
            '<div class="map">' +
              '<span class="map__pin">' + icon('map-pin') + '</span>' +
              '<span class="map__label"><span>' + esc(p.name) + ', ' + esc(p.area) + '</span></span>' +
            '</div>' +
            '<a class="btn btn--outline btn--block" href="' + esc(mapsUrl(p)) + '" target="_blank" rel="noopener">' + icon('navigation-01') + ' Open in Google Maps</a>' +
            (contactRows(p) ? '<div class="block-title">Contact</div><div class="attr-grid attr-grid--single">' + contactRows(p) + '</div>' : '') +
          '</div>' +
        '</div>' +

        '<div class="block-title">Good to know</div>' +
        '<div class="attr-grid">' + attributeRows(p) + '</div>' +
        relatedHtml +
      '</div>';
  }

  function renderCollections() {
    var html = data.collections.map(function (c) {
      var cover = c.places.length ? byId(c.places[0]) : null;
      return '<a class="coll-card" href="#/collection/' + c.id + '">' +
        '<span class="coll-card__bg"><img src="' + (cover ? esc(cover.image) : '') + '" alt="" loading="lazy" decoding="async"></span>' +
        '<span class="coll-card__body">' +
          '<span class="coll-card__name">' + icon(c.icon) + esc(c.name) + '</span>' +
          '<span class="coll-card__blurb">' + esc(c.blurb) + '</span>' +
          '<span class="coll-card__count">' + c.places.length + ' places</span>' +
        '</span>' +
      '</a>';
    }).join('');

    $('#main').innerHTML =
      '<div class="container explore__head">' +
        '<h1 class="explore__title">Collections</h1>' +
        '<p class="explore__count">Shortlists for the moments that come up again and again.</p>' +
      '</div>' +
      '<div class="container results"><div class="coll-grid">' + html + '</div></div>';
  }

  function renderCollection(id) {
    var coll = data.collections.find(function (c) { return c.id === id; });
    if (!coll) {
      renderNotFound('That collection does not exist');
      return;
    }
    var list = coll.places.map(byId).filter(function (p) { return !!p; });
    var cover = list.length ? list[0] : null;

    $('#main').innerHTML =
      '<div class="place container">' +
        '<a class="btn btn--outline place__back" href="#/collections">' + icon('arrow-left-01') + ' All collections</a>' +
        '<div class="place__head">' +
          '<h1 class="place__title">' + icon(coll.icon) + ' ' + esc(coll.name) + '</h1>' +
          '<p class="place__desc">' + esc(coll.blurb) + '</p>' +
          '<p class="explore__count">' + list.length + ' places</p>' +
        '</div>' +
        '<div class="results results--start">' + cardGrid(list) + '</div>' +
      '</div>';
  }

  function renderSaved() {
    var list = data.places.filter(function (p) { return saved.has(p.id); });
    if (!list.length) {
      $('#main').innerHTML =
        '<div class="empty empty--center">' +
          '<span class="empty__icon">' + icon('bookmark-01') + '</span>' +
          '<h1 class="empty__title">Your list is empty</h1>' +
          '<p class="empty__text">Save places you like and they will show up here. Saves stay on this device.</p>' +
          '<a class="btn btn--primary" href="#/explore">Find places to save</a>' +
        '</div>';
      return;
    }
    $('#main').innerHTML =
      '<div class="container explore__head">' +
        '<h1 class="explore__title">Saved places</h1>' +
        '<p class="explore__count">' + list.length + (list.length === 1 ? ' place' : ' places') + ' saved on this device.</p>' +
      '</div>' +
      '<div class="results container">' + cardGrid(list) + '</div>';
  }

  function renderNotFound(title) {
    $('#main').innerHTML =
      '<div class="empty empty--center">' +
        '<span class="empty__icon">' + icon('search-01') + '</span>' +
        '<h1 class="empty__title">' + esc(title) + '</h1>' +
        '<a class="btn btn--primary" href="#/explore">Back to explore</a>' +
      '</div>';
  }

  function renderError() {
    $('#main').innerHTML =
      '<div class="empty empty--center">' +
        '<span class="empty__icon">' + icon('cancel-01') + '</span>' +
        '<h1 class="empty__title">Could not load places</h1>' +
        '<p class="empty__text">Serve this folder with a local server, then reload. Opening the file directly blocks the data request.</p>' +
      '</div>';
  }

  function route() {
    var raw = location.hash.slice(1) || '/';
    var parts = raw.split('?');
    var path = parts[0] || '/';
    var params = new URLSearchParams(parts[1] || '');

    var navKey = '';
    if (path === '/explore' || path.indexOf('/place/') === 0) navKey = 'explore';
    else if (path === '/collections' || path.indexOf('/collection/') === 0) navKey = 'collections';
    else if (path === '/saved') navKey = 'saved';

    $$('.topnav a').forEach(function (a) {
      a.classList.remove('is-active');
      a.removeAttribute('aria-current');
    });
    if (navKey) {
      $$('.topnav a').forEach(function (a) {
        if (a.getAttribute('href') === '#/' + navKey) {
          a.classList.add('is-active');
          a.setAttribute('aria-current', 'page');
        }
      });
    }

    closeMobileNav();
    closeSheet();

    if (path === '/explore') {
      state.q = params.get('q') || '';
      state.area = params.get('area') || '';
      state.budget = Number(params.get('budget') || 0);
      state.vibe = params.get('vibe') || '';
      state.occasion = params.get('occasion') || '';
      state.sort = params.get('sort') || 'score';
      state.collection = params.get('collection') || '';
      renderExplore();
    } else if (path.indexOf('/place/') === 0) {
      renderPlace(decodeURIComponent(path.slice('/place/'.length)));
    } else if (path === '/collections') {
      renderCollections();
    } else if (path.indexOf('/collection/') === 0) {
      renderCollection(decodeURIComponent(path.slice('/collection/'.length)));
    } else if (path === '/saved') {
      renderSaved();
    } else {
      renderHome();
    }

    window.scrollTo(0, 0);
  }

  function closeMobileNav() {
    var nav = $('#topnav');
    var toggle = $('#nav-toggle');
    if (nav && nav.classList.contains('is-open')) {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
    }
  }

  document.addEventListener('click', function (e) {
    var saveBtn = e.target.closest('[data-save]');
    if (saveBtn) {
      e.preventDefault();
      e.stopPropagation();
      var id = saveBtn.getAttribute('data-save');
      var wasOn = isSaved(id);
      toggleSave(id);
      toast(wasOn ? 'Removed from your list' : 'Saved to your list');
      if (location.hash.indexOf('#/saved') === 0) route();
      return;
    }

    var card = e.target.closest('[data-card]');
    if (card) {
      location.hash = placeUrl(card.getAttribute('data-card'));
      return;
    }

    var shareBtn = e.target.closest('[data-share]');
    if (shareBtn) {
      var place = byId(shareBtn.getAttribute('data-share'));
      if (place) sharePlace(place);
      return;
    }

    var chip = e.target.closest('[data-chip]');
    if (chip) {
      var filter = chip.getAttribute('data-filter');
      var value = chip.getAttribute('data-value');
      var isOn = state[filter] === value || String(state[filter]) === value;
      state[filter] = isOn ? (filter === 'budget' ? 0 : '') : (filter === 'budget' ? Number(value) : value);
      chipActiveStates();
      renderResults();
      return;
    }

    if (e.target.closest('[data-clear]')) {
      clearFilters();
      return;
    }

    if (e.target.closest('[data-open-sheet]')) {
      openSheet();
      return;
    }

    if (e.target.closest('[data-sheet-close]')) {
      closeSheet();
      return;
    }

    if (e.target.closest('[data-sheet-clear]')) {
      clearFilters();
      return;
    }

    if (e.target.id === 'sheet-backdrop') {
      closeSheet();
    }

    if (e.target.closest('.topnav a')) {
      closeMobileNav();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      var card = e.target.closest && e.target.closest('[data-card]');
      if (card && card === e.target) {
        e.preventDefault();
        location.hash = placeUrl(card.getAttribute('data-card'));
      }
    }
    if (e.key === 'Escape') {
      closeSheet();
      closeMobileNav();
    }
  });

  document.addEventListener('change', function (e) {
    var sheetArea = document.getElementById('sheet-area');
    var sheetSort = document.getElementById('sheet-sort');
    if (e.target === sheetArea) {
      state.area = sheetArea.value;
      chipActiveStates();
      renderResults();
    }
    if (e.target === sheetSort) {
      state.sort = sheetSort.value;
      renderResults();
    }
  });

  document.addEventListener('submit', function (e) {
    if (e.target.id === 'hero-search') {
      e.preventDefault();
      var q = $('input[name="q"]', e.target).value.trim();
      location.hash = q ? '#/explore?q=' + encodeURIComponent(q) : '#/explore';
    }
  });

  var navToggle = $('#nav-toggle');
  if (navToggle) {
    navToggle.addEventListener('click', function () {
      var open = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!open));
      navToggle.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
      $('#topnav').classList.toggle('is-open', !open);
    });
  }

  window.addEventListener('hashchange', route);

  fetch('data/places.json')
    .then(function (res) {
      if (!res.ok) throw new Error('failed');
      return res.json();
    })
    .then(function (json) {
      data = json;
      updateSavedCount();
      route();
    })
    .catch(function () {
      renderError();
    });
})();
