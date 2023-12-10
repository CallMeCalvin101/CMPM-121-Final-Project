import "./style.css";
import { Scenario } from "./scenario.ts";
import jsonPlants from "./plants.json";
import gameConditions from "./scenarios.json";

//------------------------------------ Global Vars ------------------------------------------------------------------------------------

const canvas = document.getElementById("game");
const gameHeight = (canvas! as HTMLCanvasElement).height;
const gameWidth = (canvas! as HTMLCanvasElement).width;

const ctx = (canvas! as HTMLCanvasElement).getContext("2d");
const testScenario = new Scenario(gameConditions);
let savedGameStates = new Map<string, GameState[]>();

const cellType = Object.freeze({
  dirt: 0,
  crabgrass: 1,
  sunflower: 2,
  rose: 3,
  daffodil: 4,
  lily: 5,
  marigold: 6,
  fuchsia: 7,
});

const allPlants: Map<number, Plant> = new Map<number, Plant>();
definePlantTypesFromJSON();

const MAX_PLANT_GROWTH = 15;

let plantsHarvested: number[] = getAllFlowerTypes().map(() => 0);

const GAME_SIZE = 7;
const CELL_SIZE = gameWidth / GAME_SIZE;

//------------------------------------ Class def ------------------------------------------------------------------------------------
interface Cell {
  type: number;
  rowIndex: number;
  colIndex: number;
  waterLevel: number;
  sunLevel: number;
  growthLevel: number;
}

export const CELL_BYTES = 6;

interface GameState {
  grid: ArrayBuffer;
  currentWeather: number[]; //[weatherCondition weatherDegree] weather condition 0->sunny 1->rainy
  harvestedPlants: number[]; //value represents number of harvested plants for each plantIndex
}

interface EncodedState {
  grid: string;
  currentWeather: number[]; //[weatherCondition weatherDegree] weather condition 0->sunny 1->rainy
  harvestedPlants: number[]; //value represents number of harvested plants for each plantIndex
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
    const gridY = Math.floor(this.posX / CELL_SIZE);
    const gridX = Math.floor(this.posY / CELL_SIZE);

    return game.getCell(gridX, gridY);
  }
}

interface Plant {
  name: string;
  sunRequisite: number;
  waterRequisite: number;
  color: string;
}

function simulateGrowth(cell: Cell) {
  if (cell.type == cellType.dirt || cell.type == cellType.crabgrass) {
    return;
  }

  const plantType = allPlants.get(cell.type)!;
  // Simulate general growth based on accumulated sun and water levels
  if (
    cell.sunLevel >= plantType.sunRequisite &&
    cell.waterLevel >= plantType.waterRequisite
  ) {
    if (cell.growthLevel < MAX_PLANT_GROWTH) {
      cell.growthLevel += 1;
      console.log(
        plantType.name,
        " in cell (",
        cell.rowIndex,
        ",",
        cell.colIndex,
        ") is growing! Growth level:",
        cell.growthLevel
      );
      game.storeCell(cell);
    } else {
      console.log(
        plantType.name,
        "in cell: (",
        cell.rowIndex,
        ",",
        cell.colIndex,
        ") is ready for harvest!"
      );
    }
  }
}

export class Game {
  size: number;
  grid: ArrayBuffer;
  weatherCondition: string; // 'sunny' or 'rainy'
  weatherDegree: number; //magnitude of sun or rain
  states: GameState[]; //array of previous game states
  redoStack: GameState[];

  //initializes game from localstorage is available, otherwise initializes new game
  constructor(
    gridSize: number,
    grid?: ArrayBuffer,
    states?: GameState[],
    weatherCondition?: string,
    weatherDegree?: number
  ) {
    this.size = gridSize;
    this.grid = grid ? grid : new ArrayBuffer(gridSize * gridSize * CELL_BYTES);
    this.weatherCondition = weatherCondition ? weatherCondition : "sunny";
    this.weatherDegree = weatherDegree ? weatherDegree : 3;
    this.states = states ? states : [];
    this.redoStack = [];
    if (!grid) this.generateRandomGrid();

    const midIndex = Math.floor(this.size / 2);
    this.updateCurrentCellUI(this.getCell(midIndex, midIndex));
    this.updateGame();
    //}
  }

