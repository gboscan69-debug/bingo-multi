const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Apunta correctamente a la carpeta public[cite: 3]
app.use(express.static(path.join(__dirname, 'public')));

// Estado global del juego en el servidor
let gameState = {
    drawnBalls: [],
    gameRound: 1
};

// Registro global de cartones comprados (clave: número de cartón, valor: userId)
let globalBoughtCards = {};

io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);

    // Sincronizar estado actual de las bolas al conectarse un nuevo jugador[cite: 3]
    socket.emit('server_ball_drawn', { drawnBalls: gameState.drawnBalls });

    // --- ACCIONES DEL ADMINISTRADOR ---
    socket.on('admin_draw_ball', (data) => {
        gameState.drawnBalls = data.drawnBalls;
        io.emit('server_ball_drawn', { drawnBalls: gameState.drawnBalls });[cite: 3]
    });

    socket.on('admin_reset_game', () => {
        gameState.drawnBalls = [];
        gameState.gameRound++;
        globalBoughtCards = {}; // Limpia los cartones comprados al reiniciar la partida
        io.emit('server_reset_game', { gameRound: gameState.gameRound });[cite: 3]
    });

    // --- ACCIONES DE LOS JUGADORES (COMPRA DE CARTONES) ---
    socket.on('player_buy_card', (data) => {
        const { cardNumber, userId, currentDiamonds } = data;
        const CARD_PRICE = 10;

        // 1. Validar si el cartón ya fue comprado por otro usuario
        if (globalBoughtCards[cardNumber]) {
            socket.emit('server_buy_error', '❌ Este cartón ya fue comprado por otro jugador.');
            return;
        }

        // 2. Validar fondos suficientes
        if (currentDiamonds < CARD_PRICE) {
            socket.emit('server_buy_error', '❌ No tienes suficientes diamantes.');
            return;
        }

        // 3. Registrar la compra globalmente
        globalBoughtCards[cardNumber] = userId;
        const newDiamonds = currentDiamonds - CARD_PRICE;

        // 4. Notificar a todos los clientes
        io.emit('server_card_bought', {
            cardNumber: cardNumber,
            owner: userId,
            diamonds: newDiamonds
        });
    });

    socket.on('disconnect', () => {
        console.log('Usuario desconectado:', socket.id);
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Servidor de Bingo activo en puerto ${PORT}[cite: 3]`);
});