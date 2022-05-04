# Trove

A Maid-like pattern for tracking and cleaning up objects.

## API

### Constructor
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

## Example

```ts
class MyClass {
	private trove = new Trove();

	constructor() {

		// Add folder:
		const folder = this.trove.add(new Instance("Folder"));

		// Add function:
		this.trove.add(() => {
			print("Cleanup");
		});
		
		// Add event:
		this.trove.add(Workspace.Changed.Connect((property: string) => {
			print(`${property} changed`);
		}));

		// Add another trove:
		const nestedTrove = this.trove.extend();

		// Add another folder (note: doesn't have to be an instance already in trove):
		const anotherFolder = this.trove.clone(folder);

		// Remove the above folder (which also destroys it):
		this.trove.remove(anotherFolder);

	}

	public destroy() {
		this.trove.destroy();
	}
}
```
