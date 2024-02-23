import { Actor } from "./actor";
import { ActorComponent } from "./components/actor.component";
import { Entity, PrimatoECS } from "./entity-component-system";
import { GameAsset } from "./game-asset";
import { SceneSystem } from "./systems/scene.system";

export type SceneConfig = 
{
    ecs?: PrimatoECS,
    canvas?: HTMLCanvasElement
};

export const DefaultSceneConfig: SceneConfig = 
{

}
export class Scene
{
    ecs: PrimatoECS;
    entity: Entity;
    system: SceneSystem;

    // components
    // fixtures

    canvas: HTMLCanvasElement;
    canvasContext: CanvasRenderingContext2D;

    hasFinishedLoading: boolean = false;

    #assets: Set<GameAsset> = new Set();

    constructor(config?: SceneConfig)
    {
        this.ecs = config?.ecs ?? new PrimatoECS();
        this.entity = this.ecs.addEntity();
        this.system = new SceneSystem();
        this.ecs.addSystem(this.system);

        this.canvas = config?.canvas ?? document.createElement('canvas');
        this.canvasContext = this.canvas.getContext('2d')!;
    }

    addActor(actor: Actor)
    {
        const entity = this.ecs.addEntity();
        
        this.ecs.addComponent(entity, new ActorComponent());

        // const propertiesComponent = new ActorPropertiesComponent();
        // Object.assign(propertiesComponent, SceneSystem.flattenObject(actor));
        // this.ecs.addComponent(entity, propertiesComponent);

        this.system.entityActors.set(entity, actor);

        // console.log(this.ecs.getComponents(entity));

        // todo: get all actor's child objects; actors, accessories, and fixtures
        // todo: add all assets to assets set

        actor.onActorAdded = () =>
        {

        }
        actor.onAccessoryAdded = () =>
        {

        }
        actor.onFixtureAdded = () =>
        {

        }

        return entity;
    }
    getActor<T extends Actor>(actorId: number)
    {
        return this.system.entityActors.get(actorId) as T;
    }
    destroyActor(actorId: number)
    {
        this.system.entityActors.delete(actorId);
        this.ecs.removeEntity(actorId);
    }

    // add fixture
    // get fixture
    // remove fixture

    loadingPromise?: Promise<void>;
    onLoadProgress?: (current: number, total: number) => void;
    async load()
    {
        this.hasFinishedLoading = false;

        this.loadingPromise = new Promise(async (resolve, reject) =>
        {
            let assetsLoaded = 0;
            const promises = [];
            for(const asset of this.#assets.values())
            {
                promises.push(asset.load().then(() =>
                {
                    assetsLoaded++;
                    if(this.onLoadProgress != null)
                    {
                        this.onLoadProgress(assetsLoaded, this.#assets.size);
                    }
                }));
            }

            const values = await Promise.allSettled(promises);
            if(values.every(item => (item as any).reason == null))
            {
                resolve();
            }
            else
            {
                reject();
            }
        });

        await this.loadingPromise;
        this.loadingPromise = undefined;
        this.hasFinishedLoading = true;
    }

    update(deltaTime: number)
    {
        this.ecs.update(deltaTime);
    }
    render()
    {
        this.system.render(this.canvas, this.canvasContext);
    }
}