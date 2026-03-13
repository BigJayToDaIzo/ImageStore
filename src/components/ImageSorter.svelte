<script lang="ts">
	import CaseNumberInput from './CaseNumberInput/CaseNumberInput.svelte';
	import LazyThumbnail from './LazyThumbnail.svelte';
	import { createImageSorterState } from './ImageSorter.svelte.ts';

	let {
		active = true,
		sourceHandle = null,
		destHandle = null,
	}: {
		active?: boolean;
		sourceHandle?: FileSystemDirectoryHandle | null;
		destHandle?: FileSystemDirectoryHandle | null;
	} = $props();

	let caseNumberInputRef: { resetForm: () => void } | undefined;
	let thumbnailWrapper: HTMLDivElement;

	const state = createImageSorterState({
		getCaseNumberInputRef: () => caseNumberInputRef,
		isActive: () => active,
		getSourceHandle: () => sourceHandle,
		getDestHandle: () => destHandle,
	});

	$effect(() => {
		const idx = state.selectedIndex;
		if (idx < 0 || !thumbnailWrapper) return;
		const thumb = thumbnailWrapper.querySelector('.thumbnail.selected');
		if (thumb) thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
	});
</script>

<div class="image-sorter">
	<!-- Left half: Preview image + Thumbnails -->
	<section class="left-panel">
		<div class="preview-area">
			{#if state.previewImage?.previewSrc || state.previewImage?.thumbSrc}
				<img src={state.previewImage.previewSrc ?? state.previewImage.thumbSrc} alt={state.previewImage.name} />
			{:else if state.isLoading}
				<div class="empty-state">
					<p>Loading source images...</p>
				</div>
			{:else if state.images.length === 0}
				<div class="empty-state">
					<p>{state.loadError || 'Pick a source directory above to get started'}</p>
					<div class="empty-state-actions">
						<button class="practice-btn" onclick={state.generatePracticeSession} disabled={state.isPracticeLoading}>
							{state.isPracticeLoading ? 'Generating...' : 'Practice Session'}
						</button>
					</div>
				</div>
			{:else}
				<div class="placeholder">Select an image</div>
			{/if}
		</div>

		<div class="thumbnails-area">
			{#if state.images.length > 0}
				<div class="folder-header">
					<span class="folder-path" title={state.folderPath}>{state.folderPath}</span>
					<span class="image-count">{state.sortedCount}/{state.images.length} sorted{#if state.skippedCount > 0} · {state.skippedCount} skipped{/if}</span>
					<button class="change-folder-btn finish-btn" onclick={state.completeSession} title="Finish session and clean up">Finish</button>
					<button class="change-folder-btn abandon-btn" onclick={state.abandonSession} title="Abandon session and start fresh">Reset</button>
					<button class="change-folder-btn practice-header-btn" onclick={state.generatePracticeSession} disabled={state.isPracticeLoading}>
						{state.isPracticeLoading ? 'Generating...' : 'Practice'}
					</button>
				</div>
				<div class="thumbnail-grid-wrapper" bind:this={thumbnailWrapper}>
					<div class="thumbnail-grid">
						{#each state.images as image, index (image.name)}
							<LazyThumbnail
								{image}
								{index}
								status={state.imageStatuses[image.name]}
								isSelected={index === state.selectedIndex}
								ensureURL={state.ensureURL}
								onselect={() => state.selectImage(index)}
								onkeydown={(e) => state.handleKeydown(e, index)}
								onmouseenter={() => state.hoveredIndex = index}
								onmouseleave={() => state.hoveredIndex = -1}
								onskip={() => state.skipImage(index)}
								onundoskip={() => state.undoSkip(index)}
							/>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</section>

	<!-- Right half: Form -->
	<section class="form-panel">
		<CaseNumberInput
			bind:this={caseNumberInputRef}
			selectedFilename={state.images[state.selectedIndex]?.name ?? ''}
			{sourceHandle}
			{destHandle}
			manifestId={state.manifestId}
			onSorted={state.handleImageSorted}
			bind:isDirty={state.formIsDirty}
		/>
	</section>
</div>

{#if state.showSwitchModal}
	<div class="modal-overlay" onclick={state.handleModalCancel}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<h3>Switch Image?</h3>
			<p>You have unsaved changes in the form. What would you like to do?</p>
			<div class="modal-actions">
				<button class="modal-btn secondary" onclick={state.handleModalCancel}>Cancel</button>
				<button class="modal-btn" onclick={state.handleModalKeepAndSwitch}>Keep Form & Switch</button>
				<button class="modal-btn primary" onclick={state.handleModalClearAndSwitch}>Clear & Switch</button>
			</div>
		</div>
	</div>
{/if}

{#if state.showCompleteModal}
	<div class="complete-overlay" onclick={state.dismissCompleteModal}>
		<div class="complete-card" onclick={(e) => e.stopPropagation()}>
			<h3>Session Complete</h3>
			<p>{state.sortedCount} sorted{#if state.skippedCount > 0}, {state.skippedCount} skipped{/if}</p>
			{#if state.manifestId}
				<p class="complete-warning">This will verify all copies and permanently delete the source files.</p>
				<div class="complete-actions">
					<button class="complete-btn purge" onclick={state.completeSession}>Purge Sources</button>
					<button class="complete-btn dismiss" onclick={state.dismissCompleteModal}>Keep Files</button>
				</div>
			{:else}
				<p class="complete-warning">No active session — source files cannot be purged.</p>
				<div class="complete-actions">
					<button class="complete-btn dismiss" onclick={state.dismissCompleteModal}>OK</button>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.image-sorter {
		display: flex;
		flex: 1;
		overflow: hidden;
		background: #fee2e2;
	}

	/* Left panel: Preview + Thumbnails */
	.left-panel {
		flex: 1;
		max-width: 50%;
		display: flex;
		flex-direction: column;
		background: #fee2e2;
		border-right: 6px solid #1f2937;
		overflow: hidden;
	}

	.preview-area {
		flex: 0 0 75%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		min-height: 0;
		overflow: hidden;
		background: #fee2e2;
	}

	.preview-area img {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
		border-radius: 4px;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: #666;
		text-align: center;
	}

	.empty-state p {
		margin-bottom: 1rem;
	}

	.select-folder-btn {
		padding: 0.5rem 1rem;
		background: #2563eb;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.875rem;
	}

	.select-folder-btn:hover {
		background: #1d4ed8;
	}

	.empty-state-actions {
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}

	.practice-btn {
		padding: 0.5rem 1rem;
		background: transparent;
		color: #2563eb;
		border: 1.5px solid #2563eb;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.875rem;
		transition: background 0.15s, color 0.15s;
	}

	.practice-btn:hover:not(:disabled) {
		background: #2563eb;
		color: white;
	}

	.practice-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* Thumbnail grid wrapper */
	.thumbnail-grid-wrapper {
		flex: 1;
		min-height: 0;
		overflow-x: auto;
		overflow-y: hidden;
	}

	.complete-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.complete-card {
		background: white;
		border-radius: 8px;
		padding: 1.25rem 1.5rem;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
		text-align: center;
		max-width: 300px;
	}

	.complete-card h3 {
		margin: 0 0 0.375rem 0;
		font-size: 1.125rem;
		color: #16a34a;
	}

	.complete-card p {
		margin: 0 0 0.375rem 0;
		font-size: 0.875rem;
		color: #555;
	}

	.complete-warning {
		font-size: 0.75rem !important;
		color: #991b1b !important;
		margin-bottom: 0.75rem !important;
	}

	.complete-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: center;
	}

	.complete-btn {
		padding: 0.4rem 1rem;
		border-radius: 4px;
		font-size: 0.8125rem;
		cursor: pointer;
		border: 1px solid #ccc;
	}

	.complete-btn.purge {
		background: #dc2626;
		color: white;
		border-color: #dc2626;
	}

	.complete-btn.purge:hover {
		background: #b91c1c;
	}

	.complete-btn.dismiss {
		background: white;
		color: #555;
	}

	.complete-btn.dismiss:hover {
		background: #f5f5f5;
	}

	.finish-btn {
		color: #15803d;
		border-color: #86efac;
	}

	.finish-btn:hover {
		background: #dcfce7;
	}

	.abandon-btn {
		color: #991b1b;
		border-color: #fca5a5;
	}

	.abandon-btn:hover {
		background: #fecaca;
	}

	.practice-header-btn {
		color: #2563eb;
		border-color: #93c5fd;
	}

	.practice-header-btn:hover:not(:disabled) {
		background: #dbeafe;
	}

	.practice-header-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.placeholder {
		color: #999;
		font-size: 0.875rem;
	}

	/* Thumbnails area */
	.thumbnails-area {
		display: flex;
		flex-direction: column;
		flex: 0 0 25%;
		border-top: 1px solid #fca5a5;
		background: #fee2e2;
		overflow: hidden;
	}

	.folder-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: #fecaca;
		border-bottom: 1px solid #fca5a5;
		font-size: 0.8125rem;
		flex-shrink: 0;
	}

	.folder-path {
		font-family: monospace;
		color: #333;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
		min-width: 0;
	}

	.image-count {
		color: #666;
		white-space: nowrap;
	}

	.change-folder-btn {
		padding: 0.25rem 0.5rem;
		background: #e5e5e5;
		border: 1px solid #ccc;
		border-radius: 3px;
		font-size: 0.75rem;
		cursor: pointer;
	}

	.change-folder-btn:hover {
		background: #ddd;
	}

	.thumbnail-grid {
		display: flex;
		flex-wrap: nowrap;
		align-items: flex-start;
		gap: 0.5rem;
		padding: 0.75rem;
	}

	/* Right panel: Form */
	.form-panel {
		flex: 1;
		max-width: 50%;
		padding: 1rem 1.25rem;
		background: #fee2e2;
		overflow: visible;
	}

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
		padding: 1.5rem;
		max-width: 400px;
		width: 90%;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
	}

	.modal h3 {
		margin: 0 0 0.75rem 0;
		font-size: 1.125rem;
		color: #333;
	}

	.modal p {
		margin: 0 0 1.25rem 0;
		font-size: 0.9375rem;
		color: #555;
		line-height: 1.4;
	}

	.modal-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}

	.modal-btn {
		padding: 0.5rem 1rem;
		border-radius: 4px;
		font-size: 0.875rem;
		cursor: pointer;
		border: 1px solid #ccc;
		background: white;
		color: #333;
	}

	.modal-btn:hover {
		background: #f5f5f5;
	}

	.modal-btn.primary {
		background: #2563eb;
		color: white;
		border-color: #2563eb;
	}

	.modal-btn.primary:hover {
		background: #1d4ed8;
	}

	.modal-btn.secondary {
		background: transparent;
		border-color: #ddd;
		color: #666;
	}

	.modal-btn.secondary:hover {
		background: #f0f0f0;
	}

</style>
