import "./style.css";
import { Scenario } from "./scenario.ts";
import jsonPlants from "./plants.json";

//------------------------------------ Global Vars ------------------------------------------------------------------------------------

const canvas = document.getElementById("game");
const gameHeight = (canvas! as HTMLCanvasElement).height;
const gameWidth = (canvas! as HTMLCanvasElement).width;

const ctx = (canvas! as HTMLCanvasElement).getContext("2d");
const testScenario = new Scenario("Sunflower", 3);
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

let states: GameState[] = []; //history of game states
let redoStack: GameState[] = [];

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

const CELL_BYTES = 6;

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

class Game {
  size: number;
  grid: ArrayBuffer;
  weatherCondition: string; // 'sunny' or 'rainy'
  weatherDegree: number; //magnitude of sun or rain

  //initializes game from localstorage is available, otherwise initializes new game
  constructor(gridSize: number) {
    this.size = gridSize;

    /*
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
    const localStore = localStorage.getItem("states");
    if (localStore) {
      const encodedStates = JSON.parse(localStore) as EncodedState[];
      states = encodedStates.map((encodedState) => {
        return {
          grid: base64ToArrayBuffer(encodedState.grid),
          currentWeather: encodedState.currentWeather,
          harvestedPlants: encodedState.harvestedPlants,
        };
      });
      this.grid = states[states.length - 1].grid;
      this.weatherCondition =
        states[states.length - 1].currentWeather[0] == 0 ? "sunny" : "rainy";
      this.weatherDegree = states[states.length - 1].currentWeather[1];

      const midIndex = Math.floor(this.size / 2);
      this.updateCurrentCellUI(this.getCell(midIndex, midIndex));
      this.updateUI();
    } else {*/
    const totalGridSize = gridSize * gridSize;
    this.grid = new ArrayBuffer(totalGridSize * CELL_BYTES);

    this.weatherCondition = "sunny";
    this.weatherDegree = 3;
    this.generateRandomGrid();

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
    states.push(getCurrentGameState(this));
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const x = j * CELL_SIZE;
        const y = i * CELL_SIZE;
        const cell = this.getCell(i, j);

        ctx.fillStyle = getColorFromType(cell.type);
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

//removes a plant from current cell
function reapPlant(currentCell: Cell) {
  const confirmReap = window.confirm(
    `Do you want to reap the ${currentCell.type} plant?\nDetails:\nSun Level: ${currentCell.sunLevel}, Water Level: ${currentCell.waterLevel}, Growth Level: ${currentCell.growthLevel}`
  );

  if (confirmReap) {
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
        game.updateUI();
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
}

// interacts with cell
function interact(cell: Cell) {
  if (cell.type != cellType.dirt) {
    // if there is a plant here, reap it (Weeds and Flowers)
    reapPlant(cell);
    redoStack = []; //clear redo since action was performed
    states.push(getCurrentGameState(game));
    notifyChange("stateChanged");
  } else if (cell.type == cellType.dirt) {
    //otherwise prompt player for action
    const inputtedPlant = promptPlantSelection().toLowerCase();
    if (getTypefromName(inputtedPlant)) {
      cell.type = getTypefromName(inputtedPlant);
      cell.sunLevel = 0;
      cell.waterLevel = 0;
      cell.growthLevel = 0;
      game.storeCell(cell);

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

function undo() {
  if (states.length > 1) {
    const currentState = states.pop();
    redoStack.push(cloneGameState(currentState!));
    game.applyGameState(cloneGameState(states[states.length - 1]));
  } else {
    console.log("Undo not available.");
  }
}

function redo() {
  if (redoStack.length > 0) {
    const popped = cloneGameState(redoStack.pop()!);
    states.push(popped);
    game.applyGameState(popped);
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
    localStorage.removeItem("savedGames");
    states = [];
    redoStack = [];
    savedGameStates.clear();
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
  const saveName = input == "" ? `saved_${getCurrentDateTime()}` : input; //default name if input is empty

  savedGameStates.set(
    saveName,
    states.map((state) => cloneGameState(state))
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
        states = savedGameStates
          .get(selectedName)!
          .map((state) => cloneGameState(state));

        game.applyGameState(cloneGameState(states[states.length - 1]));
        redoStack = [];
        notifyChange("stateChanged");
      }
    }
  }
}

function getColorFromType(type: number): string {
  switch (type) {
    case cellType.dirt: {
      return "saddlebrown";
    }
    case cellType.crabgrass: {
      return "green";
    }
    case cellType.sunflower: {
      return "yellow";
    }
    case cellType.rose: {
      return "pink";
    }
    case cellType.daffodil: {
      return "#FFD700";
    }
    case cellType.lily: {
      return "#FFFFFF";
    }
    case cellType.marigold: {
      return "#FFA500";
    }
    case cellType.fuchsia: {
      return "#FF00FF";
    }
  }
  return "saddlebrown";
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
  allPlants.forEach((plant) => {
    flowers.push(plant.name);
  });
  return flowers;
}

function getTypefromName(name: string): number {
  const indexOffset = 2;
  const uppercasedStrings = name.slice(0, 1).toUpperCase() + name.slice(1);
  return (
    getAllFlowerTypes().findIndex((e) => e == uppercasedStrings) + indexOffset
  );
}
//------------------------------------ Event Listeners ------------------------------------------------------------------------------------

//character movement and controls
document.addEventListener("keydown", (event) => {
  switch (event.key) {
    case "t": {
      redoStack = [];
      game.updateGame();

      for (let i = 0; i < GAME_SIZE; i++) {
        for (let j = 0; j < GAME_SIZE; j++) {
          simulateGrowth(game.getCell(i, j));
        }
      }

      notifyChange("stateChanged");

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
  const encodedStates: EncodedState[] = states.map((gameState) => {
    return {
      grid: arrayBufferToBase64(gameState.grid),
      currentWeather: gameState.currentWeather,
      harvestedPlants: gameState.harvestedPlants,
    };
  });
  localStorage.setItem("states", JSON.stringify(encodedStates));
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
let game = new Game(GAME_SIZE);
let farmer = new Character(gameWidth / 2, gameHeight / 2, []);
drawGame();
