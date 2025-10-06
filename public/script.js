
const socket = io();


const cells = document.querySelectorAll('.cell');
const titleHeader = document.querySelector('#titleHeader');
const xPlayerDisplay = document.querySelector('#xPlayerDisplay');
const oPlayerDisplay = document.querySelector('#oPlayerDisplay');
const restartBtn = document.querySelector('#restartBtn');


const clickSound = new Audio('./click.mp3');
const drawSound = new Audio('./draw.mp3');
const winSound = new Audio('./win.mp3');


let audioUnlocked = false;


clickSound.addEventListener('error', (e) => console.error('Error loading click sound:', e));
drawSound.addEventListener('error', (e) => console.error('Error loading draw sound:', e));
winSound.addEventListener('error', (e) => console.error('Error loading win sound:', e));

document.addEventListener('click', () => {
    if (!audioUnlocked) {

        Promise.all([
            clickSound.play().then(() => clickSound.pause()).catch(e => console.error('Click sound unlock failed:', e)),
            drawSound.play().then(() => drawSound.pause()).catch(e => console.error('Draw sound unlock failed:', e)),
            winSound.play().then(() => winSound.pause()).catch(e => console.error('Win sound unlock failed:', e))
        ]).then(() => {
            console.log('Audio unlocked successfully');
            audioUnlocked = true;
        }).catch(e => console.error('Audio unlock failed:', e));
    }
}, { once: true });


let roomId = null;
let playerSymbol = null;
let isMyTurn = false;


let playerName = prompt("Enter your name") || "Player";
roomId = prompt("Enter room ID to join (leave blank to create new)") || null;


if (!roomId) {
    socket.emit('createRoom', { name: playerName }, (resp) => {
        if (resp.ok) {
            roomId = resp.roomId;
            playerSymbol = resp.symbol;
            isMyTurn = (playerSymbol === 'X');
            titleHeader.textContent = `Waiting for opponent...`;
            alert(`Room created! Share this ID with your friend: ${roomId}`);
        }
    });
} else {
    socket.emit('joinRoom', { roomId, name: playerName }, (resp) => {
        if (resp.ok) {
            playerSymbol = resp.symbol;
            isMyTurn = (playerSymbol === 'X');
            titleHeader.textContent = isMyTurn ? `Your turn` : `Opponent's turn`;
        } else {
            alert('Failed to join room: ' + resp.error);
        }
    });
}


function updatePlayerHighlight() {
    if (playerSymbol === 'X') {
        xPlayerDisplay.classList.add('player-active');
        oPlayerDisplay.classList.remove('player-active');
    } else {
        xPlayerDisplay.classList.remove('player-active');
        oPlayerDisplay.classList.add('player-active');
    }
}
updatePlayerHighlight();


cells.forEach((cell, idx) => {
    cell.addEventListener('click', () => {
        if (!isMyTurn || cell.textContent !== '') return;
        socket.emit('makeMove', { roomId, index: idx });
    });
});


socket.on('moveMade', (payload) => {
    const { board, turn, result } = payload;
    board.forEach((val, idx) => {
        cells[idx].textContent = val || '';
        cells[idx].style.color = (val === 'X') ? '#1892EA' : '#A737FF';
    });

    if (result) {
        if (result.draw) {
            titleHeader.textContent = 'Draw!';
            drawSound.play().catch(() => { });
        } else if (result.winner) {
            titleHeader.textContent = `${result.winner} Wins!`;
            winSound.play().catch(() => { });
        }
        restartBtn.style.visibility = 'visible';
        isMyTurn = false;
    } else {
        isMyTurn = (turn === playerSymbol);
        titleHeader.textContent = isMyTurn ? 'Your turn' : "Opponent's turn";
        clickSound.play().catch(() => { });
    }

    updatePlayerHighlight();
});

restartBtn.addEventListener('click', () => {
    socket.emit('restartGame', { roomId });
    restartBtn.style.visibility = 'hidden';
});

socket.on('roomUpdate', (room) => {
    room.board.forEach((val, idx) => {
        cells[idx].textContent = val || '';
        cells[idx].style.background = '';
        cells[idx].style.color = (val === 'X') ? '#1892EA' : '#A737FF';
    });
    isMyTurn = (room.turn === playerSymbol);
    titleHeader.textContent = isMyTurn ? 'Your turn' : "Opponent's turn";
    updatePlayerHighlight();
});
