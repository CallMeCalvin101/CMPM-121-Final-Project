import "./style.css";
import { Scenario } from "./scenario.ts";

//------------------------------------ Global Vars ------------------------------------------------------------------------------------

const canvas = document.getElementById("game");
const gameHeight = (canvas! as HTMLCanvasElement).height;
const gameWidth = (canvas! as HTMLCanvasElement).width;

const ctx = (canvas! as HTMLCanvasElement).getContext("2d");
const testScenario = new Scenario("Sunflower", 3);
let savedGameStates = new Map<string, GameState[]>();

//Eventually this structure should be specified by a JSON object, map will work for now
const plantManifest = [
  {
    name: "Sunflower",
    type: "flower",
    sunRequisite: 3,
    waterRequisite: 2,
    color: "yellow",
  },
  {
    name: "Rose",
    type: "flower",
    sunRequisite: 2,
    waterRequisite: 3,
    color: "pink",
  },
  {
    name: "Daffodil",
    type: "flower",
    sunRequisite: 3,
    waterRequisite: 2,
    color: "#FFD700",
  }, // Gold
  {
    name: "Lily",
    type: "flower",
    sunRequisite: 2,
    waterRequisite: 3,
    color: "#FFFFFF",
  }, // White
  {
    name: "Marigold",
    type: "flower",
    sunRequisite: 4,
    waterRequisite: 2,
    color: "#FFA500",
  }, // Orange
  {
    name: "Fuchsia",
    type: "flower",
    sunRequisite: 3,
    waterRequisite: 3,
    color: "#FF00FF",
  }, // Fuchsia
];

const MAX_PLANT_GROWTH = 15;

let plantsHarvested: number[] = plantManifest.map(() => 0);

let states: GameState[] = []; //history of game states
let redoStack: GameState[] = [];

const GAME_SIZE = 7;
const CELL_SIZE = gameWidth / GAME_SIZE;

//------------------------------------ Class def ------------------------------------------------------------------------------------
interface Cell {
  rowIndex: number;
  colIndex: number;
  plant: Plant | null;
}

interface GameState {
  grid: Cell[][];
  currentWeather: number[]; //[weatherCondition weatherDegree] weather condition 0->sunny 1->rainy
  harvestedPlants: number[]; //value represents number of harvested plants for each plantIndex from plantManifest
}

class Character {
  constructor(
    public posX: number,
    public posY: number,
    public plants: Plant[]
  ) {}

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.posX, this.posY, 20, 0, 2 * Math.PI, false);
    ctx.fillStyle = "blue";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "black";
    ctx.stroke();
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
    const gridX = Math.floor(this.posX / CELL_SIZE);
    const gridY = Math.floor(this.posY / CELL_SIZE);

    return game.grid[gridY][gridX];
  }
}

class Plant {
  name: string;
  plantType: string;

  sunLevel: number;
  waterLevel: number;
  growthLevel: number;
  sunRequisite: number;
  waterRequisite: number;
  rowIndex: number;
  colIndex: number;
  color: string;

  constructor(
    name: string,
    plantType: string,
    sunRequisite: number,
    waterRequisite: number,
    color: string,
    rowIndex: number,
    colIndex: number
  ) {
    this.sunLevel = 0;
    this.waterLevel = 0;
    this.growthLevel = 0;
    this.name = name;
    this.sunRequisite = sunRequisite;
    this.waterRequisite = waterRequisite;
    this.plantType = plantType;
    this.color = color;
    this.rowIndex = rowIndex;
    this.colIndex = colIndex;
  }

  simulateGrowth() {
    // Simulate general growth based on accumulated sun and water levels
    if (
      this.sunLevel >= this.sunRequisite &&
      this.waterLevel >= this.waterRequisite
    ) {
      if (this.growthLevel < MAX_PLANT_GROWTH) {
        this.growthLevel += 1;
        console.log(
          this.name,
          " in cell (",
          this.rowIndex,
          ",",
          this.colIndex,
          ") is growing! Growth level:",
          this.growthLevel
        );
      } else {
        console.log(
          this.name,
          "in cell: (",
          this.rowIndex,
          ",",
          this.colIndex,
          ") is ready for harvest!"
        );
      }
    }
  }
}

class Game {
  size: number;
  grid: Cell[][];
  weatherCondition: string; // 'sunny' or 'rainy'
  weatherDegree: number; //magnitude of sun or rain

