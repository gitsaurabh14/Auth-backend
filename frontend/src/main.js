import './styles.css';
import { api, setAccessToken, getAccessToken } from './api.js';

const state = {
  user: null,
  products: [],
  health: 'unknown',
  authTab: 'login',
  editing: null,
  viewing: null,
  search: '',
  toast: null,
  busy: false
};

const app = document.querySelector('#app');

function ownerId(product) {
  return String(product.owner?._id || product.owner?.id || product.owner || '');
}

function isOwner(product) {
  return Boolean(state.user && ownerId(product) === String(state.user.id));
}

function money(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0);
}

function toast(message, error = false) {
  state.toast = { message, error };
  render();
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    state.toast = null;
    render();
  }, 3200);
}

function formValues(form) {
  return Object.fromEntries(new FormData(form));
}

async function refreshHealth() {
  try {
    await api.health();
    state.health = 'ok';
  } catch {
    state.health = 'bad';
  }
}

async function loadProducts() {
  const { products } = await api.products();
  state.products = products;
}

async function restoreSession() {
  if (!getAccessToken()) return;
  try {
    state.user = (await api.me()).user;
  } catch {
    setAccessToken(null);
    state.user = null;
  }
}

function filteredProducts() {
  const q = state.search.trim().toLowerCase();
  if (!q) return state.products;
  return state.products.filter((product) =>
    [product.name, product.description, product.owner?.name, product.owner?.email]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q))
  );
}

function renderAuthPanel() {
  if (state.user) {
    return `
      <aside class="panel">
        <h3 style="margin:0 0 8px;font-family:Fraunces,Georgia,serif;">Studio tools</h3>
        <p class="lede">You can list pieces, restock, and retire items you own. Catalog browsing stays public.</p>
        <div class="actions" style="margin-top:16px">
          <button class="btn" data-action="open-create">Add a product</button>
        </div>
      </aside>
    `;
  }

  const login = state.authTab === 'login';
  return `
    <aside class="panel">
      <div class="tabs">
        <button class="tab ${login ? 'active' : ''}" data-tab="login">Sign in</button>
        <button class="tab ${!login ? 'active' : ''}" data-tab="register">Create account</button>
      </div>
      ${login ? `
        <form class="form" id="loginForm">
          <label>Email <input name="email" type="email" required autocomplete="email" /></label>
          <label>Password <input name="password" type="password" required autocomplete="current-password" /></label>
          <button class="btn" ${state.busy ? 'disabled' : ''}>Enter the studio</button>
        </form>
      ` : `
        <form class="form" id="registerForm">
          <label>Name <input name="name" required minlength="2" autocomplete="name" /></label>
          <label>Email <input name="email" type="email" required autocomplete="email" /></label>
          <label>Password
            <input name="password" type="password" required minlength="8" autocomplete="new-password" />
            <span class="hint">At least 8 characters, with upper, lower, number, and symbol.</span>
          </label>
          <label>Confirm password <input name="confirmPassword" type="password" required autocomplete="new-password" /></label>
          <button class="btn" ${state.busy ? 'disabled' : ''}>Create account</button>
        </form>
      `}
    </aside>
  `;
}

function productCard(product) {
  return `
    <article class="card">
      <h4>${escapeHtml(product.name)}</h4>
      <div class="price">${money(product.price)}</div>
      <p class="meta">${escapeHtml(product.description)}</p>
      <div class="meta">Stock ${product.stock} · ${escapeHtml(product.owner?.name || 'Unknown maker')}</div>
      <div class="actions">
        <button class="btn-ghost" data-view="${product._id}">Details</button>
        ${isOwner(product) ? `
          <button class="btn-ghost" data-edit="${product._id}">Edit</button>
          <button class="btn-danger" data-delete="${product._id}">Delete</button>
        ` : ''}
      </div>
    </article>
  `;
}

