/* script.js - jogo Tetris melhorado
   Comentários e organização para facilitar manutenção.
*/

/* ========= Configurações e seletores ========= */
const mainCanvas = document.getElementById('mainCanvas');
const nextCanvas = document.getElementById('nextCanvas');
const ctx = mainCanvas.getContext('2d');
const nextCtx = nextCanvas.getContext('2d');

const startBtn = document.getElementById('startBtn');
const nameInput = document.getElementById('playerName');
const scoreValueEl = document.querySelector('.score-value');
const linesValueEl = document.querySelector('.lines-value');
const timeValueEl = document.querySelector('.time-value');
const speedValueEl = document.querySelector('.speed-value');
const scoreTableBody = document.querySelector('#scoreTable tbody');
const clearScoresBtn = document.getElementById('clearScoresBtn');

const instructionsModal = document.getElementById('instructionsModal');
const closeModalBtn = document.getElementById('closeModalBtn');

const backgroundMusic = document.getElementById('backgroundMusic');
const pausePopup = document.getElementById('pausePopup');
const resumeBtn = document.getElementById('resumeBtn');
const volumeControl = document.getElementById('volumeControl');

const requiredLetters = ['A', 'G', 'T', 'M'];


let rgbMode = false;
let typedLetters = [];

/* ========= Constantes do jogo ========= */
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30; // pixels — combinação com canvas width/height deve bater (300x600)
const DEFAULT_SPEED = 500; // ms entre quedas
const MIN_SPEED = 100; // limite mínimo de velocidade
const SCORE_PER_LINE = 100;

/* ========= Estado do jogo ========= */
let board = [];
let current = null;
let nextTetromino = null;
let gameInterval = null;
let timeInterval = null;
let speed = DEFAULT_SPEED;
let score = 0;
let linesCleared = 0;
let elapsedTime = 0;
let gameOver = false;
let isPaused = false; // Nova variável para controle de pausa


/* Persistência de placares */
const STORAGE_KEY = 'fadasblock_scores';
let scores = loadScores();

/* ========= Tetrominos (matrizes 2D) ========= */
/* Use 0/1 matrices; pode estender cores se quiser */
const TETROMINOS = {
  I: [[1,1,1,1]],
  O: [[1,1],[1,1]],
  T: [[0,1,0],[1,1,1]],
  S: [[0,1,1],[1,1,0]],
  Z: [[1,1,0],[0,1,1]],
  J: [[1,0,0],[1,1,1]],
  L: [[0,0,1],[1,1,1]],
};

const TETROMINO_KEYS = Object.keys(TETROMINOS);

/* ========= Utilitários ========= */
function deepCopy(mat){ return mat.map(row => row.slice()); }

function randomTetromino(){
  const k = TETROMINO_KEYS[Math.floor(Math.random() * TETROMINO_KEYS.length)];
  return deepCopy(TETROMINOS[k]);
}

/* ========= Início / Reset / Salvar placares ========= */
function initBoard(){
  board = Array.from({length: ROWS}, () => Array(COLS).fill(0));
  
  // Adicionar evento para o botão de volume
volumeControl.addEventListener('input', function() {
  backgroundMusic.volume = this.value;
});
}

function resetGame(){
  initBoard();
  score = 0;
  linesCleared = 0;
  elapsedTime = 0;
  speed = DEFAULT_SPEED;
  gameOver = false;
  isPaused = false; // Reseta o estado de pausa

  current = { tetromino: randomTetromino(), row: 0, col: 3 };
  nextTetromino = randomTetromino();

  updateDisplays();
  draw();
  drawNext();

  clearInterval(gameInterval);
  clearInterval(timeInterval);
  gameInterval = setInterval(drop, speed);

  timeInterval = setInterval(() => {
    if (!gameOver) {
      elapsedTime++;
      updateTimeDisplay();
    }
  }, 1000);
  
  // Ativa o botão de pause após o início do jogo
  pauseBtn.disabled = false;
}

function saveScore(name, points){
  if (!name) return;
  scores.push({ name, points, date: new Date().toISOString() });
  scores.sort((a,b)=> b.points - a.points);
  // keep top 10
  scores = scores.slice(0, 10);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  renderScoreTable();
}

function loadScores(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch(e){ return []; }
}

function clearScores(){
  scores = [];
  localStorage.removeItem(STORAGE_KEY);
  renderScoreTable();
}

