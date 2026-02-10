<script>
	let { show, path, entries, mode, onCancel, onNavigateToParent, onSelectEntry, onConfirm } = $props();
</script>

{#if show}
	<div class="modal-overlay" onclick={onCancel}>
		<div class="modal file-picker-modal" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h3>Select {mode === 'file' ? 'File' : 'Directory'}</h3>
				<button type="button" class="modal-close" onclick={onCancel}>&times;</button>
			</div>
			<div class="modal-body">
				<div class="current-path">
					<button type="button" class="nav-btn" onclick={onNavigateToParent}>&larr; Up</button>
					<input type="text" value={path} readonly class="path-display" />
				</div>
				<div class="file-list">
					{#each entries as entry}
						<button
							type="button"
							class="file-entry"
							class:directory={entry.isDirectory}
							class:file={entry.isFile}
							onclick={() => onSelectEntry(entry)}
						>
							<span class="entry-icon">{entry.isDirectory ? '📁' : '📄'}</span>
							<span class="entry-name">{entry.name}</span>
						</button>
					{/each}
					{#if entries.length === 0}
						<div class="empty-dir">Empty directory</div>
					{/if}
				</div>
			</div>
			<div class="modal-footer">
				<button type="button" class="btn-secondary" onclick={onCancel}>Cancel</button>
				{#if mode === 'directory'}
					<button type="button" class="btn-primary" onclick={() => onConfirm()}>
						Select This Directory
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal {
		background: white;
		border-radius: 8px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
		max-width: 90vw;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
	}

	.file-picker-modal {
		width: 600px;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.modal-header h3 {
		margin: 0;
		font-size: 1.125rem;
	}

	.modal-close {
		background: none;
		border: none;
		font-size: 1.5rem;
		color: #666;
		cursor: pointer;
		line-height: 1;
	}

	.modal-close:hover {
		color: #333;
	}

	.modal-body {
		flex: 1;
		padding: 1rem 1.25rem;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		border-top: 1px solid #e5e7eb;
	}

	.btn-secondary {
		padding: 0.5rem 1rem;
		background: #f3f4f6;
		border: 1px solid #ddd;
		border-radius: 4px;
		cursor: pointer;
	}

	.btn-secondary:hover {
		background: #e5e7eb;
	}

	.btn-primary {
		padding: 0.5rem 1rem;
		background: #2563eb;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}

	.btn-primary:hover {
		background: #1d4ed8;
	}

	.current-path {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.nav-btn {
		padding: 0.5rem 0.75rem;
		background: #f3f4f6;
		border: 1px solid #ddd;
		border-radius: 4px;
		cursor: pointer;
	}

	.nav-btn:hover {
		background: #e5e7eb;
	}

	.path-display {
		flex: 1;
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		background: #f9fafb;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
		font-size: 0.8125rem;
	}

	.file-list {
		flex: 1;
		overflow-y: auto;
		border: 1px solid #e5e7eb;
		border-radius: 4px;
		max-height: 300px;
	}

	.file-entry {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.625rem 0.75rem;
		background: none;
		border: none;
		border-bottom: 1px solid #f3f4f6;
		text-align: left;
		cursor: pointer;
		font-size: 0.875rem;
	}

	.file-entry:hover {
		background: #f3f4f6;
	}

	.file-entry.directory {
		font-weight: 500;
	}

	.entry-icon {
		font-size: 1rem;
	}

	.entry-name {
		flex: 1;
	}

	.empty-dir {
		padding: 2rem;
		text-align: center;
		color: #999;
		font-style: italic;
	}
</style>
