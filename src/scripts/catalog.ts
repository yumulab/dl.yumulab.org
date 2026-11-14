import { papers, filterPapers, readFilters, typeInfo } from '../lib/papers';

const form = document.querySelector<HTMLFormElement>('#search-form')!;
const query = document.querySelector<HTMLInputElement>('#query')!;
const year = document.querySelector<HTMLSelectElement>('#year')!;
const type = document.querySelector<HTMLSelectElement>('#type')!;
const sort = document.querySelector<HTMLSelectElement>('#sort')!;
const container = document.querySelector<HTMLElement>('#papers')!;
const cards = new Map([...container.querySelectorAll<HTMLElement>('[data-paper-id]')].map((card) => [card.dataset.paperId!, card]));
const viewButtons = document.querySelectorAll<HTMLButtonElement>('button[data-view]');
const activeFilters = document.querySelector<HTMLElement>('#active-filters')!;
let filters = readFilters(new URLSearchParams(location.search));

function render(updateUrl = true) {
  query.value = filters.q;
  year.value = filters.year;
  type.value = filters.type;
  sort.value = filters.sort;
  container.dataset.view = filters.view;
  viewButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.view === filters.view)));

  const results = filterPapers(papers, filters);
  cards.forEach((card) => { card.hidden = true; });
  const fragment = document.createDocumentFragment();
  results.forEach((paper) => {
    const card = cards.get(paper.core.id)!;
    card.hidden = false;
    fragment.append(card);
  });
  container.append(fragment);
  const filtered = Boolean(filters.q || filters.year || filters.type);
  document.querySelector('#result-count')!.textContent = filtered ? `${results.length} 件 / 全 ${papers.length} 件` : `全 ${papers.length} 件`;
  document.querySelector<HTMLElement>('#empty-state')!.hidden = results.length > 0;
  const end = document.querySelector<HTMLElement>('#catalog-end')!;
  end.hidden = results.length === 0;
  end.textContent = `${results.length} 件の研究成果を表示しています`;

  activeFilters.replaceChildren();
  const labels = [filters.q && `「${filters.q}」`, filters.year && `${filters.year}年`, filters.type && (filters.type === 'other' ? 'その他' : typeInfo(filters.type).label)].filter(Boolean);
  labels.forEach((label) => {
    const chip = document.createElement('span');
    chip.textContent = label;
    activeFilters.append(chip);
  });
  activeFilters.hidden = labels.length === 0;

  if (updateUrl) {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.year) params.set('year', filters.year);
    if (filters.type) params.set('type', filters.type);
    if (filters.sort !== 'newest') params.set('sort', filters.sort);
    if (filters.view !== 'grid') params.set('view', filters.view);
    const search = params.toString();
    history.replaceState(null, '', `${location.pathname}${search ? `?${search}` : ''}${location.hash}`);
  }
}

let debounce: ReturnType<typeof setTimeout>;
query.addEventListener('input', () => {
  clearTimeout(debounce);
  debounce = setTimeout(() => { filters.q = query.value; render(); }, 150);
});
form.addEventListener('submit', (event) => {
  event.preventDefault();
  clearTimeout(debounce);
  filters.q = query.value;
  render();
});
[year, type, sort].forEach((select) => select.addEventListener('change', () => {
  clearTimeout(debounce);
  filters = { ...filters, q: query.value, year: year.value, type: type.value, sort: sort.value === 'oldest' ? 'oldest' : 'newest' };
  render();
}));
viewButtons.forEach((button) => button.addEventListener('click', () => {
  clearTimeout(debounce);
  filters.q = query.value;
  const view = button.dataset.view;
  if (view === 'list' || view === 'grid' || view === 'text') filters.view = view;
  render();
}));
function reset() {
  clearTimeout(debounce);
  filters = { q: '', year: '', type: '', sort: 'newest', view: filters.view };
  render();
}
document.querySelector('#reset-filters')!.addEventListener('click', reset);
document.querySelector('#empty-reset')!.addEventListener('click', reset);
window.addEventListener('popstate', () => {
  clearTimeout(debounce);
  filters = readFilters(new URLSearchParams(location.search));
  render(false);
});
render(false);
