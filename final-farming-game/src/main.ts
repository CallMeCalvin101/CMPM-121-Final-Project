import "./style.css";
import { Scenario } from "./scenario.ts";

//------------------------------------ Global Vars ------------------------------------------------------------------------------------

const canvas = document.getElementById("game");
const gameHeight = (canvas! as HTMLCanvasElement).height;
const gameWidth = (canvas! as HTMLCanvasElement).width;

const ctx = (canvas! as HTMLCanvasElement).getContext("2d");
const testScenario = new Scenario("Sunflower", 3);

//------------------------------------ Class def ------------------------------------------------------------------------------------

class Character {
  constructor(
    public x: number,
    public y: number,
    public width: number,
    public height: number,
    public color: string,
    public plants: Plant[]
  ) {}

  draw() {
    ctx!.fillStyle = this.color;
    ctx!.fillRect(this.x, this.y, this.width, this.height);
  }

  //return the cell and its properties
  getCurrentCell() {
    const cellSize = gameWidth / game.cols;
    const gridX = Math.floor(farmer.x / cellSize);
    const gridY = Math.floor(farmer.y / cellSize);

    if (game.grid[gridY] && game.grid[gridY][gridX]) {
      const currentCell = game.grid[gridY][gridX];
      console.log(`Player is standing on cell at (${gridX}, ${gridY})`);
      console.log("Cell Info:", currentCell);
      return currentCell;
    }
  }
}

class Cell {
  waterLevel: number;
  sunLevel: boolean;
  plant: Plant | null;
  growthLevel: number;
  driedYesterday: boolean;
  plantPot: Plant | null;
  color: string;

  constructor() {
    this.waterLevel = 0;
    this.sunLevel = false;
    this.plant = null;
    this.growthLevel = 0;
    this.driedYesterday = false;
    this.plantPot = null;
    this.color = "saddlebrown";
  }

  //update color of cells based on plants in that cell
  updateCellColor(color: string) {
    this.color = color;
  }
}

class Plant {
  //plant's current level of resources
  sunLevel: number;
  waterLevel: number;
  growthLevel: number;
  name: string;
  cell: Cell | null; // can be null because it hasn't been planted yet
  type: string; //flower or weed or other type
  //for constructing a plant,
  sunRequisite: number;
  waterRequisite: number;
  color: string;
  constructor(
    name: string,
    type: string,
    sunRequisite: number,
    waterRequisite: number,
    color: string,
    cell: Cell
  ) {
    this.sunLevel = 0;
    this.waterLevel = 0;
    this.growthLevel = 0;
    this.cell = cell;
    this.name = name;
    this.sunRequisite = sunRequisite;
    this.waterRequisite = waterRequisite;
    this.type = type;
    this.color = color;
  }
  waterPlant(): void {
    // Simulate the effect of watering based on the isMoist property of the cell
    //put a bang here cause "cell might be null"
    if (this.cell) {
      if (this.cell!.waterLevel > 0) {
        this.waterLevel += 1;
        this.cell!.waterLevel--;
        console.log(this.name, " watered! Water level:", this.waterLevel);
      } else {
        console.log(this.name, " watering failed. Water level remains the same.");
      }
    }
  }

  exposeToSun() {
    // Simulate the effect of exposure to sun based on the game's weather
    if (this.cell) {
      if (this.cell!.sunLevel) {
        this.sunLevel += 1;
        this.cell!.sunLevel = false;
        console.log(this.name, " exposed to sun! Sun level:", this.sunLevel);
      } else {
        console.log(this.name , " exposure to sun failed. Sun level remains the same.");
      }
    }
  }

  grow(): void {
    // Simulate general growth based on accumulated sun and water levels
    if (
      this.sunLevel >= this.sunRequisite &&
      this.waterLevel >= this.waterRequisite
    ) {
      this.growthLevel += 1;
      console.log(this.name, " is growing! Growth level:", this.growthLevel);
    } else if (
      this.sunLevel < this.sunRequisite &&
      this.waterLevel < this.waterRequisite
    ) {
      console.log(this.name, ": No significant growth due to insufficient sun and water.");
    } else if (this.sunLevel < this.sunRequisite) {
      console.log(this.name, ": No significant growth due to insufficient sun.");
    } else if (this.waterLevel < this.waterRequisite) {
      console.log(this.name, ": No significant growth due to insufficient water.");
    }
    //   console.log("No significant growth due to insufficient sun or water.");
  }
  checkGrowth() {
    // Check conditions and trigger growth accordingly
    this.waterPlant();
    this.exposeToSun();
    this.grow();
  }
}

class Game {
  rows: number;
  cols: number;
  grid: Cell[][];
  weather: string; // 'sunny' or 'rainy'

