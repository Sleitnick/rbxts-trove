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
	| ConnectionLike
	| Promise<unknown>
	| thread
	| ((...args: unknown[]) => unknown)
	| { destroy: () => void }
	| { disconnect: () => void }
	| { Destroy: () => void }
	| { Disconnect: () => void };
```

### `Trove.add`
```ts
add<T extends Trove.Trackable>(
	obj: T,
	cleanupMethod?: string,
): T
```
Add an item into the trove to be tracked.

### `Trove.clean` / `Trove.destroy`
```ts
clean(): void
destroy(): void // alias to clean
```
Cleans up the trove. All tracked objects will be cleaned up and removed from the trove.

### `Trove.remove`
```ts
remove<T extends Trove.Trackable>(
	obj: T,
): boolean
```
Removes and cleans up the given object from the trove. Will
return `true` if the object was found and cleaned up.

### `Trove.connect`
```ts
connect<T extends Callback = Callback>(
	signal: SignalLike<T>,
	fn: (...args: Parameters<T>) => void,
): ReturnType<typeof signal.Connect>
```
Connects to a signal. Shorthand for `trove.add(signal.Connect(fn))`. Returns the connection.

### `Trove.addPromise`
```ts
addPromise<T>(promise: Promise<T>): Promise<T>
```
Adds the given promise to the trove. If the trove is cleaned up, the promise's `cancel()` method will be called. The returned promise is the same one passed to the function.

### `Trove.bindToRenderStep`
```ts
bindToRenderStep(
	name: string,
	priority: number,
	renderFn: (dt: number) => void,
): void
```
Binds the `renderFn` to RenderStep. The function is unbound when the trove is cleaned up.

### `Trove.clone`
```ts
clone<T extends Instance>(
	instance: T,
): T
```
Clones an instance and adds it to the clone. Shorthand for `trove.add(instance:Clone())`.

### `Trove.extend`
```ts
extend(): Trove
```
Constructs a new trove and adds it to the current trove. Shorthand for `trove:Add(new Trove())`.

### `Trove.attachToInstance`
```ts
attachToInstance(
	instance: Instance,
): RBXScriptConnection
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
		this.trove.connect(Workspace.ChildAdded, (child) => {
			print(`${child} added to Workspace`);
		});

		// Add RenderStep binding:
		this.trove.bindToRenderStep("Hello", Enum.RenderPriority.First.Value, (dt) => {
			// Do something
		});

		// Add promise:
		this.trove.addPromise(new Promise(resolve, reject, onCancel) => {
			// Trove will cancel a promise if it is still in-flight when the trove is cleaned up
			onCancel(() => print("Cancelled!"));
			task.wait(5);
			resolve();
		});

		// Add another trove. This creates a new trove and puts the new one into the current one.
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
