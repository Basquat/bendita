// --- INÍCIO: Adições para Firebase ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, get, set, push, update, remove, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

const firebaseConfig = {
  // Use o seu URL padrão do Realtime Database
  databaseURL: "https://bendita-trufa-9e067-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// A variável 'inventory' agora será um objeto de objetos,
// onde as chaves são os IDs gerados pelo Firebase.
let inventory = {};

// A variável 'history' não será mais persistida localmente,
// mas sim lida diretamente pelo listener do Firebase.
// Vamos criar uma variável para guardar os dados do histórico para sorting se necessário.
let currentHistory = [];

// Listener para o inventário: atualiza a variável local 'inventory' e re-renderiza tudo
const inventoryRef = ref(db, 'inventory');
onValue(inventoryRef, (snapshot) => {
  inventory = snapshot.exists() ? snapshot.val() : {};
  console.log("Inventário atualizado do Firebase:", inventory); // Para depuração
  renderAll(); // Re-renderiza a UI sempre que o inventário muda no DB
});

// Listener para o histórico: atualiza a variável local 'currentHistory' e re-renderiza o histórico
const historyDbRef = ref(db, 'history'); // Renomeado para evitar conflito com a função addHistory
onValue(historyDbRef, (snapshot) => {
  currentHistory = snapshot.exists() ? Object.values(snapshot.val()) : [];
  // Opcional: ordenar o histórico aqui se preferir. No renderHistory também é feito.
  console.log("Histórico atualizado do Firebase:", currentHistory); // Para depuração
  renderHistory(); // Re-renderiza a UI sempre que o histórico muda no DB
});

// --- FIM: Adições para Firebase ---


const LOW_STOCK_THRESHOLD = 2;

// --- INÍCIO: Lógica existente mantida intacta ---
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
// --- FIM: Lógica existente mantida intacta ---


function renderLowStock() {
  const list = document.getElementById('low-stock-list');
  list.innerHTML = '';
  // --- INÍCIO: Adaptação para Firebase 'inventory' objeto ---
  // Converte o objeto 'inventory' para um array de objetos, incluindo o id do Firebase.
  let items = Object.entries(inventory).map(([id, item]) => ({ id, ...item }));
  // --- FIM: Adaptação para Firebase 'inventory' objeto ---

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
  // --- INÍCIO: Adaptação para Firebase 'inventory' objeto ---
  // Converte o objeto 'inventory' para um array de objetos, incluindo o id do Firebase.
  let items = Object.entries(inventory).map(([id, item]) => ({ id, ...item }));
  // --- FIM: Adaptação para Firebase 'inventory' objeto ---
  
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
      (item.nome && item.nome.toLowerCase().includes(term)) || // Adicionado verificação 'item.nome &&'
      (item.categoria && item.categoria.toLowerCase().includes(term))
    );
  }
  if (items.length === 0) {
    list.innerHTML = '<p>Nenhum item cadastrado.</p>';
    return;
  }
  // --- INÍCIO: Adaptação para Firebase: itera sobre 'items' que agora tem 'id' ---
  items.forEach(item => { // 'item' agora já contém o 'id' do Firebase
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
    // Passa o item completo e o id do Firebase para as funções de clique
    card.querySelector('.edit-btn').onclick = () => openEditModal(item, item.id);
    card.querySelector('.delete-btn').onclick = () => deleteItem(item.id);
    list.appendChild(card);
  });
  // --- FIM: Adaptação para Firebase ---
}

const addForm = document.getElementById('add-item-form');

// --- INÍCIO: Adaptação da função addHistory para Firebase ---
function addHistory(action, item) {
  // Envia o novo registro de histórico diretamente para o Firebase
  push(ref(db, 'history'), {
    acao: action,
    nome: item.nome || 'N/A', // Garantir que as propriedades existem
    categoria: item.categoria || 'N/A',
    quantidade: item.quantidade || 'N/A',
    data: new Date().toLocaleString()
  }).catch(error => {
    console.error("Erro ao adicionar histórico no Firebase:", error);
  });
}
// --- FIM: Adaptação da função addHistory para Firebase ---

