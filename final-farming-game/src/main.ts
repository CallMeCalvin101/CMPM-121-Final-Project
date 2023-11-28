import "./style.css";

const canvas = document.getElementById("game");
const gameHeight = (canvas! as HTMLCanvasElement).height;
const gameWidth = (canvas! as HTMLCanvasElement).width;

const ctx = (canvas! as HTMLCanvasElement).getContext("2d");

document.querySelector<HTMLDivElement>(
  "#ui"
)!.innerHTML = `<p> Initialize Game </p>`;

class Grid {
  private cells: string[][];

  constructor(public rows: number, public cols: number) {
    this.cells = new Array(rows).fill(null).map(() => new Array(cols).fill("empty"));
    this.generateRandomGrid();
  }

  generateRandomGrid() {
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        const randomValue = Math.random();
        if (randomValue < 0.25) {
          this.cells[i][j] = "plant";
        } else if (randomValue < 0.5) {
          this.cells[i][j] = "water";
        } else if (randomValue < 0.75) {
          this.cells[i][j] = "sun";
        } else {
          this.cells[i][j] = "empty";
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
        const cellType = this.cells[i][j];

        ctx!.fillStyle = getColor(cellType);
        ctx!.fillRect(x, y, cellSize, cellSize);
      }
    }
  }
}

function getColor(type: string): string {
  switch (type) {
    case "plant":
      return "green";
    case "water":
      return "blue";
    case "sun":
      return "yellow";
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

// Draw game
function drawGame() {
  ctx!.clearRect(0, 0, gameWidth, gameHeight);
  gameGrid.draw();
  farmer.draw();
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