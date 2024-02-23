/** 
 * An actor within an Entity Component System, identified by a `number`.  
 * Can be used to look up associated components.
 */
export type Entity = number;

/**
 * A generic package for state data.  
 * A `Component` must be associated with a single `Entity`.
 */
export abstract class Component {}

/**
 * Runs an update once per game update, acting on any target `Component` types.  
 * 'Universal' `Systems` (`Systems` that run on every type of `Component`) are not supported by MagnitECS
 */
export abstract class System
{
    /**
     * Define the `Component` types that you want this `System` to act on.
     */
    public abstract targetComponentTypes: Set<Function>;

    /**
     * Require an `Entity` to have every target `Component` type in order for this `System` to act on it. 
     */
    public requireAllComponentTypes: boolean = false;

    public abstract update(entities: Set<Entity>, tickDelta?: number): void;

    // ECS API for ease of access;
    // should never need to call into the `ecs` object

    /**
     * Adds a new `Entity`.
     * @returns An `Entity` registered with the ECS
     */
    addEntity = () => this.ecs.addEntity();

    getEntities = () => this.ecs.getEntities(this);
    
    /**
     * Removes `Entity` at the end of the next update.
     * @param entity The `Entity` to remove.
     */
    removeEntity = (entity: Entity) => this.ecs.removeEntity(entity);
    
    /**
     * Removes `Entity` immediately.  
     * May cause race condition issues.
     * @param entity The `Entity` to remove.
     */
    removeEntity_Immediate = (entity: Entity) => this.ecs.removeEntity_Immediate(entity);
    
    /**
     * Adds a `Component` to an `Entity`.
     * @param entity The `Entity` to add the `Component` to.
     * @param component The `Component` to add.
     */
    addComponent = (entity: Entity, component: Component) => this.ecs.addComponent(entity, component);

    /**
     * Get all `Components` assigned to a target `Entity`.
     * @param entity The `Entity` to collect `Components` from.
     * @returns A `ComponentContainer` collection which can be queried with its methods.
     */
    getComponents = (entity: Entity) => this.ecs.getComponents(entity);

    /**
     * Remove a `Component` from an `Entity`
     * @param entity The `Entity` to remove the `Component` from.
     * @param componentClass The `Component` to be removed.
     */
    removeComponent = (entity: Entity, componentClass: Function) => this.ecs.removeComponent(entity, componentClass);

    // can't think of why one system should be able to modify others?
    // addSystem = (system: System) => this.ecs.addSystem(system);
    // removeSystem = (system: System) => this.ecs.removeSystem(system);

    // End ECS API

    /**
     * Reference to the Parent ECS for CRUD functionality.
     */
    ecs!: PrimatoECS;
    // public because it is initialized by the ECS, rather than the constructor.
    // public access also allows debugging.
    // otherwise, meant to be private. Would be a friend property, if
    // typescript did that kind of thing
}

export type ComponentClass<T extends Component> = new (...args: any[]) => T;

export class ComponentContainer
{
    #map = new Map<Function,Component>();

    add(component: Component)
    {
        this.#map.set(component.constructor, component);
    }
    get<T extends Component>(componentClass: ComponentClass<T>)
    {
        return this.#map.get(componentClass) as T;
    }
    has(componentClass: Function)
    {
        return this.#map.has(componentClass);
    }
    hasAll(componentClasses: Iterable<Function>)
    {
        for(let componentClass of componentClasses)
        {
            if(!this.#map.has(componentClass))
            {
                return false;
            }
        }
        return true;
    }
    remove(componentClass: Function)
    {
        this.#map.delete(componentClass);
    }
}

export class PrimatoECS
{

    #entities = new Map<Entity, ComponentContainer>();
    #systems = new Map<System, Set<Entity>>();

    #nextEntityId = 0;
    #entitiesToDestroy = new Array<Entity>();

    /**
     * Adds a new `Entity`.
     * @returns An `Entity` registered with the ECS
     */
    addEntity()
    {
        const entity = this.#nextEntityId;
        this.#nextEntityId++;
        this.#entities.set(entity, new ComponentContainer());
        return entity;
    }

    getEntities(system: System)
    {
        return this.#systems.get(system);
    }

    /**
     * Removes `Entity` at the end of the next update.
     * @param entity The `Entity` to remove.
     */
    removeEntity(entity: Entity)
    {
        this.#entitiesToDestroy.push(entity);
    }