  //initializes game from localstorage is available, otherwise initializes new game
  constructor(gridSize: number) {
    this.size = gridSize;
    // check to see if autosave state is available
    const localStore = localStorage.getItem("states");
    if (localStore) {
      states = JSON.parse(localStore) as GameState[];
      this.grid = states[states.length - 1].grid;
      this.weatherCondition =
        states[states.length - 1].currentWeather[0] == 0 ? "sunny" : "rainy";
      this.weatherDegree = states[states.length - 1].currentWeather[1];
      console.log("states: ", states);
      this.updateCurrentCellUI(
        this.grid[Math.floor(this.size / 2)][Math.floor(this.size / 2)]
      );
      this.updateUI();
    } else {
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

      const midIndex = Math.floor(this.size / 2);
      this.updateCurrentCellUI(this.grid[midIndex][midIndex]);
      this.updateGame();
    }

    //add saved games states if available
    const storedData = localStorage.getItem("savedGames");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    if (storedData) {
      const parsedData = JSON.parse(storedData) as [string, GameState[]][];
      savedGameStates = new Map<string, GameState[]>(parsedData);
      console.log("cached saved games: ", savedGameStates);
    }
  }

  generateRandomGrid() {
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const randomValue = Math.random();
        if (randomValue < 0.07) {
          this.grid[i][j].plant = new Plant(
            "Crabgrass",
            "weed",
            1,
            1,
            "green",
            this.grid[i][j].rowIndex,
            this.grid[i][j].colIndex
          );
        }
      }
    }
    states.push(getCurrentGameState(this));
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const x = j * CELL_SIZE;
        const y = i * CELL_SIZE;
        const cell = this.grid[i][j];

        ctx.fillStyle = cell.plant ? cell.plant.color : "saddlebrown";
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
      }
    }
  }

  //randomly change the weather conditions
  updateWeather() {
    const max = 6;
    const min = 1;
    this.weatherCondition = Math.random() < 0.5 ? "sunny" : "rainy"; // 50% chance of sun
    this.weatherDegree = Math.floor(Math.random() * (max - min + 1)) + min;
    console.log(
      "New Day: Weather:",
      this.weatherCondition,
      " severity: ",
      this.weatherDegree
    );
  }
  //update the weather condition, player seeds and current Cell text on screen
  updateUI() {
    //Seeds UI
    const ownedSeedElement = document.getElementById("seed");
    ownedSeedElement!.innerHTML = `<strong>Owned Seeds:</strong> ${plantManifest
      .map((plantType) => plantType.name)
      .join(", ")}`;

    //Harvested plants UI
    const harvestedPlants = document.getElementById("plants");
    harvestedPlants!.innerHTML = `<strong>Harvested Plants:</strong> ${Array.from(
      plantManifest.map((plantType, index) =>
        [plantType.name, plantsHarvested[index]].join(": ")
      )
    ).join(", ")}`;

    //Weather UI
    const weatherElement = document.getElementById("weather");
    weatherElement!.innerHTML = `<strong>Current Weather:</strong> ${
      this.weatherCondition.charAt(0).toUpperCase() +
      this.weatherCondition.slice(1)
    }, <strong>Severity:</strong> ${this.weatherDegree}`;

    console.log(
      "in UI - weather: ",
      this.weatherCondition,
      " ",
      this.weatherDegree
    );
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
      cellElement!.innerHTML = `You are on <strong>cell</strong> [${cell.rowIndex},${cell.colIndex}]. <strong>Plant Type:</strong> ${cell.plant?.name} <strong>Water Level:</strong> ${cell.plant?.waterLevel}. <strong>Growth Level:<strong> ${cell.plant?.growthLevel}`;
    } else {
      cellElement!.innerHTML = `You are on <strong>cell</strong> [${cell.rowIndex},${cell.colIndex}], There is no Plant here`;
    }
  }

  applyGameState(state: GameState) {
    for (let row = 0; row < state.grid.length; row++) {
      for (let col = 0; col < state.grid[row].length; col++) {
        game.grid[row][col] = { ...state.grid[row][col] };
      }
    }
    plantsHarvested = Array.from(state.harvestedPlants);

    game.weatherCondition = state.currentWeather[0] == 0 ? "sunny" : "rainy";
    game.weatherDegree = state.currentWeather[1];

    console.log("applied: ", cloneGameState(state));
    notifyChange("stateChanged");
  }

  cloneGrid(): Cell[][] {
    return this.grid.map((row) => row.map((cell) => ({ ...cell })));
  }

  //placing any update functions here
  updateGame() {
    this.updateWeather();
    this.updateUI();
    this.simulateWeather();
  }
}