  constructor(rows: number, cols: number) {
    this.rows = rows;
    this.cols = cols;
    this.grid = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => new Cell())
    );
    this.generateRandomGrid();
    this.weather = "sunny"; // 'sunny' or 'rainy'
    this.updateWeatherUI();
  }

  generateRandomGrid() {
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        const randomValue = Math.random();
        if (randomValue < 0.25) {
          this.grid[i][j].plant = new Plant("Rose", "flower", 3, 2, "pink", this.grid[i][j]);
          this.grid[i][j].color = "pink";
        } else if (randomValue < 0.5) {
          this.grid[i][j].plant = new Plant("Crabgrass", "weed", 1, 1, "green", this.grid[i][j],);
          this.grid[i][j].color = "green";
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
        const cell = this.grid[i][j];

        ctx!.fillStyle = cell.color;
        ctx!.fillRect(x, y, cellSize, cellSize);
      }
    }
  }

  //randomly change the weather conditions
  updateWeather() {
    this.weather = Math.random() < 0.7 ? "sunny" : "rainy"; // 70% chance of sun
  }
  //update the weather condition text on screen
  updateWeatherUI() {
    const weatherElement = document.getElementById("weather");
    if (weatherElement) {
      weatherElement.textContent = `Current Weather: ${
        this.weather.charAt(0).toUpperCase() + this.weather.slice(1)
      }`;
    }
  }
  //update the cells of all grids
  updateCells() {
    if (this.weather === "rainy") {
      const sunChance = 0.2;
      this.grid.forEach((row) =>
        row.forEach((cell) => {
          if (cell.waterLevel < 3 && Math.random() < 0.7) {
            cell.waterLevel += 2;
          }
          if (Math.random() < sunChance) {
            cell.sunLevel = true;
          } else {
            cell.sunLevel = false;
          }
        })
      );
    } else {
      const sunChance = 0.8;
      this.grid.forEach((row) =>
        row.forEach((cell) => {
          if (cell.waterLevel > 0 && Math.random() < 0.7) {
            cell.waterLevel--;
          }
          if (Math.random() < sunChance) {
            cell.sunLevel = true;
          } else {
            cell.sunLevel = false;
          }
        })
      );
    }
  }

  updateCellColors() {
    this.grid.forEach((row) =>
      row.forEach((cell) => {
        if (cell.plant != null) {
          cell.color = cell.plant!.color;
        }
      })
    );
  }

  //placing any update functions here
  updateGame() {
    this.updateWeather();
    this.updateWeatherUI();
    this.updateCells();
  }
}

//------------------------------------ Helper Funcs ------------------------------------------------------------------------------------

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

// Draw game
function drawGame() {
  ctx!.clearRect(0, 0, gameWidth, gameHeight);
  game.draw();
  farmer.draw();

  const weatherElement = document.getElementById("weather");
  if (weatherElement) {
    weatherElement.textContent = `Current Weather: ${
      game.weather.charAt(0).toUpperCase() + game.weather.slice(1)
    }`;
  }
}

const availablePlants: Plant[] = [
  new Plant("Sunflower", "flower", 3, 2, "yellow", new Cell()),
  new Plant("Rose", "flower", 2, 3, "pink", new Cell()),
];

function promptPlantSelection(): string {
  const plantNames = availablePlants.map((plant) => plant.name).join(", ");
  const promptText = `What would you like to plant?\nAvailable plants: ${plantNames}`;
  return prompt(promptText) || ""; // Prompt the player for the plant name
}

function reapPlant(currentCell: Cell) {
  const confirmReap = window.confirm(
    `Do you want to reap the ${
      currentCell.plant!.name
    } plant?\nDetails:\nSun Level: ${
      currentCell.plant!.sunLevel
    }, Water Level: ${currentCell.plant!.waterLevel}, Growth Level: ${
      currentCell.plant!.growthLevel
    }`
  );

  if (confirmReap) {
    farmer.plants.push(currentCell.plant!);
    const reapedPlant = currentCell.plant!.name;
    currentCell.plant = null; // Remove plant from cell
    currentCell.color = "saddlebrown";
    console.log(`You reaped the ${reapedPlant} plant!`);
  }
}

function updateScenario(action: string) {
  if (testScenario.checkCondition(action)) {
    testScenario.increaseVal(1);
  }

  if (testScenario.checkTargetMet()) {
    alert("SCENARIO COMPLETE!!!");
  }
}

//------------------------------------ Event Listeners ------------------------------------------------------------------------------------

//character movement and controls
document.addEventListener("keydown", (event) => {
  switch (event.key) {
    case "t":
      game.updateGame();
      game.grid.forEach((row) =>
        row.forEach((cell) => {
          if (cell.plant) {
            cell.plant.checkGrowth();
        }
      }));
      break;
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
    case " ":
      const currentCell = farmer.getCurrentCell();
      if (currentCell!.plant != null && currentCell) {
        // if there is a plant here, reap it (Weeds and Flowers)
        reapPlant(currentCell);
        console.log(farmer.plants);
        // farmer.plants.push(currentCell!.plant);
        // currentCell!.plant = null; //remove plant fom cell
        // currentCell!.color = "saddlebrown";
      } else if (currentCell!.plant == null) {
        const plantName = promptPlantSelection();
        const selectedPlant = availablePlants.find(
          (plant) => plant.name.toLowerCase() === plantName.toLowerCase()
        );
        if (selectedPlant) {
          currentCell!.plant = new Plant(
            selectedPlant.name,
            selectedPlant.type,
            selectedPlant.sunRequisite,
            selectedPlant.waterRequisite,
            selectedPlant.color,
            currentCell!
          );
          currentCell!.color = selectedPlant.color;
          farmer.getCurrentCell();
          // Scenario Check (Remove in future)
          updateScenario(selectedPlant.name);
        } else {
          console.log("Invalid plant selection.");
        }
      } else {
        alert("No plants available!");
      }
      break;
  }
  drawGame();
});

//------------------------------------ Main ------------------------------------------------------------------------------------

const game = new Game(7, 7);
setInterval(() => {
  game.updateGame();
  drawGame();
}, 10000);

const farmer = new Character(
  gameWidth / 2 - 35,
  gameHeight / 2 - 35,
  40,
  70,
  "black",
  []
);

//hopefully this works as a plant holder

drawGame();

/*
function runScenarioTest() {
  const testCondition = "thisistest";
  const testLoops = 3;
  const testScenario = new Scenario(testCondition, testLoops);
  for (let i = 0; i < testLoops; i++) {
    if (testScenario.checkCondition(testCondition)) {
      testScenario.increaseVal(1);
    }
  }

  if (testScenario.checkTargetMet()) {
    console.log("Scenario Class Test Passed");
  }
}

runScenarioTest();
*/