/* ========= Renderização ========= */
function draw(){
  // limpa canvas principal
  ctx.clearRect(0,0,mainCanvas.width, mainCanvas.height);

  // desenha blocos fixos do board
  for (let r = 0; r < ROWS; r++){
    for (let c = 0; c < COLS; c++){
      if (board[r][c]){
        drawBlock(c, r, '#9fcf9a'); // cor dos blocos fixos - verde claro
      }
    }
  }

  // desenha peça atual
  if (current && current.tetromino){
    for (let r = 0; r < current.tetromino.length; r++){
      for (let c = 0; c < current.tetromino[0].length; c++){
        if (current.tetromino[r][c]){
          drawBlock(current.col + c, current.row + r, '#7c90bd'); // cor da peça atual - azul
        }
      }
    }
  }
}


// ====== EASTER EGG DE GERALDO ======
function drawBlock(col, row, color) {
  if (rgbMode) {
    // Cores pastel para o Easter Egg
    const pastelColors = [
      // Roxo
      '#E6E6FA', // Lavanda
      '#D8BFD8', // Amoras
      '#DDA0DD', // Lavanda Média
      '#EE82EE', // Víiola
      '#DA70D6', // Orchid
      '#BA55D3', // Media Orchid
      '#9370DB', // Médio Purple
      '#8A2BE2', // Blue Violet
      '#9932CC', // Dark Orchid
      '#800080', // Purple
      
      // Rosa
      '#FFB6C1', // Rosa Claro
      '#FF69B4', // Hot Pink
      '#FF1493', // Deep Pink
      '#C71585', // Medium Violet Red
      '#DB7093', // Pale Violet Red
      '#FF69B4', // Hot Pink
      '#FFB6C1', // Light Pink
      '#FFC0CB', // Pink
      '#F08080', // Light Coral
      '#FF6347', // Tomato
    ];

    const randomColor = pastelColors[Math.floor(Math.random() * pastelColors.length)];
    ctx.fillStyle = randomColor;
  } else {
    ctx.fillStyle = color;
  }
  
  ctx.fillRect(col * BLOCK_SIZE, row * BLOCK_SIZE, BLOCK_SIZE-1, BLOCK_SIZE-1);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.strokeRect(col * BLOCK_SIZE, row * BLOCK_SIZE, BLOCK_SIZE-1, BLOCK_SIZE-1);
}
// ====== FIM DO EASTER EGG DE GERALDO ======

/* Draw next piece scaled to next canvas */
function drawNext(){
  nextCtx.clearRect(0,0,nextCanvas.width,nextCanvas.height);
  const matrix = nextTetromino;
  if (!matrix) return;

  const rows = matrix.length;
  const cols = matrix[0].length;

  // calcular scale para se ajustar ao nextCanvas
  const maxSize = Math.min(nextCanvas.width, nextCanvas.height);
  const block = Math.floor((maxSize - 10) / Math.max(rows, cols)); // leave padding
  const offsetX = Math.floor((nextCanvas.width - (cols * block)) / 2);
  const offsetY = Math.floor((nextCanvas.height - (rows * block)) / 2);

  for (let r = 0; r < rows; r++){
    for (let c = 0; c < cols; c++){
      if (matrix[r][c]){
        nextCtx.fillStyle = '#7c90bd';
        nextCtx.fillRect(offsetX + c*block, offsetY + r*block, block-1, block-1);
      }
    }
  }
}

/* ========= Física / Colisões / Linhas ========= */
function collide(testRow, testCol, tetro = current.tetromino){
  for (let r = 0; r < tetro.length; r++){
    for (let c = 0; c < tetro[0].length; c++){
      if (tetro[r][c]){
        const nr = testRow + r;
        const nc = testCol + c;
        if (nc < 0 || nc >= COLS || nr >= ROWS) return true;
        if (nr >= 0 && board[nr][nc]) return true;
      }
    }
  }
  return false;
}

function fixPiece(){
  const t = current.tetromino;
  for (let r = 0; r < t.length; r++){
    for (let c = 0; c < t[0].length; c++){
      if (t[r][c]){
        const br = current.row + r;
        const bc = current.col + c;
        if (br >= 0 && br < ROWS && bc >= 0 && bc < COLS) board[br][bc] = 1;
      }
    }
  }
  clearLines();
}

