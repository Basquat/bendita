
let inventory = JSON.parse(localStorage.getItem('bendita_inventory') || '[]');

const LOW_STOCK_THRESHOLD = 5;


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


function renderLowStock() {
  const list = document.getElementById('low-stock-list');
  list.innerHTML = '';
  let items = inventory;
  const lowItems = items.filter(item => {
    if (item.disableLowStock) return false;
    const threshold = typeof item.lowStock === 'number' ? item.lowStock : LOW_STOCK_THRESHOLD;
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


function renderEditList() {
  const list = document.getElementById('edit-list');
  list.innerHTML = '';
  let items = inventory;
  
  let searchDiv = document.getElementById('edit-search-div');
  let searchInput;
  if (!searchDiv) {
    searchDiv = document.createElement('div');
    searchDiv.id = 'edit-search-div';
    searchDiv.innerHTML = '<input type="text" id="edit-search" placeholder="Pesquisar por nome ou categoria..." style="margin-bottom:10px;width:100%">';
    list.parentNode.insertBefore(searchDiv, list);
    searchInput = document.getElementById('edit-search');
    searchInput.oninput = () => renderEditList();
  } else {
    searchInput = document.getElementById('edit-search');
    if (searchInput && !searchInput.oninput) {
      searchInput.oninput = () => renderEditList();
    }
  }
  if (searchInput && searchInput.value.trim() !== '') {
    const term = searchInput.value.trim().toLowerCase();
    items = items.filter(item =>
      item.nome.toLowerCase().includes(term) ||
      (item.categoria && item.categoria.toLowerCase().includes(term))
    );
  }
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
}

const addForm = document.getElementById('add-item-form');
function addHistory(action, item) {
  let history = JSON.parse(localStorage.getItem('bendita_history') || '[]');
  history.unshift({
    acao: action,
    nome: item.nome,
    categoria: item.categoria,
    quantidade: item.quantidade,
    data: new Date().toLocaleString()
  });
  localStorage.setItem('bendita_history', JSON.stringify(history));
}

function renderHistory() {
  const list = document.getElementById('history-list');
  list.innerHTML = '';
  let history = JSON.parse(localStorage.getItem('bendita_history') || '[]');
  if (history.length === 0) {
    list.innerHTML = '<p>Nenhuma alteração registrada.</p>';
    return;
  }
  history.forEach(entry => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${entry.acao}</strong>: ${entry.nome} (${entry.categoria}) - Qtd: ${entry.quantidade} <span style='float:right'>${entry.data}</span>`;
    list.appendChild(li);
  });
}


addForm.onsubmit = function(e) {
  e.preventDefault();
  const formData = new FormData(addForm);
  const newItem = {
    nome: formData.get('name'),
    categoria: formData.get('category'),
    quantidade: parseInt(formData.get('quantity')),
    lowStock: formData.get('lowstock') ? parseInt(formData.get('lowstock')) : undefined,
    disableLowStock: formData.get('disablelowstock') === 'on'
  };
  inventory.push(newItem);
  localStorage.setItem('bendita_inventory', JSON.stringify(inventory));
  addHistory('Adicionado', newItem);
  addForm.reset();
  renderAll();
  const searchInput = document.getElementById('edit-search');
  if (searchInput && searchInput.value.trim() !== '') {
    renderEditList();
    searchInput.value = searchInput.value;
    searchInput.dispatchEvent(new Event('input'));
  }
  showModal('<h2>Item adicionado com sucesso!</h2>');
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
  document.getElementById('edit-item-form').onsubmit = function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    const updatedItem = {
      nome: formData.get('name'),
      categoria: formData.get('category'),
      quantidade: parseInt(formData.get('quantity'))
    };
    inventory[idx] = updatedItem;
    localStorage.setItem('bendita_inventory', JSON.stringify(inventory));
    addHistory('Editado', updatedItem);
    renderAll();
    modalBg.classList.add('hidden');
  };
}

function deleteItem(idx) {
  if (confirm('Tem certeza que deseja excluir este item?')) {
    const deleted = inventory[idx];
    inventory.splice(idx, 1);
    localStorage.setItem('bendita_inventory', JSON.stringify(inventory));
    addHistory('Excluído', deleted);
    renderAll();
  }
}

function renderAll() {
  renderLowStock();
  renderEditList();
  renderHistory();
}

window.onload = renderAll;

