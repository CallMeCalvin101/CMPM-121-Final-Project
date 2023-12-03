import "./style.css";
import { Scenario } from "./scenario.ts";

//------------------------------------ Global Vars ------------------------------------------------------------------------------------

const canvas = document.getElementById("game");
const gameHeight = (canvas! as HTMLCanvasElement).height;
const gameWidth = (canvas! as HTMLCanvasElement).width;

const ctx = (canvas! as HTMLCanvasElement).getContext("2d");
const testScenario = new Scenario("Sunflower", 3);

const playerSeeds: string[] = ["Sunflower", "Rose"];
const plantsHarvested: Map<string,number> = new Map();
playerSeeds.forEach(seed => {
  plantsHarvested.set(seed, 0);
});

//Eventually this structure should be specified by a JSON object, map will work for now
const plantManifest = {
  "Sunflower" : {name: "Sunflower", type: "flower", sunRequisite: 3, waterRequisite: 2, color: "yellow"},
  "Rose" : {name: "Rose", type: "flower", sunRequisite: 2, waterRequisite: 3, color: "pink"},
  "Crabgrass" : {name: "Crabgrass", type: "weed", sunRequisite: 1, waterRequisite: 1, color: "green"}
}

const GAME_SIZE = 7;
const CELL_SIZE = gameWidth / GAME_SIZE;

//------------------------------------ Class def ------------------------------------------------------------------------------------

class Character {
  constructor(
    public posX: number,
    public posY: number,
    public plants: Plant[]
  ) {}

  draw() {
    ctx!.beginPath();
    ctx!.arc(this.posX, this.posY, 20, 0, 2 * Math.PI, false);
    ctx!.fillStyle = "blue";
    ctx!.fill();
    ctx!.lineWidth = 2;
    ctx!.strokeStyle = "black";
    ctx!.stroke();
  }

  dragPos(direction: "N" | "E" | "S" | "W", magnitude: number){
    const currentCell = this.getCurrentCell();
    switch (direction){
      
      case "N":
        if (currentCell!.rowIndex > 0){
          this.posY -= magnitude;
        }
        else{
          this.posY += (game.size-1) * magnitude;  
        }
        break;

      case "E":
        if (currentCell!.colIndex < game.size-1){
          this.posX += magnitude;
        }else{
          this.posX -= (game.size-1) * magnitude;
        }
        break;

      case "S":
        if (currentCell!.rowIndex < game.size-1){
          this.posY += magnitude;
        }else{
          this.posY -= (game.size-1) * magnitude;
        }
        break;

      case "W":
        if (currentCell!.colIndex > 0){
          this.posX -= magnitude;
        }
        else{
          this.posX += (game.size-1) * magnitude;
          }
        break;
    }
  }

  //return the cell and its properties
  getCurrentCell(): Cell | null {
    const gridX = Math.floor(farmer.posX / CELL_SIZE);
    const gridY = Math.floor(farmer.posY / CELL_SIZE);

    if (game.grid[gridY] && game.grid[gridY][gridX]){
      return game.grid[gridY][gridX];
    }else{
      return null;
    }

  }
}

class Cell {
  rowIndex: number;
  colIndex: number;
  waterLevel: number;
  sunLevel: boolean;
  plant: Plant | null;
  growthLevel: number;
  driedYesterday: boolean;
  plantPot: Plant | null;
  color: string;

