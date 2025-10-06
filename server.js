const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const rooms = new Map();

function makeRoomId() {
  return crypto.randomBytes(3).toString('hex');
}

function checkWinner(board) {
  const wins = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  for (const [a,b,c] of wins) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return null;
}

io.on('connection', (socket) => {
  socket.on('createRoom', ({ name }, callback) => {
    const roomId = makeRoomId();
    const room = { players: [], board: Array(9).fill(''), turn: 'X' };
    rooms.set(roomId, room);
    room.players.push({ id: socket.id, name, symbol: 'X' });
    socket.join(roomId);
    callback({ ok: true, roomId, symbol: 'X' });
  });

  socket.on('joinRoom', ({ roomId, name }, callback) => {
    const room = rooms.get(roomId);
    if (!room) return callback({ ok: false, error: 'Room not found' });
    if (room.players.length >= 2) return callback({ ok: false, error: 'Room full' });
    room.players.push({ id: socket.id, name, symbol: 'O' });
    socket.join(roomId);
    io.to(roomId).emit('roomUpdate', room);
    callback({ ok: true, symbol: 'O' });
  });

  socket.on('makeMove', ({ roomId, index }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;
    if (room.board[index] || room.turn !== player.symbol) return;
    room.board[index] = player.symbol;
    const winner = checkWinner(room.board);
    let result = null;
    if (winner) result = { winner };
    else if (room.board.every(cell => cell)) result = { draw: true };
    room.turn = (room.turn === 'X') ? 'O' : 'X';
    io.to(roomId).emit('moveMade', { board: room.board, turn: room.turn, result });
  });

  socket.on('restartGame', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.board = Array(9).fill('');
    room.turn = 'X';
    io.to(roomId).emit('roomUpdate', room);
  });

  socket.on('disconnect', () => {
    rooms.forEach((room, id) => {
      room.players = room.players.filter(p => p.id !== socket.id);
      if (room.players.length === 0) rooms.delete(id);
    });
  });
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