/* Remove linhas completas */
function clearLines(){
  let removed = 0;
  for (let r = ROWS - 1; r >= 0; r--){
    if (board[r].every(cell => cell === 1)){
      board.splice(r,1);
      board.unshift(Array(COLS).fill(0));
      removed++;
      r++; // rechecagem da linha descida
    }
  }
  if (removed > 0){
    score += SCORE_PER_LINE * removed;
    linesCleared += removed;
    updateSpeed();
  }
}

/* ========= Movimento e queda ========= */
function drop(){
  if (gameOver || isPaused) return; // Adiciona verificação de pausa
  if (!collide(current.row + 1, current.col)){
    current.row++;
  } else {
    // fixa e gera próxima
    fixPiece();
    current = { tetromino: nextTetromino, row: 0, col: 3 };
    nextTetromino = randomTetromino();

    // se a nova peça já colidir → game over
    if (collide(current.row, current.col)){
      endGame();
      return;
    }
  }
  draw();
  drawNext();
  updateDisplays();
}

/* Hard drop */
function hardDrop(){
  while (!collide(current.row + 1, current.col)) current.row++;
  drop();
}

/* Movimento lateral */
function moveLeft(){ if (!collide(current.row, current.col - 1)) { current.col--; draw(); } }
function moveRight(){ if (!collide(current.row, current.col + 1)) { current.col++; draw(); } }

/* Rotação (90 graus horário) com "kick" básico */
function rotate(){
  const old = current.tetromino;
  const rows = old.length, cols = old[0].length;
  const rotated = Array.from({length: cols}, () => Array(rows).fill(0));
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) rotated[c][rows - 1 - r] = old[r][c];

  // tentar a rotação sem sair das bordas com testes simples (kick)
  const kicks = [0, -1, 1, -2, 2];
  for (let k = 0; k < kicks.length; k++){
    const tryCol = current.col + kicks[k];
    if (!collide(current.row, tryCol, rotated)){
      current.tetromino = rotated;
      current.col = tryCol;
      draw();
      drawNext();
      return;
    }
  }
  // se nenhum kick funcionou, não rotaciona
}

/* ========= Velocidade e HUD ========= */
function updateSpeed(){
  speed = Math.max(DEFAULT_SPEED - Math.floor(score / 1000) * 50, MIN_SPEED);
  speedValueEl.textContent = (DEFAULT_SPEED / speed).toFixed(1) + "x";
  clearInterval(gameInterval);
  gameInterval = setInterval(drop, speed);
}

function updateDisplays(){
  scoreValueEl.textContent = score.toString().padStart(6,'0');
  linesValueEl.textContent = linesCleared;
  updateTimeDisplay();
}

/* Formato hh:mm:ss */
function updateTimeDisplay(){
  const h = Math.floor(elapsedTime/3600);
  const m = Math.floor((elapsedTime % 3600)/60);
  const s = elapsedTime % 60;
  timeValueEl.textContent = [h,m,s].map(n=>String(n).padStart(2,'0')).join(':');
}

/* ========= Game Over ========= */
function endGame(){
  gameOver = true;
  isPaused = false; // Reseta o estado de pausa
  clearInterval(gameInterval);
  clearInterval(timeInterval);
  alert('Game Over!');
  saveScore(nameInput.value.trim() || 'Anon', score);
  
  // Reativa o botão para permitir novo jogo
  startBtn.disabled = false;
  pauseBtn.disabled = true; // Desativa o botão de pause ao terminar
}

/* ========= Funções de pause ========= */
function togglePause() {
  if (gameOver) return;
  
  isPaused = !isPaused;
  
  if (isPaused) {
    // Pausar o jogo e mostrar popup
    clearInterval(gameInterval);
    clearInterval(timeInterval);
    pausePopup.style.display = 'flex';
    backgroundMusic.pause();
  } else {
    // Retomar o jogo
    pausePopup.style.display = 'none';
    gameInterval = setInterval(drop, speed);
    timeInterval = setInterval(() => {
      if (!gameOver) {
        elapsedTime++;
        updateTimeDisplay();
      }
    }, 1000);
    backgroundMusic.play();
  }
}

