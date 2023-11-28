import "./style.css";

const canvas = document.getElementById("game");
const gameHeight = (canvas! as HTMLCanvasElement).height;
const gameWidth = (canvas! as HTMLCanvasElement).width;

const ctx = (canvas! as HTMLCanvasElement).getContext("2d");

class Cell {
  isMoist: boolean;
  plant: string | null;
  growthLevel: number;
  driedYesterday: boolean;

  constructor() {
    this.isMoist = false;
    this.plant = null; // 'flower', 'weed', or null
    this.growthLevel = 0;
    this.driedYesterday = false;
  }
}

class Game {
  grid: Cell[][];
  weather: string; // 'sunny' or 'rainy'

  constructor() {
    this.grid = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => new Cell()));
    this.weather = 'sunny'; // 'sunny' or 'rainy'
    this.updateWeatherUI();
  }

  updateWeather() {
    this.weather = Math.random() < 0.7 ? 'sunny' : 'rainy'; // 70% chance of sun
  }

  updateWeatherUI() {
    const weatherElement = document.getElementById("weather");
    if (weatherElement) {
      weatherElement.textContent = `Current Weather: ${this.weather.charAt(0).toUpperCase() + this.weather.slice(1)}`;
    }
  }

  updateMoisture() {
    if (this.weather === 'rainy') {
      this.grid.forEach(row => row.forEach(cell => cell.isMoist = true));
    } else {
      this.grid.forEach(row => row.forEach(cell => cell.isMoist = cell.isMoist && !cell.driedYesterday));
    }
    this.grid.forEach(row => row.forEach(cell => cell.driedYesterday = !cell.isMoist));
  }

  updateGame() {
    this.updateWeather();
    this.updateWeatherUI();
    this.updateMoisture();
  }
}

class Grid {
  private cells: Cell[][];

  constructor(public rows: number, public cols: number) {
    this.cells = Array.from({ length: rows }, () => Array.from({ length: cols }, () => new Cell()));
    this.generateRandomGrid();
  }

  generateRandomGrid() {
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        const randomValue = Math.random();
        if (randomValue < 0.25) {
          this.cells[i][j].plant = "flower";
        } else if (randomValue < 0.5) {
          this.cells[i][j].plant = "weed";
        }
      }
    }
  }

  draw() {
    const cellSize = gameWidth / this.cols;

    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        const x = j * cellSize;
        const y = i * cellSize;
        const cell = this.cells[i][j];

        ctx!.fillStyle = getColor(cell.plant || "empty");
        ctx!.fillRect(x, y, cellSize, cellSize);
      }
    }
  }
}

function getColor(type: string): string {
  switch (type) {
    case "flower":
      return "pink";
    case "weed":
      return "green";
    case "empty":
      return "#563d2d";
    default:
      return "#563d2d";
  }
}

class Character {
  constructor(public x: number, public y: number, public width: number, public height: number, public color: string) {}

  draw() {
    ctx!.fillStyle = this.color;
    ctx!.fillRect(this.x, this.y, this.width, this.height);
  }
}

const farmer = new Character(gameWidth / 2 - 35, gameHeight / 2 - 35, 40, 70, "black");
const gameGrid = new Grid(4, 4);
const game = new Game();
setInterval(() => {
  game.updateGame();
  drawGame();
}, 10000);

// Draw game
function drawGame() {
  ctx!.clearRect(0, 0, gameWidth, gameHeight);
  gameGrid.draw();
  farmer.draw();

  const weatherElement = document.getElementById("weather");
  if (weatherElement) {
    weatherElement.textContent = `Current Weather: ${game.weather.charAt(0).toUpperCase() + game.weather.slice(1)}`;
  }
}

document.addEventListener("keydown", (event) => {
  switch (event.key) {
    case "ArrowLeft":
      farmer.x -= 10;
      break;
    case "ArrowRight":
      farmer.x += 10;
      break;
    case "ArrowUp":
      farmer.y -= 10;
      break;
    case "ArrowDown":
      farmer.y += 10;
      break;
  }
  drawGame();
});

drawGame();
