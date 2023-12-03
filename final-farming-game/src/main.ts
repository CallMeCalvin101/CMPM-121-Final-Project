import "./style.css";
import { Scenario } from "./scenario.ts";

//------------------------------------ Global Vars ------------------------------------------------------------------------------------

const canvas = document.getElementById("game");
const gameHeight = (canvas! as HTMLCanvasElement).height;
const gameWidth = (canvas! as HTMLCanvasElement).width;

const ctx = (canvas! as HTMLCanvasElement).getContext("2d");
const testScenario = new Scenario("Sunflower", 3);

//Eventually this structure should be specified by a JSON object, map will work for now
const plantManifest = {
  Sunflower: {
    name: "Sunflower",
    type: "flower",
    sunRequisite: 3,
    waterRequisite: 2,
    color: "yellow",
  },
  Rose: {
    name: "Rose",
    type: "flower",
    sunRequisite: 2,
    waterRequisite: 3,
    color: "pink",
  },
  Daffodil: {
    name: "Daffodil",
    type: "flower",
    sunRequisite: 3,
    waterRequisite: 2,
    color: "#FFD700",
  }, // Gold
  Lily: {
    name: "Lily",
    type: "flower",
    sunRequisite: 2,
    waterRequisite: 3,
    color: "#FFFFFF",
  }, // White
  Marigold: {
    name: "Marigold",
    type: "flower",
    sunRequisite: 4,
    waterRequisite: 2,
    color: "#FFA500",
  }, // Orange
  Fuchsia: {
    name: "Fuchsia",
    type: "flower",
    sunRequisite: 3,
    waterRequisite: 3,
    color: "#FF00FF",
  }, // Fuchsia
};

const MAX_PLANT_GROWTH = 15;

const plantsHarvested: Map<string, number> = new Map();
for (const plant in plantManifest) {
  plantsHarvested.set(plant, 0);
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

  dragPos(direction: "N" | "E" | "S" | "W", magnitude: number) {
    const currentCell = this.getCurrentCell();
    switch (direction) {
      case "N":
        if (currentCell!.rowIndex > 0) {
          this.posY -= magnitude;
        } else {
          this.posY += (game.size - 1) * magnitude;
        }
        break;

      case "E":
        if (currentCell!.colIndex < game.size - 1) {
          this.posX += magnitude;
        } else {
          this.posX -= (game.size - 1) * magnitude;
        }
        break;

      case "S":
        if (currentCell!.rowIndex < game.size - 1) {
          this.posY += magnitude;
        } else {
          this.posY -= (game.size - 1) * magnitude;
        }
        break;

      case "W":
        if (currentCell!.colIndex > 0) {
          this.posX -= magnitude;
        } else {
          this.posX += (game.size - 1) * magnitude;
        }
        break;
    }
  }

  //return the cell and its properties
  getCurrentCell(): Cell | null {
    const gridX = Math.floor(farmer.posX / CELL_SIZE);
    const gridY = Math.floor(farmer.posY / CELL_SIZE);

    if (game.grid[gridY] && game.grid[gridY][gridX]) {
      return game.grid[gridY][gridX];
    } else {
      return null;
    }
  }
}

interface Cell {
  rowIndex: number;
  colIndex: number;
  plant: Plant | null;
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

  simulateGrowth() {
    // Simulate general growth based on accumulated sun and water levels
    if (
      this.sunLevel >= this.sunRequisite &&
      this.waterLevel >= this.waterRequisite
    ) {
      if (this.growthLevel < MAX_PLANT_GROWTH){
        this.growthLevel += 1;
        console.log(this.name, " is growing! Growth level:", this.growthLevel);
      }else{
        console.log(this.name, "in cell: ", this.cell!.rowIndex, ", ", this.cell!.colIndex, " is ready for harvest!");
      }
    }
  }
}

class Game {
  size: number;
  grid: Cell[][];
  weatherCondition: string; // 'sunny' or 'rainy'
  weatherDegree: number; //magnitude of sun or rain

  constructor(gridSize: number) {
    this.size = gridSize;
    this.grid = Array.from({ length: this.size }, (_, i) =>
      Array.from({ length: this.size }, (_, j) => ({
        rowIndex: i,
        colIndex: j,
        plant: null,
      }))
    );

    this.weatherCondition = "sunny";
    this.weatherDegree = 3;
    this.generateRandomGrid();
    this.updateUI();

    const midIndex = Math.floor(this.size / 2);
    this.updateCurrentCellUI(this.grid[midIndex][midIndex]);
  }

