// dom-utils.js
// Funções utilitárias para manipulação de DOM

// Adiciona uma classe a um elemento
export function addClass(el, className) {
  if (el && !el.classList.contains(className)) {
    el.classList.add(className);
  }
}

// Remove uma classe de um elemento
export function removeClass(el, className) {
  if (el && el.classList.contains(className)) {
    el.classList.remove(className);
  }
}

// Cria e retorna um novo elemento com classes e atributos
export function createElement(tag, options = {}) {
  const el = document.createElement(tag);
  if (options.className) el.className = options.className;
  if (options.attrs) {
    Object.entries(options.attrs).forEach(([key, value]) => {
      el.setAttribute(key, value);
    });
  }
  if (options.text) el.textContent = options.text;
  return el;
}

// Limpa todos os filhos de um elemento
export function clearChildren(el) {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}