  constructor(row: number, col: number) {
    this.rowIndex = row;
    this.colIndex = col;
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
        console.log(
          this.name,
          " watering failed. Water level remains the same."
        );
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
        console.log(
          this.name,
          " exposure to sun failed. Sun level remains the same."
        );
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
      console.log(
        this.name,
        ": No significant growth due to insufficient sun and water."
      );
    } else if (this.sunLevel < this.sunRequisite) {
      console.log(
        this.name,
        ": No significant growth due to insufficient sun."
      );
    } else if (this.waterLevel < this.waterRequisite) {
      console.log(
        this.name,
        ": No significant growth due to insufficient water."
      );
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
  size: number;
  grid: Cell[][];
  weather: string; // 'sunny' or 'rainy'

  constructor(gridSize: number) {
    this.size = gridSize;
    this.grid = Array.from({ length: this.size }, (_, i) =>
      Array.from({ length: this.size }, (_, j) => new Cell(i,j))
    );

    this.weather = "sunny"; // 'sunny' or 'rainy'
    this.generateRandomGrid();
    this.updateUI();

    const midIndex = Math.floor(this.size/2);
    this.updateCurrentCellUI(this.grid[midIndex][midIndex]);
  }

  generateRandomGrid() {
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const randomValue = Math.random();
        if (randomValue < 0.25) {
          this.grid[i][j].plant = new Plant(
            "Crabgrass",
            "weed",
            1,
            1,
            "green",
            this.grid[i][j]
          );
          this.grid[i][j].color = "green";
        }
      }
    }
  }

  draw() {
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const x = j * CELL_SIZE;
        const y = i * CELL_SIZE;
        const cell = this.grid[i][j];

        ctx!.fillStyle = cell.color;
        ctx!.fillRect(x, y, CELL_SIZE, CELL_SIZE);
      }
    }
  }

  //randomly change the weather conditions
  updateWeather() {
    this.weather = Math.random() < 0.7 ? "sunny" : "rainy"; // 70% chance of sun
  }
  //update the weather condition, player seeds and current Cell text on screen
  updateUI() {
    //Seeds UI
    const ownedSeedElement = document.getElementById("seed");
    ownedSeedElement!.innerHTML = `<strong>Owned Seeds:</strong> ${playerSeeds.join(" ")}`;

    //Harvested plants UI
    const harvestedPlants = document.getElementById("plants");
    harvestedPlants!.innerHTML = `<strong>Harvested Plants:</strong> ${Array.from(plantsHarvested.entries()).map(([key, value]) => `${key}: ${value}`).join(' ')}`;

    //Weather UI
    const weatherElement = document.getElementById("weather");
    if (weatherElement) {
      weatherElement.innerHTML = `<strong>Current Weather:</strong> ${
        this.weather.charAt(0).toUpperCase() + this.weather.slice(1)
      }`;
    }
  }

  //update the cells of all grids
  updateCells() {
    const waterChance = 0.7;
    if (this.weather === "rainy") {
      const sunChance = 0.2;
      this.grid.forEach((row) =>
        row.forEach((cell) => {
          if (Math.random() < waterChance) {
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
          if (cell.waterLevel > 0 && Math.random() < waterChance) {
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

  updateCurrentCellUI(cell: Cell) {
    const cellElement = document.getElementById("cell");
    if (cell.plant) {
      cellElement!.innerHTML = `You are on <strong>cell</strong> [${cell.rowIndex}, ${cell.colIndex}]. <strong>Plant Type:</strong> ${cell.plant?.name} Water Level: ${cell.plant?.waterLevel}. Growth Level: ${cell.plant?.growthLevel}`;
    } else {
      cellElement!.innerHTML = `You are on <strong>cell</strong> [${cell.rowIndex}, ${cell.colIndex}], There is no Plant here`;
    }
  }

  //placing any update functions here
  updateGame() {
    this.updateWeather();
    this.updateUI();
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
    weatherElement.innerHTML = `Current Weather: ${
      game.weather.charAt(0).toUpperCase() + game.weather.slice(1)
    }`;
  }
}

function promptPlantSelection(): string {
  const plantNames = playerSeeds.join(", ");
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
    console.log("SCENARIO COMPLETE!!!");
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
        })
      );
      break;
    case "ArrowLeft":
      farmer.dragPos("W" ,CELL_SIZE);
      break;
    case "ArrowRight":
      farmer.dragPos("E" ,CELL_SIZE);
      break;
    case "ArrowUp":
      farmer.dragPos("N" ,CELL_SIZE);
      break;
    case "ArrowDown":
      farmer.dragPos("S" ,CELL_SIZE);
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
        const plantName= promptPlantSelection() as "Sunflower" | "Rose" ;
        if (plantName.length > 0) {
          currentCell!.plant = new Plant(
            plantManifest[plantName].name,
            plantManifest[plantName].type,
            plantManifest[plantName].sunRequisite,
            plantManifest[plantName].waterRequisite,
            plantManifest[plantName].color,
            currentCell!
          );
          currentCell!.color = plantManifest[plantName].color;
          farmer.getCurrentCell();
          // Scenario Check (Remove in future)
          updateScenario(plantManifest[plantName].name);
        } else {
          console.log("Invalid plant selection.");
        }
      } else {
        alert("No plants available!");
      }
      break;
  }
  game.updateCurrentCellUI(farmer.getCurrentCell()!);
  drawGame();
});

//------------------------------------ Main ------------------------------------------------------------------------------------

const game = new Game(GAME_SIZE);
setInterval(() => {
  game.updateGame();
  drawGame();
}, 10000);

const farmer = new Character(
  gameWidth / 2,
  gameHeight / 2,
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
