import { Plant } from "./main.ts";

interface PlantCommand {
  addTo(plantTypes: Plant[][]): void;
}

class FlowerCommand implements PlantCommand {
  constructor(
    public name: string,
    public color: string,
    public sunRequisite: number,
    public waterRequisite: number,
    public vibeRequisite: number
  ) {}

  addTo(plantTypes: Plant[][]): void {
    plantTypes[0].push({
      name: this.name,
      color: this.color,
      sunRequisite: this.sunRequisite,
      waterRequisite: this.waterRequisite,
      vibeRequisite: this.vibeRequisite,
    });
  }
}

class WeedCommand implements PlantCommand {
  constructor(public name: string, public color: string) {}

  addTo(plantTypes: Plant[][]): void {
    plantTypes[1].push({
      name: this.name,
      color: this.color,
      sunRequisite: 0,
      waterRequisite: 0,
      vibeRequisite: 0,
    });
  }
}

class CommandFactory {
  static makeCommand(tokens: string[]): PlantCommand | null {
    const commandName = tokens[0].toLowerCase();
    try {
      switch (commandName) {
        case "flower":
          if (tokens.length == 6) {
            const name = tokens[1];
            const color = tokens[2];
            const sunReq = parseInt(tokens[3]);
            const waterReq = parseInt(tokens[4]);
            const vibeReq = parseInt(tokens[5]);
            return new FlowerCommand(name, color, sunReq, waterReq, vibeReq);
          } else {
            throw Error(
              "Invalid Plant Command: USAGE: flower [name] [color] [sunReq] [waterReq] [vibeReq]"
            );
          }

        case "weed":
          if (tokens.length == 3) {
            const name = tokens[1];
            const color = tokens[2];
            return new WeedCommand(name, color);
          } else {
            throw Error("Invalid Weed Command: USAGE: weed [name] [color]");
          }
        default:
          throw Error(`Invalid Command. Available commands: flower, weed`);
      }
    } catch (error) {
      console.log(error);
      return null;
    }
  }
}

//
function getPlantTypes(dslCode: string): Plant[][] {
  const plantCommands: PlantCommand[] = [];
  const lines = dslCode.split("\n");

  for (const line of lines) {
    const tokens = line.trim().split(" ");
    const plantDef = CommandFactory.makeCommand(tokens);
    if (plantDef) {
      plantCommands.push(plantDef);
    }
  }

  const plants: Plant[][] = [[], []];
  for (const plantDef of plantCommands) {
    plantDef.addTo(plants);
  }

  return plants;
}

//------------------------------------------------------------------------------------------------------

// Example usage:
// plant [name] [color] [sunReq] [waterReq] [vibeReq: 0-> none, 1->requires alone, 2->requires friends, 3->requires family]
// weed [name] [color] -> [persistence (1-10)] <- this last one not implemented yet
const dslCode = `flower Sunflower yellow 3 2 0
flower Rose pink 2 3 0
flower Daffodil #FFD700 3 2 0
flower Lily #FFFFFF 2 3 0
flower Marigold #FFA500 4 2 0
flower Fuchsia #FF00FF 3 3 0
weed crabgrass green`;

export const flowerTypes: Plant[] = getPlantTypes(dslCode)[0];
export const weedTypes: Plant[] = getPlantTypes(dslCode)[1];
