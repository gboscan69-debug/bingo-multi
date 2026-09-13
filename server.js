const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

let gameState = {
    drawnBalls: [],
    gameRound: 1,
    gameStarted: false,
    boughtCards: [] //[cite: 1] Registro global en memoria de cartones comprados
};

io.on('connection', (socket) => {
    // Sincronizar el estado global instantáneamente al conectar un cliente
    socket.emit('server_sync_state', { 
        drawnBalls: gameState.drawnBalls,
        gameStarted: gameState.gameStarted,
        boughtCards: gameState.boughtCards
    });

    // Gestión en tiempo real de la compra de cartones
    socket.on('buy_card', (data) => {
        const { cardId } = data;
        
        // Validar si el juego ya dio inicio para bloquear nuevas compras
        if (gameState.gameStarted) {
            socket.emit('error_message', { message: 'La partida ya comenzó. No se pueden adquirir más cartones.' });
            return;
        }

        // Validación estricta global: verificar si el cartón ya fue comprado previamente
        if (gameState.boughtCards.includes(cardId)) {
            socket.emit('error_message', { message: `El cartón #${cardId} ya fue comprado por otro jugador y no está disponible.` });
            return;
        }

        // Registrar la compra asociándola globalmente y bloqueándola al instante para todos
        gameState.boughtCards.push(cardId);

        // Transmitir en tiempo real a todos los clientes conectados que el cartón fue comprado
        io.emit('server_card_bought', { 
            boughtCards: gameState.boughtCards, 
            cardId, 
            buyerId: socket.id 
        });
    });

    // Iniciar la partida desde el panel de administración
    socket.on('admin_start_game', () => {
        gameState.gameStarted = true;
        io.emit('server_game_started', { gameStarted: true });
    });

    // Transmisión en tiempo real de cada balota cantada
    socket.on('admin_draw_ball', (data) => {
        gameState.drawnBalls = data.drawnBalls;
        io.emit('server_ball_drawn', { drawnBalls: gameState.drawnBalls });
    });

    // Procesar cantos de bingo en tiempo real de forma segura
    socket.on('player_claim_bingo', (data) => {
        const { cardId, markedNumbers } = data;

        if (!gameState.boughtCards.includes(cardId)) {
            socket.emit('error_message', { message: 'Este cartón no te pertenece o no es válido.' });
            return;
        }

        const isValid = markedNumbers.every(num => gameState.drawnBalls.includes(num));

        if (isValid) {
            io.emit('server_bingo_winner', { cardId, winner: socket.id });
        } else {
            socket.emit('error_message', { message: 'Canto de bingo inválido. Aún faltan balotas por salir.' });
        }
    });

    // Reinicio total para la siguiente ronda en línea
    socket.on('admin_reset_game', () => {
        gameState.drawnBalls = [];
        gameState.gameStarted = false;
        gameState.boughtCards = [];
        gameState.gameRound++;
        io.emit('server_reset_game', { gameRound: gameState.gameRound });
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Servidor de Bingo en línea activo en puerto ${PORT}`);
});