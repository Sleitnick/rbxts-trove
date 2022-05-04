export namespace Trove {
	export type Trackable =
		| Instance
		| RBXScriptConnection
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

export class Trove {
	private objects = new Array<Track>();

	public add<T extends Trove.Trackable>(obj: T, cleanupMethod?: string): T {
		const cleanup = getObjCleanupFn(obj, cleanupMethod);
		this.objects.push({ obj, cleanup });
		return obj;
	}

	public remove<T extends Trove.Trackable>(obj: T): boolean {
		return this.findAndRemoveFromObjs(obj, true);
	}

	public clone<T extends Instance>(instance: T): T {
		return this.add(instance.Clone());
	}

	public extend(): Trove {
		return this.add(new Trove());
	}

	public attachToInstance(instance: Instance): RBXScriptConnection {
		if (!instance.IsDescendantOf(game)) {
			error("Instance is not a descendant of the game hierarchy", 2);
		}
		return this.add(instance.Destroying.Connect(() => this.destroy()));
	}

	public clean() {
		this.objects.forEach((obj) => this.cleanupObj(obj));
		this.objects.clear();
	}

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
