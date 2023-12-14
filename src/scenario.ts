import { Game } from "./main";

interface Event {
  time: number;
  name: string;
  row: number;
  col: number;
  complete: boolean;
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
  private current_time: number;

  constructor(jsonScenario: JSONScenario) {
    this.events_schedule = jsonScenario.events_schedule;
    this.starting_conditions = jsonScenario.starting_conditions;
    this.victory_conditions = jsonScenario.victory_conditions;
    this.current_harvest = [];
    this.current_time = 0;
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

  // checks event schedule for ready events and then activates them
  public checkEvents(game: Game) {
    for (const event of this.events_schedule) {
      if (!event.complete && this.current_time == event.time) {
        game.activateEvent(event.name, event.row, event.col);
        event.complete = true;
      }
    }
  }

  public updateCurrentConditions(
    time: number,
    plantsHarvested: number[]
  ): void {
    plantsHarvested.forEach(
      (value, index) => (this.current_harvest[index] = value)
    );
    this.current_time = time;
    console.log(
      "updated current conditions: time: ",
      time,
      " plants harvested: ",
      plantsHarvested
    );
  }

  public victoryConditionsMet(): boolean {
    return this.victory_conditions.harvest_goal.every(
      (value, index) => value <= this.current_harvest[index]
    );
  }
}