//------------------------------------ Helper Funcs ------------------------------------------------------------------------------------

// notify observer of change by dispatching a new event
function notifyChange(name: string) {
  document.dispatchEvent(new Event(name));
}

//returns string based on current date + time
function getCurrentDateTime() {
  const now = new Date();

  // Get individual date and time components
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

// Draw game
function drawGame() {
  ctx!.clearRect(0, 0, gameWidth, gameHeight);
  game.draw(ctx!);
  farmer.draw(ctx!);
}

function promptPlantSelection(): string {
  const plantNames = plantManifest
    .map((plantType) => plantType.name)
    .join(", ");
  const promptText = `What would you like to plant?\nAvailable plants: ${plantNames}`;
  return prompt(promptText) ?? ""; // Prompt the player for the plant name
}

//returns index representation of plant based on position on plantManifest
function getPlantIndex(plantName: string): number {
  plantManifest.find((plantType, index) => {
    if (plantType.name.toLowerCase() === plantName.toLowerCase()) {
      return index;
    }
  });
  return -1;
}

//removes a plant from current cell
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
    if (currentCell.plant!.plantType != "weed") {
      // do not add weeds to inventory
      farmer.plants.push(currentCell.plant!);
      const reapedPlant = currentCell.plant!.name;
      if (currentCell.plant!.growthLevel >= MAX_PLANT_GROWTH) {
        // player only collects plant if it was ready for harvest
        const plantIndex = getPlantIndex(reapedPlant);
        plantsHarvested[plantIndex] += 1;
        console.log("HARVEST:   ", plantsHarvested[plantIndex]);
      }
    }
    console.log(
      `You reaped the ${currentCell.plant!.name} plant! in  cell (${
        currentCell.rowIndex
      },${currentCell.colIndex})`
    );
    currentCell.plant = null; // Remove plant from cell

    notifyChange("stateChanged");
  }
}

