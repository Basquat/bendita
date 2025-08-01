import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, get, set, push, update, remove, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

const firebaseConfig = {
  databaseURL: "https://bendita-trufa-9e067-default-rtdb.firebaseio.com/"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// A variável 'inventory' será um objeto de objetos,
// onde as chaves são os IDs gerados pelo Firebase.
// Por exemplo: { "-N_abc123": { nome: "Produto A", ... }, "-N_xyz456": { nome: "Produto B", ... } }
let inventory = {};

// Função para buscar o inventário do Firebase
async function fetchInventory() {
  const snapshot = await get(ref(db, 'inventory'));
  // Se houver dados, atribui o objeto diretamente. Se não, um objeto vazio.
  inventory = snapshot.exists() ? snapshot.val() : {};
  console.log("Inventário carregado:", inventory); // Adicionado para depuração
}

// Função para adicionar um novo item
async function addItem(newItem) {
  try {
    const newRef = push(ref(db, 'inventory')); // Cria uma nova referência com um ID único
    await set(newRef, newItem); // Define os dados no novo ID
    console.log("Item adicionado com sucesso!", newItem); // Adicionado para depuração
    addHistory('Adicionado', newItem); // Registra a ação no histórico
    await fetchInventory(); // Recarrega o inventário após a adição
    renderAll(); // Atualiza a interface
    return true;
  } catch (error) {
    console.error("Erro ao adicionar item:", error);
    showModal('<h2>Erro ao adicionar item!</h2>');
    return false;
  }
}

// Função para atualizar um item existente
async function updateItem(id, updatedItem) {
  try {
    await update(ref(db, `inventory/${id}`), updatedItem);
    console.log("Item atualizado com sucesso!", updatedItem); // Adicionado para depuração
    // O histórico aqui poderia ser mais detalhado, mas para simplificar, usamos o item atualizado
    addHistory('Atualizado', updatedItem); // Registra a ação no histórico
    await fetchInventory(); // Recarrega o inventário após a atualização
    renderAll(); // Atualiza a interface
    return true;
  } catch (error) {
    console.error("Erro ao atualizar item:", error);
    showModal('<h2>Erro ao editar item!</h2>');
    return false;
  }
}

// Função para deletar um item
async function deleteItemAPI(id) {
  try {
    const itemToDelete = inventory[id]; // Pega os dados do item antes de deletar para o histórico
    await remove(ref(db, `inventory/${id}`));
    console.log("Item excluído com sucesso! ID:", id); // Adicionado para depuração
    addHistory('Excluído', itemToDelete); // Registra a ação no histórico
    await fetchInventory(); // Recarrega o inventário após a exclusão
    renderAll(); // Atualiza a interface
    return true;
  } catch (error) {
    console.error("Erro ao excluir item:", error);
    showModal('<h2>Erro ao excluir item!</h2>');
    return false;
  }
}

// Função para adicionar um registro ao histórico
function addHistory(action, item) {
  const historyRef = ref(db, 'history');
  push(historyRef, {
    acao: action,
    nome: item.nome || 'N/A', // Garante que 'nome' existe
    categoria: item.categoria || 'N/A', // Garante que 'categoria' existe
    quantidade: item.quantidade || 'N/A', // Garante que 'quantidade' existe
    data: new Date().toLocaleString()
  }).catch(error => {
    console.error("Erro ao adicionar histórico:", error);
  });
}

// Função principal para renderizar todas as seções
async function renderAll() {
  // fetchInventory já foi chamado antes ou será chamado por uma operação CRUD
  // para garantir que 'inventory' esteja atualizado.
  renderLowStock();
  renderEditList();
  // renderHistory usa onValue, então ele se atualiza em tempo real.
  // Não precisa ser chamado aqui se a intenção é só essa.
  // Se for a primeira vez que a página carrega, chame-o para configurar o listener.
  // Se já está configurado, o onValue faz o trabalho.
}

// Função para renderizar o histórico em tempo real
function renderHistory() {
  const list = document.getElementById('history-list');
  if (!list) { // Verifica se o elemento existe
      console.warn("Elemento 'history-list' não encontrado.");
      return;
  }
  list.innerHTML = ''; // Limpa a lista antes de adicionar o listener para evitar duplicatas

  const historyRef = ref(db, 'history');
  // onValue é um listener em tempo real. Ele será acionado toda vez que o histórico mudar.
  onValue(historyRef, (snapshot) => {
    list.innerHTML = ''; // Limpa a lista novamente a cada atualização para recriar
    const historyData = snapshot.exists() ? Object.values(snapshot.val()) : [];

    // Inverte a ordem para mostrar os mais recentes primeiro
    const sortedHistory = historyData.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    if (sortedHistory.length === 0) {
      list.innerHTML = '<p>Nenhuma alteração registrada.</p>';
      return;
    }
    sortedHistory.forEach(entry => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${entry.acao}</strong>: ${entry.nome} (${entry.categoria}) - Qtd: ${entry.quantidade} <span style='float:right'>${entry.data}</span>`;
      list.appendChild(li);
    });
  }, (error) => {
      console.error("Erro ao buscar histórico:", error);
      list.innerHTML = '<p>Erro ao carregar histórico.</p>';
  });
}


// Abre o modal de edição
function openEditModal(item, id) {
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
  document.getElementById('edit-item-form').onsubmit = async function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    const updatedItem = {
      nome: formData.get('name'),
      categoria: formData.get('category'),
      // Certifique-se de que a quantidade é um número
      quantidade: parseInt(formData.get('quantity'), 10)
    };
    const success = await updateItem(id, updatedItem);
    if (success) {
      modalBg.classList.add('hidden');
      // renderAll() já é chamado dentro de updateItem para manter a consistência
    } else {
      // Mensagem de erro já é tratada dentro de updateItem
    }
  };
}

// Inicia a exclusão de um item
async function deleteItem(id) {
  if (confirm('Tem certeza que deseja excluir este item?')) {
    // deleteItemAPI() já chama renderAll() e fetchInventory()
    await deleteItemAPI(id);
  }
}

// Renderiza a lista de edição (principalmente para o seu problema de filter)
function renderEditList() {
  const list = document.getElementById('edit-list');
  if (!list) { // Verifica se o elemento existe
      console.warn("Elemento 'edit-list' não encontrado.");
      return;
  }
  list.innerHTML = '';

  let searchDiv = document.getElementById('edit-search-div');
  let searchInput;

  // Cria ou pega o input de busca
  if (!searchDiv) {
    searchDiv = document.createElement('div');
    searchDiv.id = 'edit-search-div';
    searchDiv.innerHTML = '<input type="text" id="edit-search" placeholder="Pesquisar por nome ou categoria..." style="margin-bottom:10px;width:100%">';
    list.parentNode.insertBefore(searchDiv, list);
    searchInput = document.getElementById('edit-search');
    searchInput.oninput = () => renderEditList(); // Re-renderiza a lista ao digitar
  } else {
    searchInput = document.getElementById('edit-search');
    // Garante que o evento oninput está configurado
    if (searchInput && !searchInput.oninput) {
      searchInput.oninput = () => renderEditList();
    }
  }

  const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';

  // *** AQUI ESTÁ A MUDANÇA CRUCIAL para o seu problema de "filter" ***
  // Converte o objeto 'inventory' em um array de objetos,
  // incluindo o ID do Firebase em cada item para facilitar as operações.
  let itemsToRender = Object.entries(inventory).map(([id, item]) => ({ id, ...item }));

  // Aplica o filtro se houver um termo de busca
  if (searchTerm !== '') {
    itemsToRender = itemsToRender.filter(item =>
      (item.nome && item.nome.toLowerCase().includes(searchTerm)) || // Verifica se item.nome existe
      (item.categoria && item.categoria.toLowerCase().includes(searchTerm)) // Verifica se item.categoria existe
    );
  }

  if (itemsToRender.length === 0) {
    list.innerHTML = '<p>Nenhum item cadastrado ou encontrado com o termo de busca.</p>';
    return;
  }

  // Renderiza os itens filtrados
  itemsToRender.forEach(item => { // item agora já contém o ID e os outros dados
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
    // Passa o objeto completo do item e o ID para as funções de clique
    card.querySelector('.edit-btn').onclick = () => openEditModal(item, item.id);
    card.querySelector('.delete-btn').onclick = () => deleteItem(item.id);
    list.appendChild(card);
  });
}

// *** FUNÇÃO FALTANDO ***
// Assumi que você tem uma função para renderizar itens com baixo estoque.
// Ela precisaria de uma lógica similar à renderEditList para iterar sobre o inventário.
function renderLowStock() {
    const lowStockList = document.getElementById('low-stock-list'); // Certifique-se de ter um elemento com este ID no HTML
    if (!lowStockList) {
        console.warn("Elemento 'low-stock-list' não encontrado.");
        return;
    }
    lowStockList.innerHTML = '';

    // Define um limite para considerar "baixo estoque"
    const LOW_STOCK_THRESHOLD = 5;

    // Converte o objeto 'inventory' em um array de objetos
    const itemsToCheck = Object.entries(inventory).map(([id, item]) => ({ id, ...item }));

    const lowStockItems = itemsToCheck.filter(item =>
        item.quantidade !== undefined && item.quantidade <= LOW_STOCK_THRESHOLD
    );

    if (lowStockItems.length === 0) {
        lowStockList.innerHTML = '<p>Nenhum item com baixo estoque.</p>';
        return;
    }

    lowStockItems.forEach(item => {
        const li = document.createElement('li');
        li.textContent = `${item.nome} (${item.categoria}): ${item.quantidade} em estoque.`;
        lowStockList.appendChild(li);
    });
}

// *** FUNÇÕES AUXILIARES (Assumindo que você as tem ou precisará delas) ***
// Função para mostrar o modal (exemplo)
const modalBg = document.getElementById('modal-bg'); // Elemento de fundo do modal
const modalContent = document.getElementById('modal-content'); // Elemento de conteúdo do modal

function showModal(content) {
  if (modalContent && modalBg) {
    modalContent.innerHTML = content;
    modalBg.classList.remove('hidden');
  } else {
    console.error("Elementos do modal (modal-bg ou modal-content) não encontrados!");
    alert("Modal: " + content.replace(/<[^>]*>?/gm, '')); // Fallback para alerta se não tiver modal
  }
}

// Adicione um listener para fechar o modal
if (modalBg) {
    modalBg.addEventListener('click', (e) => {
        if (e.target === modalBg) { // Fecha apenas se clicar no fundo, não no conteúdo
            modalBg.classList.add('hidden');
        }
    });
}

// *** INICIA O APLICATIVO ***
// Certifique-se de chamar essa função quando o DOM estiver completamente carregado.
// Listener para navegação por abas
function setupTabs() {
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
}

document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  await fetchInventory();
  renderAll();
  renderHistory();
});

// Exemplo de como você adicionaria um novo item (se tivesse um formulário de adição)
// document.getElementById('add-item-form').onsubmit = async function(e) {
//     e.preventDefault();
//     const formData = new FormData(this);
//     const newItem = {
//         nome: formData.get('name'),
//         categoria: formData.get('category'),
//         quantidade: parseInt(formData.get('quantity'), 10)
//     };
//     await addItem(newItem);
//     this.reset(); // Limpa o formulário
// };

