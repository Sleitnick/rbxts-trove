interface ConnectionLike {
	Disconnect(this: ConnectionLike): void;
}

interface SignalLike<T extends Callback = Callback> {
	Connect(this: SignalLike, callback: T): RBXScriptConnection;
}

export namespace Trove {
	/**
	 * A type representing an object that a trove can track.
	 */
	export type Trackable =
		| Instance
		| ConnectionLike
		| Promise<unknown>
		| thread
		| ((...args: unknown[]) => unknown)
		| { destroy: () => void }
		| { disconnect: () => void }
		| { Destroy: () => void }
		| { Disconnect: () => void };
}

const FN_MARKER = "__trove_fn_marker__";
const THREAD_MARKER = "__trove_thread_marker__";

interface Track {
	obj: Trove.Trackable;
	cleanup: string;
}

function getObjCleanupFn<T extends Trove.Trackable>(obj: T, cleanupMethod?: string): string {
	const t = typeOf(obj);
	if (t === "function") {
		return FN_MARKER;
	} else if (t === "thread") {
		return THREAD_MARKER;
	}
	if (cleanupMethod !== undefined) {
		return cleanupMethod;
	}
	if (t === "Instance") {
		return "Destroy";
	} else if (t === "RBXScriptConnection") {
		return "Disconnect";
	} else if (t === "table") {
		if ("Destroy" in obj) {
			return "Destroy";
		} else if ("Disconnect" in obj) {
			return "Disconnect";
		} else if ("destroy" in obj) {
			return "destroy";
		} else if ("disconnect" in obj) {
			return "disconnect";
		}
	}
	error(`failed to get cleanup function for object ${typeOf(obj)}: ${tostring(obj)}`, 3);
}

/**
 * A Trove helps track and clean up objects.
 */
export class Trove {
	private objects = new Array<Track>();

	/**
	 * Add an object to the trove.
	 * @param obj Object to add
	 * @param cleanupMethod Optional name of method attached to the object to invoke on cleanup
	 * @returns Same object added
	 */
	public add<T extends Trove.Trackable>(obj: T, cleanupMethod?: string): T {
		const cleanup = getObjCleanupFn(obj, cleanupMethod);
		this.objects.push({ obj, cleanup });
		return obj;
	}

	/**
	 * Adds a promise to the Trove. The trove will call the `cancel()` method of the promise
	 * if the trove is cleaned up.
	 * @param promise The Promise to add
	 * @returns The same Promise
	 */
	public addPromise<T>(promise: Promise<T>): Promise<T> {
		if (promise.getStatus() === Promise.Status.Started) {
			promise.finally(() => {
				this.findAndRemoveFromObjs(promise, false);
			});
			this.add(promise, "cancel");
		}
		return promise;
	}

	/**
	 * Connects to a signal, which adds the connection to the trove.
	 * @param signal The signal to connect
	 * @param handler The function connected to the signal
	 * @returns Connection
	 */
	public connect<T extends Callback>(
		signal: SignalLike<T>,
		handler: (...args: Parameters<T>) => void,
	): ReturnType<typeof signal.Connect> {
		return this.add((signal as SignalLike).Connect(handler));
	}

	/**
	 * Binds the `renderFn` to RenderStep. The function is unbound when the trove is cleaned up.
	 * @param name Name of the RenderStep binding
	 * @param priority Priority (see `Enum.RenderPriority`)
	 * @param renderFn Function to bind
	 */
	public bindToRenderStep(name: string, priority: number, renderFn: (dt: number) => void) {
		game.GetService("RunService").BindToRenderStep(name, priority, renderFn);
		this.add(() => {
			game.GetService("RunService").UnbindFromRenderStep(name);
		});
	}

	/**
	 * Removes an object from the trove and cleans up the object.
	 * @param obj Object to remove
	 * @returns `true` if object was found and removed
	 */
	public remove<T extends Trove.Trackable>(obj: T): boolean {
		return this.findAndRemoveFromObjs(obj, true);
	}

	/**
	 * Clones the given instance and adds the clone to the trove.
	 * @param instance Instance to clone
	 * @returns New cloned instance
	 */
	public clone<T extends Instance>(instance: T): T {
		return this.add(instance.Clone());
	}

	/**
	 * Creates a new trove and adds it to this trove
	 * @returns The created trove
	 */
	public extend(): Trove {
		return this.add(new Trove());
	}

	/**
	 * Attaches the trove to an instance. If the instance is destroyed,
	 * the trove will clean itself up.
	 * @param instance
	 * @returns
	 */
	public attachToInstance(instance: Instance): RBXScriptConnection {
		if (!instance.IsDescendantOf(game)) {
			error("Instance is not a descendant of the game hierarchy", 2);
		}
		return this.add(instance.Destroying.Connect(() => this.destroy()));
	}

	/**
	 * Cleans up all tracked objects in the trove.
	 */
	public clean() {
		this.objects.forEach((obj) => this.cleanupObj(obj));
		this.objects.clear();
	}

	/**
	 * Alias for `clean`.
	 */
	public destroy() {
		this.clean();
	}

	private findAndRemoveFromObjs<T extends Trove.Trackable>(obj: T, cleanup: boolean): boolean {
		const index = this.objects.findIndex((track) => {
			return track.obj === obj;
		});
		if (index !== -1) {
			const track = this.objects[index];
			this.objects.unorderedRemove(index);
			if (cleanup) {
				this.cleanupObj(track);
			}
		}
		return false;
	}

	private cleanupObj(track: Track) {
		if (track.cleanup === FN_MARKER) {
			(track.obj as () => void)();
		} else if (track.cleanup === THREAD_MARKER) {
			task.cancel(track.obj as thread);
		} else {
			(track.obj as Record<string, (self: unknown) => void>)[track.cleanup](track.obj);
		}
	}
}
