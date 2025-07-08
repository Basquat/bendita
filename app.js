// Inventory data (localStorage for persistence)
let inventory = JSON.parse(localStorage.getItem('bendita_inventory') || '[]');

const LOW_STOCK_THRESHOLD = 5;

// Tab navigation
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    tabContents.forEach(tc => tc.classList.remove('active'));
    document.getElementById(tab.dataset.tab).classList.add('active');
  });
});

// Modal logic
const modalBg = document.getElementById('modal-bg');
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modal-content');
const modalClose = document.getElementById('modal-close');

function showModal(html) {
  modalContent.innerHTML = html;
  modalBg.classList.remove('hidden');
}
modalClose.onclick = () => modalBg.classList.add('hidden');
modalBg.onclick = e => { if (e.target === modalBg) modalBg.classList.add('hidden'); };

// Render low stock items
async function renderLowStock() {
  const list = document.getElementById('low-stock-list');
  list.innerHTML = '';
  await fetchInventory();
  let items = inventory;
  const lowItems = items.filter(item => {
    if (item.disableLowStock) return false;
    const threshold = item.lowStockThreshold != null ? item.lowStockThreshold : LOW_STOCK_THRESHOLD;
    return item.quantidade <= threshold;
  });
  if (lowItems.length === 0) {
    list.innerHTML = '<p>Todos os itens estão com estoque suficiente!</p>';
    return;
  }
  lowItems.forEach(item => {
    const card = document.createElement('div');
    card.className = 'item-card low';
    card.innerHTML = `
      <div class="item-info">
        <span class="item-name">${item.nome}</span>
        <span class="item-category">${item.categoria}</span>
      </div>
      <span class="item-quantity">Qtd: ${item.quantidade}</span>
    `;
    list.appendChild(card);
  });
}

import { addClass, removeClass, createElement, clearChildren } from './dom-utils.js';
async function renderEditList() {
  const list = document.getElementById('edit-list');
  clearChildren(list);
  // Campo de pesquisa
  let searchDiv = document.getElementById('edit-search-div');
  if (!searchDiv) {
    searchDiv = document.createElement('div');
    searchDiv.id = 'edit-search-div';
    searchDiv.innerHTML = '<input type="text" id="edit-search" placeholder="Pesquisar item...">';
    list.parentNode.insertBefore(searchDiv, list);
  }
  const searchInput = document.getElementById('edit-search');
  let searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
  let filtered = inventory;
  if (searchTerm) {
    filtered = inventory.filter(item => item.nome.toLowerCase().includes(searchTerm) || item.categoria.toLowerCase().includes(searchTerm));
  }
  if (filtered.length === 0) {
    list.innerHTML = '<p>Nenhum item encontrado.</p>';
    return;
  }
  filtered.forEach(item => {
    const card = createElement('div', { className: 'item-card' });
    card.innerHTML = `
      <div class="item-info">
        <span class="item-name">${item.nome}</span>
        <span class="item-category">${item.categoria}</span>
      </div>
      <span class="item-quantity">Qtd: ${item.quantidade}</span>
      <button class="edit-btn" onclick="openEditModal('${item._id}')">Editar</button>
      <button class="delete-btn" onclick="deleteItem('${item._id}')">Excluir</button>
    `;
    list.appendChild(card);
    highlightSearchResult(card);
  });
  if (searchInput) {
    searchInput.oninput = renderEditList;
  }
}
  let items = inventory;
  if (items.length === 0) {
    list.innerHTML = '<p>Nenhum item cadastrado.</p>';
    return;
  }
  items.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.innerHTML = `
      <div class="item-info">
        <span class="item-name">${item.nome}</span>
        <span class="item-category">${item.categoria}</span>
      </div>
      <span class="item-quantity">Qtd: ${item.quantidade}</span>
      <div>
        <button class="edit-btn">Editar</button>
        <button class="delete-btn">Excluir</button>
      </div>
    `;
    card.querySelector('.edit-btn').onclick = () => openEditModal(item, idx);
    card.querySelector('.delete-btn').onclick = () => deleteItem(idx);
    list.appendChild(card);
  });


const addForm = document.getElementById('add-item-form');
addForm.innerHTML += `
  <input type="number" name="lowStockThreshold" placeholder="Estoque baixo personalizado (opcional)" min="1">
  <label><input type="checkbox" name="disableLowStock"> Não alertar estoque baixo para este item</label>
`;
addForm.onsubmit = async function(e) {
  e.preventDefault();
  const formData = new FormData(addForm);
  const newItem = {
    nome: formData.get('name'),
    categoria: formData.get('category'),
    quantidade: parseInt(formData.get('quantity')),
    lowStockThreshold: formData.get('lowStockThreshold') ? parseInt(formData.get('lowStockThreshold')) : null,
    disableLowStock: formData.get('disableLowStock') ? true : false
  };
  const token = localStorage.getItem('bendita_token');
  const res = await fetch('http://localhost:3000/api/estoque', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify(newItem)
  });
  if (res.ok) {
    addForm.reset();
    await renderAll();
    showModal('<h2>Item adicionado com sucesso!</h2>');
  } else {
    showModal('<h2>Erro ao adicionar item!</h2>');
  }
};

