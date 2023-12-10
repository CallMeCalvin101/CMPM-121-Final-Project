/* Created by Vincent Kurniadjaja
 * Use: create a new Scenerio class with a given item to check
 * (as a string) and target number to reach. Scenario will handle
 * holding the current score and can check to see if target is met
 */

export class Scenario {
  constructor(
    readonly condition: string,
    readonly targetVal: number,
    private currentVal: number = 0
  ) {}

  checkCondition(input: string): boolean {
    return input == this.condition;
  }

  increaseVal(num: number) {
    this.currentVal += num;
  }

  checkTargetMet(): boolean {
    return this.currentVal >= this.targetVal;
  }
}

// json-scenario.ts
interface Event {
  time: number;
  event: string;
  target_cell: {
    row: number;
    col: number;
  };
  destruction_radius: number;
}

interface VictoryConditions {
  harvest_goal: {
    rose: number;
    lily: number;
  };
}

export class JSONScenario {
  private eventsSchedule: Event[];
  private victoryConditions: VictoryConditions;

  constructor(json: string) {
    const data = JSON.parse(json);
    this.eventsSchedule = data.events_schedule;
    this.victoryConditions = data.victory_conditions;
  }

  public getEventsSchedule(): Event[] {
    return this.eventsSchedule;
  }

  public getVictoryConditions(): VictoryConditions {
    return this.victoryConditions;
  }
}
