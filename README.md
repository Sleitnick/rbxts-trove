# Trove

A Maid-like pattern for tracking and cleaning up objects.

## Constructor

```ts
const trove = new Trove();
```

### `Trove.Trackable`
The following type describes the objects that Trove can track.
```ts
type Trackable =
		| Instance
		| RBXScriptConnection
		| thread
		| ((...args: unknown[]) => unknown)
		| { destroy: () => void }
		| { disconnect: () => void }
		| { Destroy: () => void }
		| { Disconnect: () => void };
```

### `Trove.add`
```ts
public add<T extends Trove.Trackable>(obj: T, cleanupMethod?: string): T
```
Add an item into the trove to be tracked.

### `Trove.clean` / `Trove.destroy`
```ts
public clean(): void
public destroy(): void // alias to clean
```
Cleans up the trove. All tracked objects will be cleaned up and removed from the trove.

### `Trove.remove`
```ts
public remove<T extends Trove.Trackable>(obj: T): boolean
```
Removes and cleans up the given object from the trove. Will
return `true` if the object was found and cleaned up.

### `Trove.connect`
```ts
public connect(signal: RBXScriptSignal, fn: (...args: unknown[]) => void): RBXScriptConnection
```
Connects to a signal. Shorthand for `trove.add(signal.Connect(fn))`. Returns the connection.

### `Trove.construct`
```ts
public construct<T extends Trove.Trackable>(cls: new (...args: unknown[]) => T, ...args: unknown[]): T
```
Constructs a new object and adds it to the trove. Shorthand for `trove.add(new Item())`.

### `Trove.clone`
```ts
public clone<T extends Instance>(instance: T): T
```
Clones an instance and adds it to the clone. Shorthand for `trove.add(instance:Clone())`.

### `Trove.extend`
```ts
public extend(): Trove
```
Constructs a new trove and adds it to the current trove. Shorthand for `trove:Add(new Trove())`.

### `Trove.attachToInstance`
```ts
public attachToInstance(instance: Instance): RBXScriptConnection
```
Attaches the trove to the given instance. Once the instance is destroyed (using the `instance.Destroying` event internally), the trove will destroy itself.