// interacts with cell
function interact(cell: Cell) {
  if (cell.plant != null) {
    // if there is a plant here, reap it (Weeds and Flowers)
    reapPlant(cell);
    redoStack = []; //clear redo since action was performed
    states.push(getCurrentGameState(game));
    notifyChange("stateChanged");
  } else if (cell.plant == null) {
    //otherwise prompt player for action
    const plantName = promptPlantSelection().toLowerCase(); // this type is here to avoid type erros actual type is any key in plantManifest
    const selectedPlantType = plantManifest.find(
      (plantType) => plantType.name.toLowerCase() == plantName.toLowerCase()
    );
    if (selectedPlantType) {
      cell.plant = new Plant(
        selectedPlantType.name,
        selectedPlantType.type,
        selectedPlantType.sunRequisite,
        selectedPlantType.waterRequisite,
        selectedPlantType.color,
        cell.rowIndex,
        cell.rowIndex
      );
      // Scenario Check (Remove in future)
      updateScenario(selectedPlantType.name);

      redoStack = [];
      states.push(getCurrentGameState(game));
      notifyChange("stateChanged");
    } else {
      console.log("Invalid plant selection.");
    }
  } else {
    alert("No plants available!");
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

//returns a deep copy of a game state object representing the current game state
function getCurrentGameState(game: Game): GameState {
  const currentState: GameState = {
    grid: game.cloneGrid(),
    currentWeather: Array.from([
      game.weatherCondition == "sunny" ? 0 : 1,
      game.weatherDegree,
    ]),
    harvestedPlants: Array.from(plantsHarvested.values()),
  };

  return cloneGameState(currentState);
}

//returns a deep copy of a GameState
function cloneGameState(state: GameState): GameState {
  // helper function to clone a Plant
  function clonePlant(plant: Plant | null): Plant | null {
    return plant
      ? new Plant(
          plant.name,
          plant.plantType,
          plant.sunRequisite,
          plant.waterRequisite,
          plant.color,
          plant.rowIndex,
          plant.colIndex
        )
      : null;
  }

  // Clone grid of cells, including the Plant objects
  const clonedGrid: Cell[][] = state.grid.map((row) =>
    row.map((cell) => ({
      ...cell,
      plant: clonePlant(cell.plant),
    }))
  );

  const clonedCurrentWeather: number[] = [...state.currentWeather];
  const clonedHarvestedPlants: number[] = [...state.harvestedPlants];

  const clonedState: GameState = {
    grid: clonedGrid,
    currentWeather: clonedCurrentWeather,
    harvestedPlants: clonedHarvestedPlants,
  };

  return clonedState;
}

function undo() {
  if (states.length > 1) {
    const currentState = states.pop();
    redoStack.push(cloneGameState(currentState!));
    game.applyGameState(cloneGameState(states[states.length - 1]));
    console.log("game state after undo: ", getCurrentGameState(game));
  } else {
    console.log("Undo not available.");
  }
}

function redo() {
  if (redoStack.length > 0) {
    const popped = cloneGameState(redoStack.pop()!);
    states.push(popped);
    game.applyGameState(popped);
    console.log("game state after redo: ", getCurrentGameState(game));
  } else {
    console.log("Redo not available.");
  }
}

// delete local storage game data and start game over
function deleteLocalStorage() {
  if (
    confirm("Are you sure you want to delete all game data and start over?")
  ) {
    localStorage.removeItem("states");
    states = [];
    redoStack = [];
    game = new Game(GAME_SIZE);
    farmer = new Character(gameWidth / 2, gameHeight / 2, []);

    drawGame();
    game.updateGame();
  }
}

// save current game state to list of saved game states + store saved game states in localstorage
function manualSave() {
  const input = prompt("Enter a name for your save file (optional) : ");
  if (input == null) return; //exit if no input
  const saveName = (input == "")? `saved_${getCurrentDateTime()}`: input; //default name if input is empty

  savedGameStates.set(
    saveName,
    states.map((state) => cloneGameState(state))
  );
  alert(`Game saved as "${saveName}".\nPress "L" key to load a saved game.`);

  localStorage.setItem(
    "savedGames",
    JSON.stringify(Array.from(savedGameStates.entries()))
  );

  console.log("setting saved games to localstore: ", savedGameStates);
}

//prompts the user to enter the save state which they want to load
function loadSavedGame() {
  let promptText = `Please enter the number next to the save state you want to load.`;
  const stateArray = Array.from(savedGameStates.entries());

  let index = 1;
  for (const state of stateArray) {
    promptText += `\n${index}: ${state[0]}`;
    index++;
  }
  const input = prompt(promptText);
  if (input !== null) {
    const selectedInteger = parseInt(input, 10); //convert the input to an integer
    // if a valid integer, use it to apply chosen Game state
    if (
      !isNaN(selectedInteger) &&
      selectedInteger >= 1 &&
      selectedInteger <= stateArray.length
    ) {
      const selectedName = stateArray[selectedInteger - 1][0];

      if (savedGameStates.has(selectedName)) {
        console.log("selected: ", selectedName);
        states = savedGameStates
          .get(selectedName)!
          .map((state) => cloneGameState(state));
        console.log("states: ", states);
        const newestState = states[states.length - 1];
        console.log("newest state: ", newestState);
        game.applyGameState(cloneGameState(states[states.length - 1]));
        redoStack = [];
      }
    }
  }
}

//------------------------------------ Event Listeners ------------------------------------------------------------------------------------

//character movement and controls
document.addEventListener("keydown", (event) => {
  switch (event.key) {
    case "t": {
      redoStack = [];
      game.updateGame();
      game.grid.forEach((row) => {
        row.forEach((cell) => {
          if (cell.plant instanceof Plant) {
            cell.plant.simulateGrowth();
          }
        });
      });

      //add current game state
      states.push(getCurrentGameState(game));
      notifyChange("stateChanged");

      console.log("saved states: ", states);
      break;
    }
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
    //interact with current cell
    case " ": {
      interact(farmer.getCurrentCell()!);
      break;
    }
    //undo
    case "u":
      undo();
      break;
    //redo
    case "r":
      redo();
      break;
    //delete auto-save state and start game over
    case "d":
      deleteLocalStorage();
      break;
    //manually save game state
    case "s":
      manualSave();
      break;
    //load saved game
    case "l":
      loadSavedGame();
      break;
  }
  game.updateCurrentCellUI(farmer.getCurrentCell()!);
  drawGame();
});

//observer for state changed event will update UI elements and redraw game
document.addEventListener("stateChanged", () => {
  game.updateUI();
  game.draw(ctx!);
  localStorage.setItem("states", JSON.stringify(states));
  
});

//store saved games before player exits
window.addEventListener("beforeunload", ()=>{
  localStorage.setItem(
    "savedGames",
    JSON.stringify(Array.from(savedGameStates.entries()))
  );
});

//------------------------------------ Main ------------------------------------------------------------------------------------

let game = new Game(GAME_SIZE);
let farmer = new Character(gameWidth / 2, gameHeight / 2, []);
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
