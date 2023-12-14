import "./style.css";
import { Scenario } from "./scenario.ts";
import gameConditions from "./scenarios.json";
import translations from "./uiText.json";
import { flowerTypes, weedTypes } from "./plants.ts";
//------------------------------------ Global Vars ------------------------------------------------------------------------------------

const canvas = document.getElementById("game");
const gameHeight = (canvas! as HTMLCanvasElement).height;
const gameWidth = (canvas! as HTMLCanvasElement).width;

const ctx = (canvas! as HTMLCanvasElement).getContext("2d");
const testScenario = new Scenario(gameConditions);
let savedGameStates = new Map<string, GameState[]>();

const MAX_PLANT_GROWTH = 5;

// flowers the player has harvested
let flowersHarvested: number[] = [];
flowerTypes.forEach(() => flowersHarvested.push(0));

const GAME_SIZE = 7;
const CELL_SIZE = gameWidth / GAME_SIZE;

//maps plant names to integer IDs
const plants: Map<number, string> = new Map<number, string>();

const allPlantTypes: Plant[] = [...flowerTypes, ...weedTypes];
allPlantTypes.forEach((plant, index) => plants.set(index + 1, plant.name));

// variable to track localized version
type availableLanguages = "english" | "japanese" | "vietnamese";
const availableLanguagesList: availableLanguages[] = [
  "english",
  "japanese",
  "vietnamese",
];
let curLanguage: number = 0;
const languageBase: Map<availableLanguages, Map<string, string>> = new Map();

//------------------------------------ Class def ------------------------------------------------------------------------------------
interface Cell {
  plant: number;
  rowIndex: number;
  colIndex: number;
  waterLevel: number;
  sunLevel: number;
  growthLevel: number;
}

export const CELL_BYTES = 6;

interface GameState {
  grid: ArrayBuffer;
  time: number;
  currentWeather: number[]; //[weatherCondition weatherDegree] weather condition 0->sunny 1->rainy
  harvestedPlants: number[]; //value represents number of harvested plants for each plantIndex
}