  storeCell(cell: Cell) {
    const gridView = new DataView(this.grid);
    const byteOffset = (cell.rowIndex * this.size + cell.colIndex) * CELL_BYTES;

    gridView.setUint8(byteOffset, cell.type);
    gridView.setUint8(byteOffset + 1, cell.rowIndex);
    gridView.setUint8(byteOffset + 2, cell.colIndex);
    gridView.setUint8(byteOffset + 3, cell.waterLevel);
    gridView.setUint8(byteOffset + 4, cell.sunLevel);
    gridView.setUint8(byteOffset + 5, cell.growthLevel);
  }

  getCell(row: number, col: number): Cell {
    const gridView = new DataView(this.grid);
    const byteOffset = (row * this.size + col) * CELL_BYTES;

    const type = gridView.getUint8(byteOffset);
    const rowIndex = gridView.getUint8(byteOffset + 1);
    const colIndex = gridView.getUint8(byteOffset + 2);
    const waterLevel = gridView.getUint8(byteOffset + 3);
    const sunLevel = gridView.getUint8(byteOffset + 4);
    const growthLevel = gridView.getUint8(byteOffset + 5);

    return { type, rowIndex, colIndex, waterLevel, sunLevel, growthLevel };
  }

  generateRandomGrid() {
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const randomValue = Math.random();

        const newCell: Cell = {
          type: cellType.dirt,
          rowIndex: i,
          colIndex: j,
          waterLevel: 0,
          sunLevel: 0,
          growthLevel: 0,
        };

        if (randomValue < 0.07) {
          newCell.type = cellType.crabgrass;
        }

        this.storeCell(newCell);
      }
    }
    this.states.push(this.getCurrentGameState());
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const x = j * CELL_SIZE;
        const y = i * CELL_SIZE;
        const cell = this.getCell(i, j);

        ctx.fillStyle = allPlants.get(cell.type)!.color;
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
      }
    }
  }

  undo() {
    if (this.states.length > 1) {
      const currentState = this.states.pop();
      this.redoStack.push(this.cloneGameState(currentState!));
      game.applyGameState(
        this.cloneGameState(this.states[this.states.length - 1])
      );
    } else {
      console.log("Undo not available.");
    }
  }

  redo() {
    if (this.redoStack.length > 0) {
      const popped = this.cloneGameState(this.redoStack.pop()!);
      this.states.push(popped);
      this.applyGameState(popped);
    } else {
      console.log("Redo not available.");
    }
  }

  // interacts with cell
  interact(cell: Cell) {
    if (cell.type != cellType.dirt) {
      // if there is a plant here, reap it (Weeds and Flowers)
      this.reapPlant(cell);
      this.redoStack = []; //clear redo since action was performed
      this.states.push(this.getCurrentGameState());
      notifyChange("stateChanged");
    } else if (cell.type == cellType.dirt) {
      //otherwise prompt player for action
      const inputtedPlant = promptPlantSelection().toLowerCase();
      if (getTypefromName(inputtedPlant) > 1) {
        //don't do this for dirt or crabgrass
        cell.type = getTypefromName(inputtedPlant);
        cell.sunLevel = 0;
        cell.waterLevel = 0;
        cell.growthLevel = 0;
        this.storeCell(cell);

        this.redoStack = [];
        this.states.push(this.getCurrentGameState());
        notifyChange("stateChanged");
      } else {
        console.log("Invalid plant selection.");
      }
    } else {
      alert("No plants available!");
    }
  }

  //removes a plant from current cell
  reapPlant(currentCell: Cell) {
    const confirmReap = window.confirm(
      `Do you want to reap the ${currentCell.type} plant?\nDetails:\nSun Level: ${currentCell.sunLevel}, Water Level: ${currentCell.waterLevel}, Growth Level: ${currentCell.growthLevel}`
    );

    if (!confirmReap) return;

    if (currentCell.type != cellType.crabgrass) {
      // do not add weeds to inventory
      const reapedPlant = getNameFromType(currentCell.type);
      if (currentCell.growthLevel >= MAX_PLANT_GROWTH) {
        // player only collects plant if it was ready for harvest
        farmer.plants.push(allPlants.get(currentCell.type)!);
        plantsHarvested[currentCell.type - 2] += 1;
        console.log(
          "HARVESTED ",
          reapedPlant,
          "! ",
          plantsHarvested[currentCell.type],
          " ",
          reapedPlant,
          "s in inventory"
        );
        this.updateUI();
      }
    }
    console.log(
      `You reaped the ${getNameFromType(currentCell.type)} plant! in  cell (${
        currentCell.rowIndex
      },${currentCell.colIndex})`
    );
    currentCell.type = cellType.dirt; // Remove plant from cell
    currentCell.sunLevel = 0;
    currentCell.waterLevel = 0;
    currentCell.growthLevel = 0;
    game.storeCell(currentCell);

    notifyChange("stateChanged");
  }

  //returns a deep copy of a game state object representing the current game state
  getCurrentGameState(): GameState {
    const currentState: GameState = {
      grid: this.cloneGrid(),
      currentWeather: Array.from([
        this.weatherCondition == "sunny" ? 0 : 1,
        this.weatherDegree,
      ]),
      harvestedPlants: Array.from(plantsHarvested.values()),
    };

    return this.cloneGameState(currentState);
  }

  //returns a deep copy of a GameState
  cloneGameState(state: GameState): GameState {
    // Clone grid of cells, including the Plant objects
    const clonedGrid: ArrayBuffer = state.grid.slice(0);

    const clonedCurrentWeather: number[] = [...state.currentWeather];
    const clonedHarvestedPlants: number[] = [...state.harvestedPlants];

    const clonedState: GameState = {
      grid: clonedGrid,
      currentWeather: clonedCurrentWeather,
      harvestedPlants: clonedHarvestedPlants,
    };

    return clonedState;
  }

  // delete local storage game data and start game over
  deleteLocalStorage() {
    if (
      confirm("Are you sure you want to delete all game data and start over?")
    ) {
      localStorage.removeItem("states");
      localStorage.removeItem("savedGames");
      this.states = [];
      this.redoStack = [];
      savedGameStates.clear();
      game = new Game(GAME_SIZE);
      farmer = new Character(gameWidth / 2, gameHeight / 2, []);

      drawGame();
      this.updateGame();
    }
  }

  // save current game state to list of saved game states + store saved game states in localstorage
  manualSave() {
    const input = prompt("Enter a name for your save file (optional) : ");
    if (input == null) return; //exit if no input
    const saveName = input == "" ? `saved_${getCurrentDateTime()}` : input; //default name if input is empty

    savedGameStates.set(
      saveName,
      this.states.map((state) => this.cloneGameState(state))
    );
    alert(`Game saved as "${saveName}".\nPress "L" key to load a saved game.`);

    const encodedSavedGameStates: Map<string, EncodedState[]> = new Map<
      string,
      EncodedState[]
    >();
    savedGameStates.forEach((gameStates, key) => {
      const encodedGameStates: EncodedState[] = gameStates.map((gameState) => {
        return {
          grid: arrayBufferToBase64(gameState.grid),
          currentWeather: gameState.currentWeather,
          harvestedPlants: gameState.harvestedPlants,
        };
      }) as EncodedState[];
      encodedSavedGameStates.set(key, encodedGameStates);
    });
    localStorage.setItem(
      "savedGames",
      JSON.stringify(Array.from(encodedSavedGameStates.entries()))
    );
  }

  //prompts the user to enter the save state which they want to load
  loadSavedGame() {
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
          this.states = savedGameStates
            .get(selectedName)!
            .map((state) => this.cloneGameState(state));

          this.applyGameState(
            this.cloneGameState(this.states[this.states.length - 1])
          );
          this.redoStack = [];
          notifyChange("stateChanged");
        }
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
    //Controls
    const controlsUI = document.getElementById("controls");
    controlsUI!.innerHTML = `<strong>Controls:</strong> Arrow Keys to Move! Spacebar to Reap/Sow plant. T to pass the time. S to save, L to load, and D to delete all data. U to undo, R to redo.`;

    //Seeds UI
    const ownedSeedElement = document.getElementById("seed");
    ownedSeedElement!.innerHTML = `<strong>Owned Seeds:</strong> ${getAllFlowerTypes().join(
      `, `
    )}`;

    //Harvested plants UI
    const harvestedPlants = document.getElementById("plants");
    harvestedPlants!.innerHTML = `<strong>Harvested Plants:</strong> ${Array.from(
      getAllFlowerTypes().map((plantType, index) =>
        [plantType, plantsHarvested[index]].join(": ")
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
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const cell = this.getCell(i, j);

        if (this.weatherCondition === "rainy") {
          const sunChance = 0.2;
          cell.waterLevel += this.weatherDegree;
          if (Math.random() < sunChance) {
            cell.sunLevel = this.weatherDegree;
          } else {
            cell.sunLevel = Math.floor(this.weatherDegree / 2);
          }
        } else if (this.weatherCondition === "sunny") {
          const rainChance = 0.1;
          if (Math.random() > rainChance) cell.waterLevel = 1;
          cell.sunLevel = this.weatherDegree;
        }

        this.storeCell(cell);
      }
    }
  }

  updateCurrentCellUI(cell: Cell) {
    const cellElement = document.getElementById("cell");
    if (cell.type) {
      cellElement!.innerHTML = `You are on <strong>cell</strong> [${cell.rowIndex},${cell.colIndex}]. <strong>Plant Type:</strong> ${cell.type} <strong>Water Level:</strong> ${cell.waterLevel}. <strong>Growth Level:<strong> ${cell.growthLevel}`;
    } else {
      cellElement!.innerHTML = `You are on <strong>cell</strong> [${cell.rowIndex},${cell.colIndex}], There is no Plant here`;
    }
  }

  applyGameState(state: GameState) {
    game.grid = state.grid.slice(0);
    plantsHarvested = Array.from(state.harvestedPlants);

    game.weatherCondition = state.currentWeather[0] == 0 ? "sunny" : "rainy";
    game.weatherDegree = state.currentWeather[1];

    notifyChange("stateChanged");
  }

  cloneGrid(): ArrayBuffer {
    return this.grid.slice(0);
  }

  passTime() {
    this.redoStack = [];
    this.updateGame();

    for (let i = 0; i < GAME_SIZE; i++) {
      for (let j = 0; j < GAME_SIZE; j++) {
        simulateGrowth(game.getCell(i, j));
      }
    }

    notifyChange("stateChanged");
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

// convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(buffer);
  const binaryString = uint8Array.reduce(
    (acc, byte) => acc + String.fromCharCode(byte),
    ""
  );
  return btoa(binaryString);
}

// convert Base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
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
  const plantNames = getAllFlowerTypes().join(", ");
  const promptText = `What would you like to plant?\nAvailable plants: ${plantNames}`;
  return prompt(promptText) ?? ""; // Prompt the player for the plant name
}

function getNameFromType(type: number): string {
  switch (type) {
    case cellType.dirt: {
      return "dirt";
    }
    case cellType.crabgrass: {
      return "crabgrass";
    }
    case cellType.sunflower: {
      return "sunflower";
    }
    case cellType.rose: {
      return "rose";
    }
    case cellType.daffodil: {
      return "daffodil";
    }
    case cellType.lily: {
      return "lily";
    }
    case cellType.marigold: {
      return "marigold";
    }
    case cellType.fuchsia: {
      return "fuchsia";
    }
  }
  return "nothing";
}

function definePlantTypesFromJSON() {
  jsonPlants.allPlantTypes.forEach((plant) => {
    allPlants.set(plant.type, plant);
  });
}

function getAllFlowerTypes(): string[] {
  const flowers: string[] = [];
  const offset = 2;
  allPlants.forEach((plant) => {
    flowers.push(plant.name);
  });
  return flowers.slice(offset);
}

function getTypefromName(name: string): number {
  const indexOffset = 2;
  const uppercasedStrings = name.slice(0, 1).toUpperCase() + name.slice(1);
  return (
    getAllFlowerTypes().findIndex((e) => e == uppercasedStrings) + indexOffset
  );
}

function checkScenario(scenario: Scenario) {
  //update scenario with current game conditions
  scenario.updateCurrentConditions(plantsHarvested);
  //return true or false if victory conditions met
  return scenario.victoryConditionsMet();
}
//------------------------------------ Event Listeners ------------------------------------------------------------------------------------

//character movement and controls
const keyHandlers: Record<string, () => void> = {
  ArrowLeft: () => farmer.dragPos("W", CELL_SIZE),
  ArrowRight: () => farmer.dragPos("E", CELL_SIZE),
  ArrowUp: () => farmer.dragPos("N", CELL_SIZE),
  ArrowDown: () => farmer.dragPos("S", CELL_SIZE),
  " ": () => game.interact(farmer.getCurrentCell()!),
  u: () => game.undo(),
  r: () => game.redo(),
  d: () => game.deleteLocalStorage(),
  s: () => game.manualSave(),
  l: () => game.loadSavedGame(),
  t: () => game.passTime(),
};

document.addEventListener("keydown", (event) => {
  const specialHandler = keyHandlers[event.key];
  if (specialHandler !== null) {
    try {
      specialHandler();
    } catch (error) {
      //wrong key does nothing
    }
  }

  game.updateCurrentCellUI(farmer.getCurrentCell()!);
  drawGame();
});

//observer for state changed event will update UI elements and redraw game
document.addEventListener("stateChanged", () => {
  game.updateUI();
  game.draw(ctx!);
  const encodedStates: EncodedState[] = game.states.map((gameState) => {
    return {
      grid: arrayBufferToBase64(gameState.grid),
      currentWeather: gameState.currentWeather,
      harvestedPlants: gameState.harvestedPlants,
    };
  });
  localStorage.setItem("states", JSON.stringify(encodedStates));

  if (checkScenario(testScenario)) console.log("Scenario Complete");
});

//store saved games before player exits
window.addEventListener("beforeunload", () => {
  const encodedSavedGameStates: Map<string, EncodedState[]> = new Map<
    string,
    EncodedState[]
  >();
  savedGameStates.forEach((gameStates, key) => {
    const encodedGameStates: EncodedState[] = gameStates.map((gameState) => {
      return {
        grid: arrayBufferToBase64(gameState.grid),
        currentWeather: gameState.currentWeather,
        harvestedPlants: gameState.harvestedPlants,
      };
    }) as EncodedState[];
    encodedSavedGameStates.set(key, encodedGameStates);
  });
  localStorage.setItem(
    "savedGames",
    JSON.stringify(Array.from(encodedSavedGameStates.entries()))
  );
});

//------------------------------------ Main ------------------------------------------------------------------------------------

//add saved games states if available
const storedData = localStorage.getItem("savedGames");
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
if (storedData) {
  const parsedData = JSON.parse(storedData) as [string, EncodedState[]][];
  const decodedData: [string, GameState[]][] = parsedData.map(
    ([saveName, encodedStates]) => {
      return [
        saveName,
        encodedStates.map((encodedState) => {
          return {
            grid: base64ToArrayBuffer(encodedState.grid),
            currentWeather: encodedState.currentWeather,
            harvestedPlants: encodedState.harvestedPlants,
          };
        }),
      ];
    }
  );
  savedGameStates = new Map<string, GameState[]>(decodedData);
}

// check to see if autosave state is available
const autosave = localStorage.getItem("states");
let states: GameState[];
let game: Game;

if (autosave) {
  const encodedStates = JSON.parse(autosave) as EncodedState[];
  states = encodedStates.map((encodedState) => {
    return {
      grid: base64ToArrayBuffer(encodedState.grid),
      currentWeather: encodedState.currentWeather,
      harvestedPlants: encodedState.harvestedPlants,
    };
  });
  const grid = states[states.length - 1].grid;
  const weatherCondition =
    states[states.length - 1].currentWeather[0] == 0 ? "sunny" : "rainy";
  const weatherDegree = states[states.length - 1].currentWeather[1];

  game = new Game(GAME_SIZE, grid, states, weatherCondition, weatherDegree);
} else {
  game = new Game(GAME_SIZE); //not including optional params creates a fresh game
}

let farmer = new Character(gameWidth / 2, gameHeight / 2, []);
drawGame();
