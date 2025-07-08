document.addEventListener('DOMContentLoaded', function () {
        const form = document.getElementById('suporteForm');

        form.addEventListener('submit', function (event) {
            event.preventDefault();

            
            const nome = document.getElementById('nome').value.trim();
            const email = document.getElementById('email').value.trim();
            const departamento = document.getElementById('departamento').value;
            const turno = document.getElementById('turno').value.trim().toLowerCase();
            const tipo = document.getElementById('tipo').value;
            const descricao = document.getElementById('descricao').value.trim();
            const urgencia = document.getElementById('urgencia').value;
            const data = document.getElementById('data').value;
            const contato = document.getElementById('contato').value.trim();

            // Validação dos campos obrigatórios
            if (
                nome && email && departamento &&
                (turno === 'matutino' || turno === 'vespertino' || turno === 'noturno') &&
                tipo && descricao && urgencia && data && contato
            ) {
                alert('Solicitação enviada com sucesso!');
                form.reset(); 
            } else {
               
                if (turno !== 'matutino' && turno !== 'vespertino' && turno !== 'noturno') {
                    alert('O campo "Turno de trabalho" deve conter: matutino, vespertino ou noturno.');
                } else {
                    alert('Por favor, preencha todos os campos corretamente.');
                }
            }
        });
    });