/* ========= Input e eventos ========= */
document.addEventListener('keydown', (e) => {
  // Verifica se estamos no campo de nome
  if (document.activeElement === nameInput) {
    // Verifica se a tecla é uma das letras necessárias
    if (['A', 'G', 'T', 'M'].includes(e.key.toUpperCase())) {
      typedLetters.push(e.key.toUpperCase());
      
      // Verifica se temos todas as 4 letras (não importa a ordem)
      const uniqueLetters = [...new Set(typedLetters)];
      if (uniqueLetters.length === 4 && uniqueLetters.every(letter => ['A', 'G', 'T', 'M'].includes(letter))) {
        rgbMode = true;
        typedLetters = []; // Reseta o contador
        
        // ====== EASTER EGG DE GERALDO ======
        // Adiciona efeito visual para mostrar que o modo RGB está ativo
        document.body.style.filter = 'hue-rotate(90deg)';
        // ====== FIM DO EASTER EGG DE GERALDO ======
      }
    }
  }

  // Não interfere com outros eventos de teclado
  if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

  switch (e.key) {
    case 'ArrowLeft': e.preventDefault(); moveLeft(); break;
    case 'ArrowRight': e.preventDefault(); moveRight(); break;
    case 'ArrowDown': e.preventDefault(); drop(); break;
    case 'ArrowUp': e.preventDefault(); rotate(); break;
    case ' ': e.preventDefault(); hardDrop(); break;
  }
});

startBtn.addEventListener('click', ()=>{
  const name = nameInput.value.trim();
  if (!name){
    alert('Digite seu nome antes de começar!');
    nameInput.focus();
    return;
  }
  resetGame();
  // desabilita botão até acabar o jogo para evitar vários resets acidentais
  startBtn.disabled = true;
});

clearScoresBtn.addEventListener('click', ()=>{
  if (confirm('Limpar todos os placares salvos?')) clearScores();
});

/* Modal */
window.addEventListener('load', ()=> {
  // mostra modal e desativa start até fechar
  instructionsModal.style.display = 'flex';
  startBtn.disabled = true;
});

closeModalBtn.addEventListener('click', ()=>{
  instructionsModal.style.display = 'none';
  startBtn.disabled = false;
});

/* ========= Botão de pause ========= */
const pauseBtn = document.createElement('button');
pauseBtn.id = 'pauseBtn';
pauseBtn.className = 'btn-primary';
pauseBtn.textContent = 'Pause';
pauseBtn.style.marginLeft = '10px';
document.querySelector('.controls-row').appendChild(pauseBtn);

/* ========= Evento do botão de pause ========= */
pauseBtn.addEventListener('click', togglePause);

/* ========= Inicialização do botão de pause ========= */
// Desativa o botão de pause inicialmente
pauseBtn.disabled = true;

/* ========= Score table rendering ========= */
function renderScoreTable(){
  scoreTableBody.innerHTML = '';
  scores.forEach(s => {
    const tr = document.createElement('tr');
    const tdName = document.createElement('td');
    tdName.textContent = s.name;
    const tdPoints = document.createElement('td');
    tdPoints.textContent = s.points;
    tr.appendChild(tdName);
    tr.appendChild(tdPoints);
    scoreTableBody.appendChild(tr);
  });
}

renderScoreTable();

// Adicionar evento para o botão de continuar
resumeBtn.addEventListener('click', function() {
  togglePause();
});

// Iniciar música ao carregar a página
window.addEventListener('load', function() {
  backgroundMusic.volume = volumeControl.value;
  backgroundMusic.play().catch(e => console.log("Erro ao reproduzir música:", e));
});

/* ========= Inicialização visual ========= */
function initialDraw(){
  draw();
  drawNext();
  updateDisplays();
}
initBoard();
initialDraw();

/* ====== EASTER EGG: FADA SECRETA ====== */
let consecutiveLines = 0; // contador de linhas seguidas

// Pega referência ao elemento da fada
const fairyEl = document.getElementById('fairyEasterEgg');

// Mostra a fada mágica
function showFairy() {
  fairyEl.classList.remove('fairy-hidden');
  fairyEl.classList.add('fairy-visible');

  // Depois de 6 segundos, ela desaparece
  setTimeout(() => {
    fairyEl.classList.remove('fairy-visible');
    fairyEl.classList.add('fairy-hidden');
  }, 6000);
}

// Modifica a função clearLines para incluir o contador de easter egg
const oldClearLines = clearLines;
clearLines = function() {
  let before = linesCleared;
  oldClearLines(); // executa a função original
  let gained = linesCleared - before;

  if (gained > 0) {
    consecutiveLines += gained;
    if (consecutiveLines >= 5) { // ativa o easter egg
      showFairy();
      consecutiveLines = 0; // reseta o contador
    }
  } else {
    // se não limpou nenhuma linha nessa jogada, reseta o contador
    consecutiveLines = 0;
  }
};
