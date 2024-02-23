import { Actor } from "../actor";
import { ActorComponent } from "../components/actor.component";
import { AccessoryComponent } from "../components/accessory.component";
import { Entity, System } from "../entity-component-system";

export class SceneSystem extends System
{
    public targetComponentTypes: Set<Function>;

    entityActors: Map<Entity, Actor> = new Map();

    constructor()
    {
        super();
        this.targetComponentTypes = new Set([ActorComponent, AccessoryComponent]);
    }

    public update(entities: Set<number>, deltaTime: number): void 
    {
        for(const entity of entities.values())
        {
            const components = this.getComponents(entity);
            if(components == null) { continue; }

            if(components.has(ActorComponent))
            {   
                const entityActor = this.entityActors.get(entity);
                if(entityActor == null) { continue; }

                // run actor update functions
                entityActor.update(deltaTime);
            }
            else if(components.has(AccessoryComponent))
            {

            }

        }
    }

    render(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D)
    {
        const entities = this.getEntities();
        if(entities == null) { return; }

        for(const entity of entities.values())
        {
            const components = this.getComponents(entity);
            if(components == null) { continue; }
            if(components.has(ActorComponent))
            { 
                const entityActor = this.entityActors.get(entity);
                if(entityActor == null || entityActor.onRender == null) { continue; }
                entityActor.onRender(canvas, context);
            }
            else if(components.has(AccessoryComponent))
            {
                
            }
        }
    }    
}