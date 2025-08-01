import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, get, set, push, update, remove, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

const firebaseConfig = {
  databaseURL: "https://bendita-trufa-9e067-default-rtdb.firebaseio.com/"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Remover todas as referências a localStorage e variáveis antigas
// Substituir let inventory = JSON.parse(localStorage.getItem('bendita_inventory') || '[]'); por let inventory = [];
// Remover funções que usam localStorage para inventário e histórico
// Garantir que todas as funções CRUD e de histórico usam apenas Firebase
let inventory = [];

async function fetchInventory() {
  const snapshot = await get(ref(db, 'inventory'));
  inventory = snapshot.exists() ? snapshot.val() : {};
}

async function addItem(newItem) {
  const newRef = push(ref(db, 'inventory'));
  await set(newRef, newItem);
  return true;
}

async function updateItem(id, updatedItem) {
  await update(ref(db, `inventory/${id}`), updatedItem);
  return true;
}

async function deleteItemAPI(id) {
  await remove(ref(db, `inventory/${id}`));
  return true;
}

function addHistory(action, item) {
  const historyRef = ref(db, 'history');
  push(historyRef, {
    acao: action,
    nome: item.nome,
    categoria: item.categoria,
    quantidade: item.quantidade,
    data: new Date().toLocaleString()
  });
}

async function renderAll() {
  await fetchInventory();
  renderLowStock();
  renderEditList();
  renderHistory();
}

function renderHistory() {
  const list = document.getElementById('history-list');
  list.innerHTML = '';
  const historyRef = ref(db, 'history');
  onValue(historyRef, (snapshot) => {
    const history = snapshot.exists() ? Object.values(snapshot.val()) : [];
    if (history.length === 0) {
      list.innerHTML = '<p>Nenhuma alteração registrada.</p>';
      return;
    }
    history.forEach(entry => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${entry.acao}</strong>: ${entry.nome} (${entry.categoria}) - Qtd: ${entry.quantidade} <span style='float:right'>${entry.data}</span>`;
      list.appendChild(li);
    });
  });
}

function openEditModal(item, id) {
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
    const updatedItem = {
      nome: formData.get('name'),
      categoria: formData.get('category'),
      quantidade: parseInt(formData.get('quantity'))
    };
    const success = await updateItem(id, updatedItem);
    if (success) {
      renderAll();
      modalBg.classList.add('hidden');
    } else {
      showModal('<h2>Erro ao editar item!</h2>');
    }
  };
}

async function deleteItem(id) {
  if (confirm('Tem certeza que deseja excluir este item?')) {
    const success = await deleteItemAPI(id);
    if (success) {
      renderAll();
    } else {
      showModal('<h2>Erro ao excluir item!</h2>');
    }
  }
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
  Object.entries(items).forEach(([id, item]) => {
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
    card.querySelector('.edit-btn').onclick = () => openEditModal(item, id);
    card.querySelector('.delete-btn').onclick = () => deleteItem(id);
    list.appendChild(card);
  });
}