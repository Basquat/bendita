async function handleSubmit(event) {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const messageBox = document.getElementById("message");

    try {
        const res = await fetch("http://localhost:3000/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email, senha: password })
        });
        const data = await res.json();
        if (res.ok && data.token) {
            localStorage.setItem("bendita_token", data.token);
            messageBox.textContent = "Login bem sucedido!";
            messageBox.style.color = "#00CC66";
            setTimeout(() => {
                window.location.href = "bendita/index.html";
            }, 1000);
        } else {
            messageBox.textContent = data.error || "E-mail ou senha inválidos!";
            messageBox.style.color = "#FF0000";
        }
    } catch (err) {
        messageBox.textContent = "Erro ao conectar ao servidor.";
        messageBox.style.color = "#FF0000";
    }
}


document.getElementById('toggle-mode').addEventListener('click', function () {
    document.body.classList.toggle('light-mode');
    const elements = document.querySelectorAll('.login-box, h1, label, .message, button');
    elements.forEach(el => el.classList.toggle('light-mode'));

    this.textContent = this.textContent === 'Modo Escuro' ? 'Modo Claro' : 'Modo Escuro';
});