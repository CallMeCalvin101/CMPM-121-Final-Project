import scenario from "./scenarios.json";

interface Event {
  time: number;
  name: string;
  row: number;
  col: number;
}

interface VictoryConditions {
  harvest_goal: number[];
}

interface JSONScenario {
  events_schedule: Event[];
  victory_conditions: VictoryConditions;
}

export class Scenario {
  private events_schedule: Event[];
  private victory_conditions: VictoryConditions;
  private current_conditions: number[];

  constructor(jsonScenario: JSONScenario) {
    this.events_schedule = jsonScenario.events_schedule;
    this.victory_conditions = jsonScenario.victory_conditions;
    this.current_conditions = [];
  }

  public getEventsSchedule(): Event[] {
    return this.events_schedule;
  }

  public getVictoryConditions(): VictoryConditions {
    return this.victory_conditions;
  }

  public updateCurrentConditions(plantsHarvested: number[]): void {
    plantsHarvested.forEach(
      (value, index) => (this.current_conditions[index] = value)
    );
    console.log("updated scenario: ", this.current_conditions);
  }

  public victoryConditionsMet(): boolean {
    return this.victory_conditions.harvest_goal.every(
      (value, index) => value <= this.current_conditions[index]
    );
  }
}

//test
const testScenario: Scenario = new Scenario(scenario as JSONScenario);
console.log(testScenario);