// --- INÍCIO: Adaptação da função renderHistory para Firebase ---
function renderHistory() {
  const list = document.getElementById('history-list');
  list.innerHTML = '';
  // 'currentHistory' já é atualizado pelo listener onValue e contém um array
  let history = currentHistory;

  // Ordena o histórico para mostrar os mais recentes primeiro
  const sortedHistory = history.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  if (sortedHistory.length === 0) {
    list.innerHTML = '<p>Nenhuma alteração registrada.</p>';
    return;
  }
  sortedHistory.forEach(entry => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${entry.acao}</strong>: ${entry.nome} (${entry.categoria}) - Qtd: ${entry.quantidade} <span style='float:right'>${entry.data}</span>`;
    list.appendChild(li);
  });
}
// --- FIM: Adaptação da função renderHistory para Firebase ---

// --- INÍCIO: Adaptação do addForm.onsubmit para Firebase ---
addForm.onsubmit = async function(e) { // Adicionado 'async'
  e.preventDefault();
  const formData = new FormData(addForm);
  const newItem = {
    nome: formData.get('name'),
    categoria: formData.get('category'),
    quantidade: parseInt(formData.get('quantity')),
    lowStock: formData.get('lowstock') ? parseInt(formData.get('lowstock')) : undefined,
    disableLowStock: formData.get('disablelowstock') === 'on'
  };
  
  // Envia o novo item para o Firebase
  try {
    const newRef = push(ref(db, 'inventory'));
    await set(newRef, newItem); // Usa 'await' para esperar a conclusão
    addHistory('Adicionado', newItem); // O addHistory é assíncrono, mas não precisa de await aqui
    addForm.reset();
    // renderAll() é chamado automaticamente pelo listener onValue para 'inventory'
    const searchInput = document.getElementById('edit-search');
    if (searchInput && searchInput.value.trim() !== '') {
      // renderEditList(); // Desnecessário, onValue já chamará renderAll
      searchInput.value = searchInput.value;
      searchInput.dispatchEvent(new Event('input'));
    }
    showModal('<h2>Item adicionado com sucesso!</h2>');
  } catch (error) {
    console.error("Erro ao adicionar item no Firebase:", error);
    showModal('<h2>Erro ao adicionar item!</h2>');
  }
};
// --- FIM: Adaptação do addForm.onsubmit para Firebase ---

// --- INÍCIO: Adaptação da openEditModal para Firebase ---
async function openEditModal(item, firebaseId) { // 'firebaseId' substitui 'idx'
  showModal(`
    <h2>Editar Item</h2>
    <form id="edit-item-form">
      <label for="edit-name">Nome:</label>
      <input type="text" id="edit-name" name="name" value="${item.nome}" required>
      <label for="edit-quantity">Quantidade:</label>
      <input type="number" id="edit-quantity" name="quantity" value="${item.quantidade}" min="1" required>
      <label for="edit-category">Categoria:</label>
      <input type="text" id="edit-category" name="category" value="${item.categoria}" required>
      <button type="submit">Salvar</button>
    </form>
  `);
  document.getElementById('edit-item-form').onsubmit = async function(e) { // Adicionado 'async'
    e.preventDefault();
    const formData = new FormData(this);
    const updatedItem = {
      nome: formData.get('name'),
      categoria: formData.get('category'),
      quantidade: parseInt(formData.get('quantity')),
      lowStock: item.lowStock, // Mantém as propriedades que não estão no modal de edição
      disableLowStock: item.disableLowStock
    };
    
    // Atualiza o item no Firebase usando o firebaseId
    try {
      await update(ref(db, `inventory/${firebaseId}`), updatedItem); // Usa 'await'
      addHistory('Editado', updatedItem); // O addHistory é assíncrono
      // renderAll() é chamado automaticamente pelo listener onValue para 'inventory'
      modalBg.classList.add('hidden');
    } catch (error) {
      console.error("Erro ao editar item no Firebase:", error);
      showModal('<h2>Erro ao editar item!</h2>');
    }
  };
}
// --- FIM: Adaptação da openEditModal para Firebase ---

// --- INÍCIO: Adaptação da deleteItem para Firebase ---
async function deleteItem(firebaseId) { // 'firebaseId' substitui 'idx'
  if (confirm('Tem certeza que deseja excluir este item?')) {
    const deletedItem = inventory[firebaseId]; // Pega o item antes de deletar para o histórico
    try {
      await remove(ref(db, `inventory/${firebaseId}`)); // Usa 'await'
      addHistory('Excluído', deletedItem); // O addHistory é assíncrono
      // renderAll() é chamado automaticamente pelo listener onValue para 'inventory'
    } catch (error) {
      console.error("Erro ao excluir item do Firebase:", error);
      showModal('<h2>Erro ao excluir item!</h2>');
    }
  }
}
// --- FIM: Adaptação da deleteItem para Firebase ---

function renderAll() {
  renderLowStock();
  renderEditList();
  // renderHistory() é chamado diretamente pelo listener 'onValue' de historyDbRef
}

// --- INÍCIO: Adaptação do window.onload para Firebase ---
// Garante que o aplicativo comece a renderizar após os listeners do Firebase serem configurados
// e o DOM estar totalmente carregado.
// Os listeners onValue para inventory e history chamam as funções de renderização
// automaticamente quando os dados são carregados pela primeira vez e sempre que mudam.
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM carregado. Listeners do Firebase configurados.");
    // Não precisamos chamar renderAll() aqui diretamente, pois os onValue já o fazem.
    // window.onload = renderAll; // Esta linha não é mais necessária
});