  generateRandomGrid() {
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const randomValue = Math.random();
        if (randomValue < 0.10) {
          this.grid[i][j].plant = new Plant(
            "Crabgrass",
            "weed",
            1,
            1,
            "green",
            this.grid[i][j]
          );
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

        ctx!.fillStyle = cell.plant ? cell.plant.color : "saddlebrown";
        ctx!.fillRect(x, y, CELL_SIZE, CELL_SIZE);
      }
    }
  }

  //randomly change the weather conditions
  updateWeather() {
    const max = 6;
    const min = 1;
    this.weatherCondition = Math.random() < 0.5 ? "sunny" : "rainy"; // 50% chance of sun
    this.weatherDegree = Math.floor(Math.random() * (max - min + 1)) + min;
    console.log("New Day: Weather:", this.weatherCondition, " severity: ", this.weatherDegree);
  }
  //update the weather condition, player seeds and current Cell text on screen
  updateUI() {
    //Seeds UI
    const ownedSeedElement = document.getElementById("seed");
    ownedSeedElement!.innerHTML = `<strong>Owned Seeds:</strong> ${Object.keys(
      plantManifest
    ).join(", ")}`;

    //Harvested plants UI
    const harvestedPlants = document.getElementById("plants");
    harvestedPlants!.innerHTML = `<strong>Harvested Plants:</strong> ${Array.from(
      plantsHarvested.entries()
    )
      .map(([key, value]) => `${key}: ${value}`)
      .join(" ")}`;

    //Weather UI
    const weatherElement = document.getElementById("weather");
    weatherElement!.innerHTML = `<strong>Current Weather:</strong> ${
      this.weatherCondition.charAt(0).toUpperCase() +
      this.weatherCondition.slice(1)
    }, <strong>Severity:</strong> ${this.weatherDegree}`;
  }

  //update water and sun levels for all plants on grid
  simulateWeather() {
    if (this.weatherCondition === "rainy") {
      const sunChance = 0.2;
      this.grid.forEach((row) =>
        row.forEach((cell) => {
          if (cell.plant) {
            cell.plant.waterLevel += this.weatherDegree; // on a rainy day - 20% chance of getting full sun power, 80% chance getting half sun power
            cell.plant.sunLevel =
              cell.plant && Math.random() < sunChance
                ? Math.floor(this.weatherDegree / 2)
                : this.weatherDegree;
          }
        })
      );
    } else if (this.weatherCondition === "sunny") {
      const rainChance = 0.1;
      this.grid.forEach((row) =>
        row.forEach((cell) => {
          if (cell.plant) {
            // on a sunny day, plants dry up unless 10% chance it rains
            if (Math.random() > rainChance) cell.plant.waterLevel = 1;
            cell.plant.sunLevel = this.weatherDegree;
          }
        })
      );
    }
  }

  updateCurrentCellUI(cell: Cell) {
    const cellElement = document.getElementById("cell");
    if (cell.plant) {
      cellElement!.innerHTML = `You are on <strong>cell</strong> [${cell.rowIndex}, ${cell.colIndex}]. <strong>Plant Type:</strong> ${cell.plant?.name} <strong>Water Level:</strong> ${cell.plant?.waterLevel}. <strong>Growth Level:<strong> ${cell.plant?.growthLevel}`;
    } else {
      cellElement!.innerHTML = `You are on <strong>cell</strong> [${cell.rowIndex}, ${cell.colIndex}], There is no Plant here`;
    }
  }

  //placing any update functions here
  updateGame() {
    this.updateWeather();
    this.updateUI();
    this.simulateWeather();
  }
}

//------------------------------------ Helper Funcs ------------------------------------------------------------------------------------

// Draw game
function drawGame() {
  ctx!.clearRect(0, 0, gameWidth, gameHeight);
  game.draw();
  farmer.draw();
}

function promptPlantSelection(): string {
  const plantNames = Object.keys(plantManifest).join(", ");
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
    if (currentCell.plant!.type != "weed"){ // do not add weeds to inventory
      farmer.plants.push(currentCell.plant!);
      const reapedPlant = currentCell.plant!.name;
      if (currentCell.plant!.growthLevel >= MAX_PLANT_GROWTH){ // player only collects plant if it was ready for harvest
        plantsHarvested.set(reapedPlant, plantsHarvested.get(reapedPlant)! + 1);
      }
    }

    console.log(`You reaped the ${currentCell.plant!.name} plant!`);
    currentCell.plant = null; // Remove plant from cell

    game.updateUI();
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
            cell.plant.simulateGrowth();
          }
        })
      );
      break;
    case "ArrowLeft":
      farmer.dragPos("W", CELL_SIZE);
      break;
    case "ArrowRight":
      farmer.dragPos("E", CELL_SIZE);
      break;
    case "ArrowUp":
      farmer.dragPos("N", CELL_SIZE);
      break;
    case "ArrowDown":
      farmer.dragPos("S", CELL_SIZE);
      break;
    case " ":
      const currentCell = farmer.getCurrentCell();
      if (currentCell!.plant != null && currentCell) {
        // if there is a plant here, reap it (Weeds and Flowers)
        reapPlant(currentCell);
        // farmer.plants.push(currentCell!.plant);
        // currentCell!.plant = null; //remove plant fom cell
        // currentCell!.color = "saddlebrown";
      } else if (currentCell!.plant == null) {
        const plantName = promptPlantSelection().toLowerCase(); // this type is here to avoid type erros actual type is any key in plantManifest
        const selectedPlant = (Object.keys(plantManifest).find(plant => plant.toLowerCase() == plantName.toLowerCase())) as "Rose";
        if (selectedPlant) { // checks if plant is equal to 
          currentCell!.plant = new Plant(
            plantManifest[selectedPlant].name,
            plantManifest[selectedPlant].type,
            plantManifest[selectedPlant].sunRequisite,
            plantManifest[selectedPlant].waterRequisite,
            plantManifest[selectedPlant].color,
            currentCell!
          );
          farmer.getCurrentCell();
          // Scenario Check (Remove in future)
          updateScenario(plantManifest[selectedPlant].name);
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

const farmer = new Character(gameWidth / 2, gameHeight / 2, []);

//hopefully this works as a plant holder

drawGame();
game.updateGame();

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
