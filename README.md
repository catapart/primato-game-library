# Primato Game Library
A collection of objects and utility functions for organizing and managing common functionality used in games, written in Typescript.

## Quick Start

## Example

### Is this a framework?
Not really. It's just a bunch of objects and classes that are familiar to game developers. It's more like one part of a framework. Primato mainly deals with logical abstractions. Where a framework would take those logical abstractions and use them with a renderer to make those concepts visible, Primato doesn't have a renderer. It expects you to already have a method of rendering in mind, that you want to use Primato to leverage.

### So why doesn't it have a renderer?
Mostly for modularity, but partly because I don't mind the web-native rendering solutions. The `canvas` tag, and its 2D rendering context is "slow" compared to performance that can be achieved with native solutions; that's for certain. But I've had no problem running a 60fps game loop on a fairly modest graphics card for modern sensibilities (GTX 1070, circa 2016), nor when I'm running on my same-era laptop with no dedicated graphics card.

Since the final image will always need to be a 2D rectangle, I find the canvas works just fine as a render target. And since this is the web, there is a plethora of libraries that can render beautiful images to the canvas. So this library only really needs to facilitate currying the data so that the renderer - whichever one is most convenient or fits best with your project - can act efficiently on it.

### Wouldn't it be better to just use a lower-level language, then?
Yes! I mean, probably, at least!

If the game you plan on making has any kind of performance bottleneck, you should really consider the benefits of moving your game logic into the more performant domain of native instructions.  
Of course, there is a large development cost to traversing the domains, like that, and there's at least some runtime cost to doing it, as well. A clean architechture would use a `SharedArrayBuffer` to hold the bytes of the final render data so that the backend could write to it while the front end could read from it. It's not... simple, is all I'm trying to say.

On the other hand, if your game does *not* have a performance bottleneck, you can often run the whole thing at a performant speed using just javascript. And in those cases, this library aims to provide functionality and abstraction, without locking you in to any kind of developmental paradigm.