function renderModal() {
  if (state.viewing) {
    const product = state.viewing;
    return `
      <div class="overlay">
        <div class="modal-card" role="dialog">
          <div class="modal-head">
            <h3>${escapeHtml(product.name)}</h3>
            <button class="btn-ghost" type="button" data-action="close-modal">Close</button>
          </div>
          <p class="price">${money(product.price)}</p>
          <p>${escapeHtml(product.description)}</p>
          <p class="meta">Stock ${product.stock}</p>
          <p class="meta">Maker: ${escapeHtml(product.owner?.name || '')} · ${escapeHtml(product.owner?.email || '')}</p>
        </div>
      </div>
    `;
  }

  if (state.editing) {
    const product = state.editing === 'new' ? { name: '', description: '', price: '', stock: '' } : state.editing;
    const title = state.editing === 'new' ? 'List a product' : 'Edit product';
    return `
      <div class="overlay">
        <div class="modal-card" role="dialog">
          <div class="modal-head">
            <h3>${title}</h3>
            <button class="btn-ghost" type="button" data-action="close-modal">Close</button>
          </div>
          <form class="form" id="productForm">
            <label>Name <input name="name" required minlength="2" maxlength="120" value="${escapeAttr(product.name)}" /></label>
            <label>Description <textarea name="description" required maxlength="2000">${escapeHtml(product.description || '')}</textarea></label>
            <label>Price <input name="price" type="number" min="0" step="0.01" required value="${escapeAttr(product.price)}" /></label>
            <label>Stock <input name="stock" type="number" min="0" step="1" required value="${escapeAttr(product.stock)}" /></label>
            <button class="btn" ${state.busy ? 'disabled' : ''}>Save product</button>
          </form>
        </div>
      </div>
    `;
  }

  return '';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function render() {
  const products = filteredProducts();
  app.innerHTML = `
    <div class="shell">
      <header class="topbar">
        <div class="brand">
          <div class="mark">A</div>
          <div>
            <h1>Atelier</h1>
            <p>A small catalog with real auth.</p>
          </div>
        </div>
        <div class="account">
          <div class="health"><span class="dot ${state.health}"></span> API ${state.health === 'ok' ? 'online' : state.health === 'bad' ? 'offline' : 'checking'}</div>
          ${state.user ? `<span class="chip">${escapeHtml(state.user.name)} · ${escapeHtml(state.user.email)}</span>
            <button class="btn-ghost" data-action="logout">Log out</button>` : ''}
        </div>
      </header>

      <section class="hero">
        <div>
          <h2>Objects with a maker, not a dashboard.</h2>
          <p class="lede">Register, sign in, and manage only the products you created. Refresh tokens rotate quietly in the background so a short-lived access token does not kick you out mid-edit.</p>
        </div>
        ${renderAuthPanel()}
      </section>

      <div class="toolbar">
        <div>
          <h3>Catalog</h3>
          <p class="meta">${state.products.length} listed · public read, owner write</p>
        </div>
        <input class="search" id="search" placeholder="Search name, description, or maker" value="${escapeAttr(state.search)}" />
      </div>

      ${products.length ? `<section class="grid">${products.map(productCard).join('')}</section>` : `<div class="empty">No products yet. ${state.user ? 'Add the first listing.' : 'Sign in to list something.'}</div>`}
    </div>
    ${renderModal()}
    ${state.toast ? `<div class="toast ${state.toast.error ? 'error' : ''}">${escapeHtml(state.toast.message)}</div>` : ''}
  `;
}

async function withBusy(fn) {
  state.busy = true;
  render();
  try {
    await fn();
  } finally {
    state.busy = false;
    render();
  }
}

app.addEventListener('click', async (event) => {
  const tab = event.target.closest('[data-tab]');
  if (tab) {
    state.authTab = tab.dataset.tab;
    render();
    return;
  }

  if (event.target.closest('[data-action="logout"]')) {
    try { await api.logout(); } catch { /* still clear local session */ }
    setAccessToken(null);
    state.user = null;
    toast('Signed out.');
    render();
    return;
  }

  if (event.target.closest('[data-action="open-create"]')) {
    if (!state.user) return toast('Sign in to add products.', true);
    state.editing = 'new';
    render();
    return;
  }

  const viewId = event.target.closest('[data-view]')?.dataset.view;
  if (viewId) {
    try {
      state.viewing = (await api.product(viewId)).product;
      render();
    } catch (error) {
      toast(error.message, true);
    }
    return;
  }

  const editId = event.target.closest('[data-edit]')?.dataset.edit;
  if (editId) {
    const product = state.products.find((item) => item._id === editId);
    state.editing = product;
    render();
    return;
  }

  const deleteId = event.target.closest('[data-delete]')?.dataset.delete;
  if (deleteId) {
    if (!confirm('Delete this product?')) return;
    try {
      await api.deleteProduct(deleteId);
      await loadProducts();
      toast('Product deleted.');
      render();
    } catch (error) {
      toast(error.message, true);
    }
    return;
  }

  if (event.target.classList.contains('overlay') || event.target.closest('[data-action="close-modal"]')) {
    state.viewing = null;
    state.editing = null;
    render();
  }
});

app.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (event.target.id === 'loginForm') {
    await withBusy(async () => {
      try {
        const data = await api.login(formValues(event.target));
        setAccessToken(data.accessToken);
        state.user = data.user;
        toast(`Welcome back, ${data.user.name}.`);
      } catch (error) {
        toast(error.message, true);
      }
    });
    return;
  }

  if (event.target.id === 'registerForm') {
    const body = formValues(event.target);
    await withBusy(async () => {
      try {
        await api.register(body);
        const data = await api.login({ email: body.email, password: body.password });
        setAccessToken(data.accessToken);
        state.user = data.user;
        toast('Account created and signed in.');
      } catch (error) {
        toast(error.message, true);
      }
    });
    return;
  }

  if (event.target.id === 'productForm') {
    const raw = formValues(event.target);
    const body = {
      name: raw.name,
      description: raw.description,
      price: Number(raw.price),
      stock: Number(raw.stock)
    };
    await withBusy(async () => {
      try {
        if (state.editing === 'new') await api.createProduct(body);
        else await api.updateProduct(state.editing._id, body);
        state.editing = null;
        await loadProducts();
        toast('Product saved.');
      } catch (error) {
        toast(error.message, true);
      }
    });
  }
});

app.addEventListener('input', (event) => {
  if (event.target.id === 'search') {
    state.search = event.target.value;
    render();
    document.querySelector('#search')?.focus();
    document.querySelector('#search').setSelectionRange(state.search.length, state.search.length);
  }
});

async function boot() {
  render();
  await Promise.all([refreshHealth(), restoreSession(), loadProducts().catch((error) => toast(error.message, true))]);
  render();
}

boot();
