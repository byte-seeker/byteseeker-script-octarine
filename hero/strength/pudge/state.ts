import { TickSleeper } from "github.com/octarine-public/wrapper/index";
import { EnemyTracker } from "./types";

export const PudgeState = new (class {
  public readonly sleeper = new TickSleeper();
  public readonly rotSleeper = new TickSleeper();
  public readonly dismemberSleeper = new TickSleeper();
  public readonly farmSleeper = new TickSleeper();
  public readonly autoKsSleeper = new TickSleeper();
  public readonly autoHookSleeper = new TickSleeper();
  
  public wasRotTurnedOnByFarm = false;
  public wasRotTurnedOnByCombo = false;

  public readonly trackerMap = new Map<number, EnemyTracker>();

  public onGameEnded(): void {
    this.sleeper.Sleep(0);
    this.autoHookSleeper.Sleep(0);
    this.rotSleeper.Sleep(0);
    this.trackerMap.clear();
    this.farmSleeper.Sleep(0);
    this.autoKsSleeper.Sleep(0);
    this.dismemberSleeper.Sleep(0);
    
    this.wasRotTurnedOnByFarm = false;
    this.wasRotTurnedOnByCombo = false;
  }
})();
