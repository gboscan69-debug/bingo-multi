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
    gameRound: 1
};

io.on('connection', (socket) => {
    // Sincronizar estado actual al conectarse un nuevo jugador
    socket.emit('server_ball_drawn', { drawnBalls: gameState.drawnBalls });

    socket.on('admin_draw_ball', (data) => {
        gameState.drawnBalls = data.drawnBalls;
        io.emit('server_ball_drawn', { drawnBalls: gameState.drawnBalls });
    });

    socket.on('admin_reset_game', () => {
        gameState.drawnBalls = [];
        gameState.gameRound++;
        io.emit('server_reset_game', { gameRound: gameState.gameRound });
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Servidor de Bingo activo en puerto ${PORT}`);
});