    /**
     * Removes `Entity` immediately.  
     * May cause race condition issues.
     * @param entity The `Entity` to remove.
     */
    removeEntity_Immediate(entity: Entity)
    {
        this.#entities.delete(entity);
    }

    /**
     * Adds a `Component` to an `Entity`.
     * @param entity The `Entity` to add the `Component` to.
     * @param component The `Component` to add.
     */
    addComponent(entity: Entity, component: Component)
    {
        this.#entities.get(entity)?.add(component);
        this.#refreshEntityRegistration(entity);
    }

    /**
     * Get all `Components` assigned to a target `Entity`.
     * @param entity The `Entity` to collect `Components` from.
     * @returns A `ComponentContainer` collection which can be queried with its methods.
     */
    getComponents(entity: Entity)
    {
        return this.#entities.get(entity);
    }

    /**
     * Remove a `Component` from an `Entity`
     * @param entity The `Entity` to remove the `Component` from.
     * @param componentClass The `Component` to be removed.
     */
    removeComponent(entity: Entity, componentClass: Function)
    {
        this.#entities.get(entity)?.remove(componentClass);
        this.#refreshEntityRegistration(entity);
    }

    /**
     * Adds a `System` to the ECS.
     * @param system The `System` to add to the ECS
     */
    addSystem(system: System)
    {
        if(system.targetComponentTypes.size == 0)
        {
            throw new Error("Can not add system with no `targetComponentTypes` set. (Systems that run on every type of Component are not supported by MagnitECS, unless every Component type is manually added to that System)")
        }

        system.ecs = this;

        this.#systems.set(system, new Set());
        for(const entity of this.#entities.keys())
        {
            this.#refreshEntitySystemRegistration(entity, system);
        }
    }
    /**
     * Removes a `System` from the ECS
     * @param system The `System` to remove from the ECS.
     */
    removeSystem(system: System)
    {
        this.#systems.delete(system);
    }

    /**
     * Updates the ECS and then destroys all `Entities` that were marked for removal on or before that update.  
     * Meant to be called once per 'tick'.
     */
    update(tickDelta?: number)
    {
        for(const [system, entities] of this.#systems.entries())
        {
            system.update(entities, tickDelta);
        }

        for(let i = 0; i < this.#entitiesToDestroy.length; i++)
        {
            this.#destroyEntity(this.#entitiesToDestroy[i]);
        }
    }

    /**
     * `@private`  
     * Internal method to delete 'removed' `Entities` from the ECS and all referencing `Systems`.
     * @param entity The `Entity` to delete from the map
     */
    #destroyEntity(entity: Entity)
    {
        this.#entities.delete(entity);
        for(const entities of this.#systems.values())
        {
            entities.delete(entity);
        }
    }

    /**
     * `@private`  
     * Adds or Removes an `Entity` from any `Systems` that affect the `Entity`'s `Components`.
     * @param entity The `Entity` to refresh.
     */
    #refreshEntityRegistration(entity: Entity)
    {
        for(const system of this.#systems.keys())
        {
            this.#refreshEntitySystemRegistration(entity, system);
        }
    }

    /**
     * `@private`  
     * Adds or Removes an `Entity` from a `System`, depending upon whether the `System` affects that `Entity`'s `Components`.
     * @param entity The `System` to Add or Remove the `Entity` from.
     * @param system The `Entity` to refresh.
     */
    #refreshEntitySystemRegistration(entity: Entity, system: System)
    {
        const entityComponents = this.#entities.get(entity);
        const systemTargetComponents = system.targetComponentTypes;
        if(system.requireAllComponentTypes && entityComponents?.hasAll(systemTargetComponents))
        {
            this.#systems.get(system)?.add(entity);
        }
        else
        {
            //todo: this should be possible with a set function instead of a loop, soon

            let componentFound = false;
            for(const component of systemTargetComponents.values())
            {
                if(entityComponents?.has(component))
                {
                    this.#systems.get(system)?.add(entity);
                    componentFound = true;
                    break;
                }
            }

            if(!componentFound)
            {
                this.#systems.get(system)?.delete(entity);
            }
        }
    }
}

// library adapted from Maxwell Forbes' blog posts: https://maxwellforbes.com/posts/typescript-ecs-what/