interface EncodedState {
  grid: string;
  time: number;
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

export interface Plant {
  name: string;
  color: string;
  sunRequisite: number;
  waterRequisite: number;
  vibeRequisite: number;
}

function simulateGrowth(cell: Cell) {
  //if there are no plant here or if plant is a weed, exit
  const plantID = plants.get(cell.plant);
  if (!plantID || isWeed(cell.plant)) {
    return;
  }

  const plant = getPlant(cell.plant)!;
  // Simulate general growth based on accumulated sun and water levels
  if (
    cell.sunLevel >= plant.sunRequisite &&
    cell.waterLevel >= plant.waterRequisite
  ) {
    if (cell.growthLevel < MAX_PLANT_GROWTH) {
      cell.growthLevel += 1;
      console.log(
        plant.name,
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
        plant.name,
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
  time: number;
  weatherCondition: string; // 'sunny' or 'rainy'
  weatherDegree: number; //magnitude of sun or rain
  states: GameState[]; //array of previous game states
  redoStack: GameState[];

  //initializes game from localstorage is available, otherwise initializes new game
  constructor(
    gridSize: number,
    grid?: ArrayBuffer,
    time?: number,
    states?: GameState[],
    weatherCondition?: string,
    weatherDegree?: number
  ) {
    this.size = gridSize;
    this.grid = grid ? grid : new ArrayBuffer(gridSize * gridSize * CELL_BYTES);
    this.time = time ? time : 0;
    this.weatherCondition = weatherCondition ? weatherCondition : "sunny";
    this.weatherDegree = weatherDegree ? weatherDegree : 3;
    this.states = states ? states : [];
    this.redoStack = [];
    if (!grid) {
      //if creating a fresh game
      this.generateRandomGrid();
      //apply scenario starting conditions
      const startConditions = testScenario.getStartingConditions();
      this.weatherCondition = startConditions[0] == 0 ? "sunny" : "rainy";
      this.weatherDegree = startConditions[1];
      this.updateUI();
      this.simulateWeather();
    } else {
      this.updateGame();
    }
    const midIndex = Math.floor(this.size / 2);
    this.updateCurrentCellUI(this.getCell(midIndex, midIndex));
  }

  storeCell(cell: Cell) {
    const gridView = new DataView(this.grid);
    const byteOffset = (cell.rowIndex * this.size + cell.colIndex) * CELL_BYTES;

    gridView.setUint8(byteOffset, cell.plant);
    gridView.setUint8(byteOffset + 1, cell.rowIndex);
    gridView.setUint8(byteOffset + 2, cell.colIndex);
    gridView.setUint8(byteOffset + 3, cell.waterLevel);
    gridView.setUint8(byteOffset + 4, cell.sunLevel);
    gridView.setUint8(byteOffset + 5, cell.growthLevel);
  }

  getCell(row: number, col: number): Cell {
    const gridView = new DataView(this.grid);
    const byteOffset = (row * this.size + col) * CELL_BYTES;

    const plant = gridView.getUint8(byteOffset);
    const rowIndex = gridView.getUint8(byteOffset + 1);
    const colIndex = gridView.getUint8(byteOffset + 2);
    const waterLevel = gridView.getUint8(byteOffset + 3);
    const sunLevel = gridView.getUint8(byteOffset + 4);
    const growthLevel = gridView.getUint8(byteOffset + 5);

    return { plant, rowIndex, colIndex, waterLevel, sunLevel, growthLevel };
  }

  generateRandomGrid() {
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const randomValue = Math.random();

        const newCell: Cell = {
          plant: 0,
          rowIndex: i,
          colIndex: j,
          waterLevel: 0,
          sunLevel: 0,
          growthLevel: 0,
        };

        if (randomValue < 0.07) {
          newCell.plant = getID(weedTypes[0].name)!;
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

        ctx.fillStyle = getPlant(cell.plant)
          ? getPlant(cell.plant)!.color
          : "saddlebrown";
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
      }
    }
  }

  activateEvent(name: string, row: number, col: number) {
    console.log("activating event ", name);
    if (name == "WeedGrowth") {
      const gridView = new DataView(this.grid);
      const byteOffset = (row * this.size + col) * CELL_BYTES;
      if (weedTypes[0]) {
        gridView.setUint8(byteOffset, getID(weedTypes[0].name)!);
        gridView.setUint8(byteOffset + 1, row);
        gridView.setUint8(byteOffset + 2, col);
        gridView.setUint8(byteOffset + 3, 0);
        gridView.setUint8(byteOffset + 4, 0);
        gridView.setUint8(byteOffset + 5, 0);

        console.log(
          "EVENT: ",
          gridView.getUint8(byteOffset),
          " in row ",
          gridView.getUint8(byteOffset + 1),
          " col ",
          gridView.getUint8(byteOffset + 2)
        );
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
    if (cell.plant != 0) {
      // if there is a plant here, reap it (Weeds and Flowers)
      this.reapPlant(cell);
      this.redoStack = []; //clear redo since action was performed
      this.states.push(this.getCurrentGameState());
      notifyChange("stateChanged");
    } else {
      //otherwise prompt player for action on empty cell
      const inputtedPlant = promptPlantSelection().toLowerCase();
      const plantID = getID(inputtedPlant)!;
      if (!isWeed(plantID)) {
        //don't do this for weeds
        cell.plant = plantID;
        cell.sunLevel = 0;
        cell.waterLevel = 0;
        cell.growthLevel = 0;
        this.storeCell(cell);

        this.redoStack = [];
        this.states.push(this.getCurrentGameState());
        notifyChange("stateChanged");
      } else {
        alert("Invalid plant selection.");
      }
    }
  }

  //removes a plant from current cell
  reapPlant(currentCell: Cell) {
    const confirmReap = window.confirm(
      `Do you want to reap the ${
        getPlant(currentCell.plant)!.name
      } plant?\nDetails:\nSun Level: ${currentCell.sunLevel}, Water Level: ${
        currentCell.waterLevel
      }, Growth Level: ${currentCell.growthLevel}`
    );

    if (!confirmReap) return;

    if (!isWeed(currentCell.plant)) {
      // do not add weeds to inventory
      const reapedPlant = getPlant(currentCell.plant)!;
      if (currentCell.growthLevel >= MAX_PLANT_GROWTH) {
        // player only collects plant if it was ready for harvest
        farmer.plants.push(clonePlant(getPlant(currentCell.plant)!));
        flowersHarvested[getFlowerIndex(getPlant(currentCell.plant)!.name)]++;
        console.log(
          "HARVESTED ",
          reapedPlant,
          "! ",
          flowersHarvested[getFlowerIndex(getPlant(currentCell.plant)!.name)],
          " ",
          reapedPlant,
          "s in inventory"
        );
        this.updateUI();
      }
    }
    console.log(
      `You reaped the ${getPlant(currentCell.plant)!.name} plant! in  cell (${
        currentCell.rowIndex
      },${currentCell.colIndex})`
    );
    currentCell.plant = 0; // Remove plant from cell
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
      time: this.time,
      currentWeather: Array.from([
        this.weatherCondition == "sunny" ? 0 : 1,
        this.weatherDegree,
      ]),
      harvestedPlants: Array.from(flowersHarvested.values()),
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
      time: state.time,
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
      this.time = 0;
      const startConditions = testScenario.getStartingConditions();
      this.weatherCondition = startConditions[0] == 0 ? "sunny" : "rainy";
      this.weatherDegree = startConditions[1];
      this.redoStack = [];
      savedGameStates.clear();
      game = new Game(GAME_SIZE);
      farmer = new Character(gameWidth / 2, gameHeight / 2, []);

      drawGame();
      this.updateUI();
      this.simulateWeather();
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
          time: gameState.time,
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
    const controlsUI = document.getElementById("controls")!;
    controlsUI.innerHTML = `${localizeText("controls")}`;

    //Time UI
    const currentTime = document.getElementById("time")!;
    currentTime.innerHTML = `${localizeText("day")} ${this.time}`;

    //Win Conditions UI
    const victoryConditionUI = document.getElementById("win");
    victoryConditionUI!.innerHTML = `${localizeText("victory")} ${testScenario
      .getVictoryConditions()
      .map((value, index) => `${getPlant(index + 1)!.name}: ${value}`)
      .join(", ")}`; //only works right now since theres only one condition/target

    //Seeds UI
    const ownedSeedElement = document.getElementById("seed")!;
    ownedSeedElement.innerHTML = `${localizeText("seeds")} ${flowerTypes
      .map((flower) => flower.name)
      .join(", ")}`;

    //Harvested plants UI
    const harvestedPlants = document.getElementById("plants");
    harvestedPlants!.innerHTML = `${localizeText("flowers")} ${flowerTypes
      .map((flower, index) => [flower.name, flowersHarvested[index]].join(": "))
      .join(", ")}`;

    //Weather UI
    const weatherElement = document.getElementById("weather")!;
    weatherElement.innerHTML = `${localizeText("weather")} ${
      this.weatherCondition.charAt(0).toUpperCase() +
      this.weatherCondition.slice(1)
    }, ${localizeText("severity")} ${this.weatherDegree}`;
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
    if (cell.plant) {
      cellElement!.innerHTML = `${localizeText("cell")} [${cell.rowIndex},${
        cell.colIndex
      }]. ${localizeText("plant type")} ${
        getPlant(cell.plant)!.name
      } ${localizeText("water")} ${cell.waterLevel}. ${localizeText(
        "growth"
      )} ${cell.growthLevel}`;
    } else {
      cellElement!.innerHTML = `${localizeText("cell")} [${cell.rowIndex},${
        cell.colIndex
      }], ${localizeText("no plant")}`;
    }
  }

  applyGameState(state: GameState) {
    game.grid = state.grid.slice(0);
    game.time = state.time;
    flowersHarvested = Array.from(state.harvestedPlants);

    game.weatherCondition = state.currentWeather[0] == 0 ? "sunny" : "rainy";
    game.weatherDegree = state.currentWeather[1];

    notifyChange("stateChanged");
  }

  cloneGrid(): ArrayBuffer {
    return this.grid.slice(0);
  }

  passTime() {
    this.time++;
    this.states.push(this.getCurrentGameState());
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
export function notifyChange(name: string) {
  document.dispatchEvent(new Event(name));
}

//returns true if plant ID corresponds to a weed, false otherwise
function isWeed(plantID: number): boolean {
  return weedTypes.some((plant) => plant.name == plants.get(plantID));
}

//returns the Plant object for a given plant ID
function getPlant(id: number): Plant | undefined {
  const plantName = plants.get(id)!;
  if (plantName) {
    return allPlantTypes.find(
      (plant) => plant.name.toLowerCase() == plantName.toLowerCase()
    );
  } else {
    return undefined;
  }
}

function clonePlant(plant: Plant): Plant {
  return { ...plant };
}

//returns the Plant ID for a given plant name
function getID(plantName: string): number | null {
  for (const [key, value] of plants.entries()) {
    if (value.toLowerCase() === plantName.toLowerCase()) {
      return key;
    }
  }
  return null;
}

//returns the flower index of a given plant ID (flower index of flowersHarvested)
function getFlowerIndex(name: string): number {
  let flowerIndex = -1;
  flowerTypes.forEach((flower, index) => {
    console.log(flower.name.toLowerCase(), name.toLowerCase());
    if (flower.name.toLowerCase() == name.toLowerCase()) flowerIndex = index;
  });
  return flowerIndex;
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
  const plantNames = flowerTypes.map((flower) => flower.name).join(", ");
  const promptText = `What would you like to plant?\nAvailable plants: ${plantNames}`;
  return prompt(promptText) ?? ""; // Prompt the player for the plant name
}

function checkScenario(scenario: Scenario) {
  //update scenario with current game conditions
  scenario.updateCurrentConditions(game.time, flowersHarvested);
  scenario.checkEvents(game);
  //return true or false if victory conditions met
  return scenario.victoryConditionsMet();
}

function parseTranslationsToMap() {
  const tempObjectArr = [
    translations.english,
    translations.japanese,
    translations.vietnamese,
  ];
  const tempStringArr: availableLanguages[] = [
    "english",
    "japanese",
    "vietnamese",
  ];

  for (let i = 0; i < tempObjectArr.length; i++) {
    const localMap = new Map<string, string>();
    Object.entries(tempObjectArr[i]).forEach((phrase) => {
      const [key, text] = phrase;
      localMap.set(key, text);
    });

    languageBase.set(tempStringArr[i], localMap);
  }
}
parseTranslationsToMap();

function localizeText(textKey: string): string {
  return languageBase.get(availableLanguagesList[curLanguage])?.get(textKey)!;
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
      time: gameState.time,
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
        time: gameState.time,
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

function changeLanguage() {
  curLanguage += 1;
  if (curLanguage >= availableLanguagesList.length) {
    curLanguage = 0;
  }
  game.updateUI();
  game.updateCurrentCellUI(farmer.getCurrentCell()!);
}

const languageButton = document.getElementById("languageButton")!;
languageButton.addEventListener("click", () => {
  changeLanguage();
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
            time: encodedState.time,
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
      time: encodedState.time,
      currentWeather: encodedState.currentWeather,
      harvestedPlants: encodedState.harvestedPlants,
    };
  });
  const grid = states[states.length - 1].grid;
  const weatherCondition =
    states[states.length - 1].currentWeather[0] == 0 ? "sunny" : "rainy";
  const weatherDegree = states[states.length - 1].currentWeather[1];
  flowersHarvested = states[states.length - 1].harvestedPlants;
  const currentTime = states[states.length - 1].time;

  game = new Game(
    GAME_SIZE,
    grid,
    currentTime,
    states,
    weatherCondition,
    weatherDegree
  );
} else {
  game = new Game(GAME_SIZE); //not including optional params creates a fresh game
}

let farmer = new Character(gameWidth / 2, gameHeight / 2, []);
drawGame();