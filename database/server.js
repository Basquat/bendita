
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = express();
const port = 3000;
const SECRET = 'bendita_secret';

app.use(express.json());


const db = mysql.createConnection({
    host: 'localhost',
    user: 'SEU_USUARIO_MYSQL', // configure
    password: 'SUA_SENHA_MYSQL', // configure
    database: 'doceria_db' 
});

db.connect((err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
        return;
    }
    console.log('Conectado ao banco de dados MySQL!');
});


function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}


app.post('/api/login', (req, res) => {
    const { email, senha } = req.body;
    db.query('SELECT * FROM usuarios WHERE email = ?', [email], (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ error: 'Usuário ou senha inválidos' });
        const user = results[0];
        if (bcrypt.compareSync(senha, user.senha)) {
            const token = jwt.sign({ id: user.id, tipo: user.tipo, nome: user.nome }, SECRET, { expiresIn: '8h' });
            res.json({ token, user: { id: user.id, nome: user.nome, tipo: user.tipo } });
        } else {
            res.status(401).json({ error: 'Usuário ou senha inválidos' });
        }
    });
});


app.get('/api/usuarios', authenticateToken, (req, res) => {
    if (req.user.tipo !== 'dono') return res.sendStatus(403);
    db.query('SELECT id, nome, email, tipo, criado_em FROM usuarios', (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Erro ao buscar usuários' });
        } else {
            res.json(results);
        }
    });
});


app.post('/api/usuarios', authenticateToken, (req, res) => {
    if (req.user.tipo !== 'dono') return res.sendStatus(403);
    const { nome, email, senha } = req.body;
    const hash = bcrypt.hashSync(senha, 10);
    db.query('INSERT INTO usuarios (nome, email, senha, tipo) VALUES (?, ?, ?, ?)', [nome, email, hash, 'funcionario'], (err, result) => {
        if (err) return res.status(400).json({ error: 'Erro ao criar usuário' });
        // Log no histórico
        db.query('INSERT INTO historico (usuario_id, acao, detalhes) VALUES (?, ?, ?)', [req.user.id, 'criou funcionário', `Nome: ${nome}, Email: ${email}`]);
        res.json({ success: true });
    });
});


app.get('/api/estoque', authenticateToken, (req, res) => {
    db.query('SELECT * FROM estoque', (err, results) => {
        if (err) res.status(500).json({ error: 'Erro ao buscar estoque' });
        else res.json(results);
    });
});

app.post('/api/estoque', authenticateToken, (req, res) => {
    const { nome, categoria, quantidade } = req.body;
    db.query('INSERT INTO estoque (nome, categoria, quantidade) VALUES (?, ?, ?)', [nome, categoria, quantidade], (err, result) => {
        if (err) return res.status(400).json({ error: 'Erro ao adicionar item' });
        db.query('INSERT INTO historico (usuario_id, acao, detalhes) VALUES (?, ?, ?)', [req.user.id, 'adicionou item', `Nome: ${nome}, Categoria: ${categoria}, Qtd: ${quantidade}`]);
        res.json({ success: true });
    });
});

app.put('/api/estoque/:id', authenticateToken, (req, res) => {
    const { nome, categoria, quantidade } = req.body;
    db.query('UPDATE estoque SET nome=?, categoria=?, quantidade=? WHERE id=?', [nome, categoria, quantidade, req.params.id], (err, result) => {
        if (err) return res.status(400).json({ error: 'Erro ao editar item' });
        db.query('INSERT INTO historico (usuario_id, acao, detalhes) VALUES (?, ?, ?)', [req.user.id, 'editou item', `ID: ${req.params.id}, Nome: ${nome}, Categoria: ${categoria}, Qtd: ${quantidade}`]);
        res.json({ success: true });
    });
});

app.delete('/api/estoque/:id', authenticateToken, (req, res) => {
    db.query('DELETE FROM estoque WHERE id=?', [req.params.id], (err, result) => {
        if (err) return res.status(400).json({ error: 'Erro ao excluir item' });
        db.query('INSERT INTO historico (usuario_id, acao, detalhes) VALUES (?, ?, ?)', [req.user.id, 'excluiu item', `ID: ${req.params.id}`]);
        res.json({ success: true });
    });
});


app.get('/api/historico', authenticateToken, (req, res) => {
    if (req.user.tipo !== 'dono') return res.sendStatus(403);
    db.query('SELECT h.*, u.nome as usuario_nome FROM historico h LEFT JOIN usuarios u ON h.usuario_id = u.id ORDER BY h.data DESC', (err, results) => {
        if (err) res.status(500).json({ error: 'Erro ao buscar histórico' });
        else res.json(results);
    });
});


app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});