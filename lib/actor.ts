import { Accessory } from "./accessory";
import { Fixture } from "./fixture";

export abstract class Actor
{
    // entity: Entity;

    // actors
    // accessories
    // fixtures

    constructor()
    {
        
    }

    update(deltaTime: number)
    {
        if(this.onUpdate != null)
        {
            this.onUpdate(deltaTime);
        }
    }

    abstract onUpdate(deltaTime: number): void;
    // onFixedUpdate
    abstract onRender(canvas?: HTMLCanvasElement, context?: CanvasRenderingContext2D): void;

    onAccessoryAdded?(accessory: Accessory): void;
    onActorAdded?(accessory: Actor): void;
    onFixtureAdded?(accessory: Fixture): void;

    // add actor
    // get actor
    // destroy actor

    // add fixture
    // get fixture
    // remove fixture
}