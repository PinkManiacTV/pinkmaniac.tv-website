(function () {
    'use strict';

    var formats = [];
    var prompts = [];
    var activeCategory = 'All';
    var searchQuery = '';

    var searchInput = document.getElementById('pl-search');
    var filtersEl = document.getElementById('pl-filters');
    var formatsGrid = document.getElementById('pl-formats-grid');
    var promptsGrid = document.getElementById('pl-prompts-grid');
    var formatsEmpty = document.getElementById('pl-formats-empty');
    var promptsEmpty = document.getElementById('pl-prompts-empty');
    var modal = document.getElementById('pl-modal');
    var modalBackdrop = document.getElementById('pl-modal-backdrop');
    var modalTitle = document.getElementById('pl-modal-title');
    var modalBadge = document.getElementById('pl-modal-badge');
    var modalBody = document.getElementById('pl-modal-body');
    var modalCopyBtn = document.getElementById('pl-modal-copy');
    var modalCloseBtn = document.getElementById('pl-modal-close');
    var modalBodyText = '';

    var CATEGORY_META = {
        'Writing': { icon: 'fa-pen-nib', theme: 'writing' },
        'Prompting': { icon: 'fa-microchip', theme: 'prompting' },
        'Context gathering': { icon: 'fa-comments', theme: 'context' }
    };

    function getItemMeta(item) {
        return CATEGORY_META[item.category] || { icon: 'fa-book-open', theme: 'writing' };
    }

    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function getCategories(items) {
        var set = {};
        items.forEach(function (item) {
            if (item.category) {
                set[item.category] = true;
            }
        });
        return Object.keys(set).sort();
    }

    function matchesFilter(item) {
        var q = searchQuery.trim().toLowerCase();
        var catOk = activeCategory === 'All' || item.category === activeCategory;
        if (!catOk) {
            return false;
        }
        if (!q) {
            return true;
        }
        var haystack = (item.title + ' ' + item.description + ' ' + item.category).toLowerCase();
        return haystack.indexOf(q) !== -1;
    }

    function renderFilters() {
        var categories = getCategories(formats.concat(prompts));
        filtersEl.innerHTML = '';

        var allBtn = document.createElement('button');
        allBtn.type = 'button';
        allBtn.className = 'pl-filter-btn' + (activeCategory === 'All' ? ' is-active' : '');
        allBtn.textContent = 'All';
        allBtn.dataset.category = 'All';
        filtersEl.appendChild(allBtn);

        categories.forEach(function (cat) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'pl-filter-btn' + (activeCategory === cat ? ' is-active' : '');
            btn.textContent = cat;
            btn.dataset.category = cat;
            filtersEl.appendChild(btn);
        });
    }

    function openPreview(item) {
        modalTitle.textContent = item.title;
        modalBadge.textContent = item.category;
        modalBody.textContent = item.body;
        modalBodyText = item.body;
        modalCopyBtn.textContent = 'Copy';
        modalCopyBtn.classList.remove('is-copied');
        modal.hidden = false;
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('pl-modal-open');
        modalCloseBtn.focus();
    }

    function closePreview() {
        modal.hidden = true;
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('pl-modal-open');
    }

    function createTile(item) {
        var article = document.createElement('article');
        article.className = 'pl-list-item';
        article.dataset.id = item.id;

        var meta = getItemMeta(item);

        article.innerHTML =
            '<div class="pl-tile">' +
                '<div class="pl-item-icon pl-item-icon--' + meta.theme + '" aria-hidden="true">' +
                    '<i class="fa-solid ' + meta.icon + '"></i>' +
                '</div>' +
                '<div class="pl-tile-body">' +
                    '<h3 class="pl-tile-title">' + escapeHtml(item.title) + '</h3>' +
                    '<div class="pl-tile-actions">' +
                        '<button type="button" class="pl-btn pl-btn--primary pl-btn-copy">Copy</button>' +
                        '<button type="button" class="pl-btn pl-btn-preview">Preview</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="pl-list-details">' +
                '<span class="pl-tile-badge">' + escapeHtml(item.category) + '</span>' +
                '<p class="pl-list-desc">' + escapeHtml(item.description) + '</p>' +
            '</div>';

        var copyBtn = article.querySelector('.pl-btn-copy');
        var previewBtn = article.querySelector('.pl-btn-preview');

        copyBtn.addEventListener('click', function () {
            copyBody(item.body, copyBtn);
        });

        previewBtn.addEventListener('click', function () {
            openPreview(item);
        });

        return article;
    }

    function copyBody(text, btn) {
        function showCopied() {
            var original = btn.textContent;
            btn.textContent = 'Copied!';
            btn.classList.add('is-copied');
            setTimeout(function () {
                btn.textContent = original;
                btn.classList.remove('is-copied');
            }, 2000);
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(showCopied).catch(function () {
                fallbackCopy(text, btn, showCopied);
            });
        } else {
            fallbackCopy(text, btn, showCopied);
        }
    }

    function fallbackCopy(text, btn, onSuccess) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            onSuccess();
        } catch (e) {
            btn.textContent = 'Failed';
            setTimeout(function () {
                btn.textContent = 'Copy';
            }, 2000);
        }
        document.body.removeChild(ta);
    }

    function renderGrid(container, items, emptyEl) {
        container.innerHTML = '';
        var filtered = items.filter(matchesFilter);

        filtered.forEach(function (item) {
            container.appendChild(createTile(item));
        });

        emptyEl.hidden = filtered.length > 0;
    }

    function renderAll() {
        renderGrid(formatsGrid, formats, formatsEmpty);
        renderGrid(promptsGrid, prompts, promptsEmpty);
    }

    function loadData() {
        if (window.PL_FORMATS && window.PL_PROMPTS) {
            formats = window.PL_FORMATS;
            prompts = window.PL_PROMPTS;
            renderFilters();
            renderAll();
            return Promise.resolve();
        }

        return Promise.all([
            fetch('data/formats.json').then(function (r) {
                if (!r.ok) throw new Error('formats.json');
                return r.json();
            }),
            fetch('data/prompts.json').then(function (r) {
                if (!r.ok) throw new Error('prompts.json');
                return r.json();
            })
        ]).then(function (results) {
            formats = results[0];
            prompts = results[1];
            renderFilters();
            renderAll();
        });
    }

    searchInput.addEventListener('input', function () {
        searchQuery = searchInput.value;
        renderAll();
    });

    filtersEl.addEventListener('click', function (e) {
        var btn = e.target.closest('.pl-filter-btn');
        if (!btn) return;
        activeCategory = btn.dataset.category;
        filtersEl.querySelectorAll('.pl-filter-btn').forEach(function (b) {
            b.classList.toggle('is-active', b.dataset.category === activeCategory);
        });
        renderAll();
    });

    modalCopyBtn.addEventListener('click', function () {
        copyBody(modalBodyText, modalCopyBtn);
    });

    modalCloseBtn.addEventListener('click', closePreview);
    modalBackdrop.addEventListener('click', closePreview);

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !modal.hidden) {
            closePreview();
        }
    });

    loadData().catch(function () {
        formatsGrid.innerHTML = '<p class="pl-empty">Could not load prompt data.</p>';
        promptsGrid.innerHTML = '';
    });
})();
