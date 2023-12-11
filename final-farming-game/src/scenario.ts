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
  starting_conditions: number[];
  victory_conditions: VictoryConditions;
}

export class Scenario {
  private events_schedule: Event[];
  private starting_conditions: number[];
  private victory_conditions: VictoryConditions;
  private current_harvest: number[];

  constructor(jsonScenario: JSONScenario) {
    this.events_schedule = jsonScenario.events_schedule;
    this.starting_conditions = jsonScenario.starting_conditions;
    this.victory_conditions = jsonScenario.victory_conditions;
    this.current_harvest = [];
  }

  public getEventsSchedule(): Event[] {
    return this.events_schedule;
  }

  public getVictoryConditions(): number[] {
    return this.victory_conditions.harvest_goal;
  }

  public getStartingConditions(): number[] {
    return this.starting_conditions;
  }

  public updateCurrentConditions(plantsHarvested: number[]): void {
    plantsHarvested.forEach(
      (value, index) => (this.current_harvest[index] = value)
    );
  }

  public victoryConditionsMet(): boolean {
    return this.victory_conditions.harvest_goal.every(
      (value, index) => value <= this.current_harvest[index]
    );
  }
}