function openEditModal(item, idx) {
  showModal(`
    <h2>Editar Item</h2>
    <form id="edit-item-form">
      <input type="text" name="name" value="${item.nome}" required>
      <input type="number" name="quantity" value="${item.quantidade}" min="1" required>
      <input type="text" name="category" value="${item.categoria}" required>
      <button type="submit">Salvar</button>
    </form>
  `);
  document.getElementById('edit-item-form').onsubmit = async function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    inventory[idx] = {
      nome: formData.get('name'),
      categoria: formData.get('category'),
      quantidade: parseInt(formData.get('quantity'))
    };
    localStorage.setItem('bendita_inventory', JSON.stringify(inventory));
    await renderAll();
    modalBg.classList.add('hidden');
  };
}

async function deleteItem(idx) {
  console.log('Tentando excluir item no índice:', idx);
  if (confirm('Tem certeza que deseja excluir este item?')) {
    inventory.splice(idx, 1);
    localStorage.setItem('bendita_inventory', JSON.stringify(inventory));
    console.log('Item excluído. Novo inventário:', inventory);
    await renderAll();
  }
}

// Owners/User Management (placeholder)
async function renderOwners() {
  const ownersContent = document.getElementById('owners-content');
  ownersContent.innerHTML = `
    <h2>Criar Novo Usuário</h2>
    <form id="add-user-form">
      <input type="text" name="nome" placeholder="Nome" required>
      <input type="email" name="email" placeholder="Email" required>
      <input type="password" name="senha" placeholder="Senha" required>
      <button type="submit">Criar Usuário</button>
    </form>
    <div id="user-create-msg"></div>
  `;
  document.getElementById('add-user-form').onsubmit = async function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    const nome = formData.get('nome');
    const email = formData.get('email');
    const senha = formData.get('senha');
    try {
      const token = localStorage.getItem('bendita_token');
      const res = await fetch('http://localhost:3000/api/usuarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ nome, email, senha })
      });
      if (res.ok) {
        document.getElementById('user-create-msg').textContent = 'Usuário criado com sucesso!';
        this.reset();
      } else {
        const data = await res.json();
        document.getElementById('user-create-msg').textContent = data.error || 'Erro ao criar usuário.';
      }
    } catch (err) {
      document.getElementById('user-create-msg').textContent = 'Erro ao conectar ao servidor.';
    }
  };
}

// History (placeholder)
async function renderHistory() {
  const historyList = document.getElementById('history-list');
  historyList.innerHTML = '<p>Carregando histórico...</p>';
  const token = localStorage.getItem('bendita_token');
  try {
    const res = await fetch('http://localhost:3000/api/historico', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.ok) {
      const history = await res.json();
      if (history.length === 0) {
        historyList.innerHTML = '<p>Nenhuma alteração registrada ainda.</p>';
        return;
      }
      historyList.innerHTML = '';
      history.forEach(entry => {
        const item = document.createElement('div');
        item.className = 'history-entry';
        item.innerHTML = `
          <strong>${entry.usuario_nome || 'Usuário'}</strong> ${entry.acao}<br>
          <span>${entry.detalhes}</span><br>
          <small>${new Date(entry.data).toLocaleString()}</small>
        `;
        historyList.appendChild(item);
      });
    } else {
      historyList.innerHTML = '<p>Erro ao carregar histórico.</p>';
    }
  } catch {
    historyList.innerHTML = '<p>Erro ao conectar ao servidor.</p>';
  }
}

// Tab switching with render
async function renderAll() {
  await renderLowStock();
  await renderEditList();
  await renderOwners();
  await renderHistory();
}

// Tab switching
const tabMap = {
  dashboard: renderLowStock,
  add: () => {},
  edit: renderEditList,
  owners: renderOwners,
  history: renderHistory
};
tabs.forEach(tab => {
  tab.addEventListener('click', async () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    tabContents.forEach(tc => tc.classList.remove('active'));
    document.getElementById(tab.dataset.tab).classList.add('active');
    if (tabMap[tab.dataset.tab]) await tabMap[tab.dataset.tab]();
  });
});

window.onload = async () => {
  await renderAll();
};


// Exemplo de uso: adicionar destaque ao pesquisar item
function highlightSearchResult(card) {
  addClass(card, 'highlight');
  setTimeout(() => removeClass(card, 'highlight'), 800);
}

