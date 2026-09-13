const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Apunta correctamente a la carpeta public
app.use(express.static(path.join(__dirname, 'public')));

let gameState = {
    drawnBalls: [],
    gameRound: 1,
    gameStarted: false,
    boughtCards: [] // Registro global de cartones comprados[cite: 1]
};

io.on('connection', (socket) => {
    // Sincronizar estado actual al conectarse un nuevo jugador
    socket.emit('server_sync_state', { 
        drawnBalls: gameState.drawnBalls,
        gameStarted: gameState.gameStarted,
        boughtCards: gameState.boughtCards
    });

    // Compra de cartones con bloqueo inmediato
    socket.on('buy_card', (data) => {
        const { cardId } = data;
        
        // Validar si el juego ya inició
        if (gameState.gameStarted) {
            socket.emit('error_message', { message: 'No se pueden comprar cartones una vez iniciada la partida.' });
            return;
        }

        // Validar si el cartón ya fue comprado
        if (gameState.boughtCards.includes(cardId)) {
            socket.emit('error_message', { message: `El cartón #${cardId} ya no está disponible.` });
            return;
        }

        // Registrar y bloquear para todos
        gameState.boughtCards.push(cardId);
        io.emit('server_card_bought', { boughtCards: gameState.boughtCards, cardId });
    });

    // Iniciar partida (ejemplo de control de administración)
    socket.on('admin_start_game', () => {
        gameState.gameStarted = true;
        io.emit('server_game_started', { gameStarted: true });
    });

    socket.on('admin_draw_ball', (data) => {
        gameState.drawnBalls = data.drawnBalls;
        io.emit('server_ball_drawn', { drawnBalls: gameState.drawnBalls });
    });

    // Procesar canto de bingo de forma segura en el servidor
    socket.on('player_claim_bingo', (data) => {
        const { cardId, markedNumbers } = data;

        // Validar que el cartón pertenezca a los comprados
        if (!gameState.boughtCards.includes(cardId)) {
            socket.emit('error_message', { message: 'Cartón no válido para reclamo.' });
            return;
        }

        // Validar que todas las balotas cantadas existan en los números marcados del cartón
        const isValid = markedNumbers.every(num => gameState.drawnBalls.includes(num));

        if (isValid) {
            io.emit('server_bingo_winner', { cardId, winner: socket.id });
        } else {
            socket.emit('error_message', { message: 'El canto de bingo es inválido. Faltan balotas por salir.' });
        }
    });

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
    console.log(`Servidor de Bingo activo en puerto ${PORT}`);
});