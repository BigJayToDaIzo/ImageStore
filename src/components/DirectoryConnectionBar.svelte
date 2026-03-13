<script lang="ts">
	import { pickDirectory, persistHandle, reconnectHandle } from '$lib/store/fs-handles.js';

	type DirState = 'disconnected' | 'reconnecting' | 'connected' | 'error';

	interface HandleInfo {
		handle: FileSystemDirectoryHandle | null;
		name: string;
	}

	let {
		onSourceConnected,
		onDestConnected,
	}: {
		onSourceConnected: (h: FileSystemDirectoryHandle) => void;
		onDestConnected: (h: FileSystemDirectoryHandle) => void;
	} = $props();

	let sourceState = $state<DirState>('disconnected');
	let destState = $state<DirState>('disconnected');
	let sourceInfo = $state<HandleInfo>({ handle: null, name: '' });
	let destInfo = $state<HandleInfo>({ handle: null, name: '' });
	let sourceError = $state('');
	let destError = $state('');

	export function setSourceConnected(handle: FileSystemDirectoryHandle) {
		sourceInfo = { handle, name: handle.name };
		sourceState = 'connected';
		sourceError = '';
	}

	// Stored handle names (from IDB, before permission granted)
	let storedSourceName = $state('');
	let storedDestName = $state('');

	$effect(() => {
		tryReconnect('source');
		tryReconnect('destination');
	});

	async function tryReconnect(key: 'source' | 'destination') {
		const isSource = key === 'source';
		if (isSource) {
			sourceState = 'reconnecting';
		} else {
			destState = 'reconnecting';
		}

		try {
			const handle = await reconnectHandle(key);
			if (handle) {
				if (isSource) {
					sourceInfo = { handle, name: handle.name };
					sourceState = 'connected';
					onSourceConnected(handle);
				} else {
					destInfo = { handle, name: handle.name };
					destState = 'connected';
					onDestConnected(handle);
				}
			} else {
				if (isSource) {
					sourceState = 'disconnected';
				} else {
					destState = 'disconnected';
				}
			}
		} catch {
			if (isSource) {
				sourceState = 'error';
				sourceError = 'Failed to reconnect';
			} else {
				destState = 'error';
				destError = 'Failed to reconnect';
			}
		}
	}

	async function pick(key: 'source' | 'destination') {
		const isSource = key === 'source';
		try {
			const handle = await pickDirectory();
			await persistHandle(key, handle);

			if (isSource) {
				sourceInfo = { handle, name: handle.name };
				sourceState = 'connected';
				sourceError = '';
				onSourceConnected(handle);
			} else {
				destInfo = { handle, name: handle.name };
				destState = 'connected';
				destError = '';
				onDestConnected(handle);
			}
		} catch (err) {
			if (err instanceof DOMException && err.name === 'AbortError') return;
			if (isSource) {
				sourceState = 'error';
				sourceError = err instanceof Error ? err.message : 'Failed to pick directory';
			} else {
				destState = 'error';
				destError = err instanceof Error ? err.message : 'Failed to pick directory';
			}
		}
	}
</script>

<div class="connection-bar">
	<div class="dir-slot">
		<span class="dir-label">Source</span>
		{#if sourceState === 'connected'}
			<span class="dir-indicator connected"></span>
			<span class="dir-name" title={sourceInfo.name}>{sourceInfo.name}</span>
			<button class="dir-btn change" onclick={() => pick('source')}>Change</button>
		{:else if sourceState === 'reconnecting'}
			<span class="dir-indicator reconnecting"></span>
			<span class="dir-status">Reconnecting...</span>
		{:else if sourceState === 'error'}
			<span class="dir-indicator error"></span>
			<span class="dir-status error-text">{sourceError}</span>
			<button class="dir-btn" onclick={() => pick('source')}>Pick Again</button>
		{:else}
			<button class="dir-btn" onclick={() => pick('source')}>Pick Source Directory</button>
		{/if}
	</div>

	<div class="dir-slot">
		<span class="dir-label">Destination</span>
		{#if destState === 'connected'}
			<span class="dir-indicator connected"></span>
			<span class="dir-name" title={destInfo.name}>{destInfo.name}</span>
			<button class="dir-btn change" onclick={() => pick('destination')}>Change</button>
		{:else if destState === 'reconnecting'}
			<span class="dir-indicator reconnecting"></span>
			<span class="dir-status">Reconnecting...</span>
		{:else if destState === 'error'}
			<span class="dir-indicator error"></span>
			<span class="dir-status error-text">{destError}</span>
			<button class="dir-btn" onclick={() => pick('destination')}>Pick Again</button>
		{:else}
			<button class="dir-btn" onclick={() => pick('destination')}>Pick Destination Directory</button>
		{/if}
	</div>
</div>

<style>
	.connection-bar {
		display: flex;
		gap: 1.5rem;
		padding: 0.5rem 1rem;
		background: #1f2937;
		color: #e5e7eb;
		font-size: 0.8125rem;
		align-items: center;
		flex-shrink: 0;
	}

	.dir-slot {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.dir-label {
		font-weight: 600;
		color: #9ca3af;
		text-transform: uppercase;
		font-size: 0.6875rem;
		letter-spacing: 0.05em;
	}

	.dir-indicator {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.dir-indicator.connected {
		background: #22c55e;
	}

	.dir-indicator.reconnecting {
		background: #eab308;
		animation: pulse 1s infinite;
	}

	.dir-indicator.error {
		background: #ef4444;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}

	.dir-name {
		color: #e5e7eb;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
		max-width: 200px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.dir-status {
		color: #9ca3af;
	}

	.error-text {
		color: #fca5a5;
	}

	.dir-btn {
		padding: 0.25rem 0.5rem;
		background: #374151;
		border: 1px solid #4b5563;
		border-radius: 3px;
		color: #e5e7eb;
		font-size: 0.75rem;
		cursor: pointer;
	}

	.dir-btn:hover {
		background: #4b5563;
	}

	.dir-btn.change {
		background: transparent;
		border-color: #6b7280;
		color: #9ca3af;
	}

	.dir-btn.change:hover {
		color: #e5e7eb;
		border-color: #9ca3af;
	}
</style>
