<script>
	import CaseNumberInput from './CaseNumberInput.svelte';

	let { images: initialImages = [], onFolderChange = null } = $props();

	let images = $state(initialImages);
	let selectedIndex = $state(0);
	let hoveredIndex = $state(-1);
	let folderPath = $state('');
	let collapsed = $state(false);
	let pinned = $state(false);
	let fileInput;
	let formIsDirty = $state(false);
	let caseNumberInputRef;

	// Modal state
	let showSwitchModal = $state(false);
	let pendingIndex = $state(-1);

	// Show hovered image if hovering, otherwise show selected
	let previewImage = $derived(
		hoveredIndex >= 0 ? images[hoveredIndex] : images[selectedIndex]
	);

	function selectImage(index) {
		if (index === selectedIndex) return;

		if (formIsDirty) {
			pendingIndex = index;
			showSwitchModal = true;
		} else {
			selectedIndex = index;
			if (!pinned) {
				collapsed = true;
			}
		}
	}

	function handleModalClearAndSwitch() {
		caseNumberInputRef?.resetForm();
		selectedIndex = pendingIndex;
		showSwitchModal = false;
		pendingIndex = -1;
		if (!pinned) {
			collapsed = true;
		}
	}

	function handleModalKeepAndSwitch() {
		selectedIndex = pendingIndex;
		showSwitchModal = false;
		pendingIndex = -1;
		if (!pinned) {
			collapsed = true;
		}
	}

	function handleModalCancel() {
		showSwitchModal = false;
		pendingIndex = -1;
	}

	function handleKeydown(event, index) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			selectImage(index);
		}
	}

	function togglePanel() {
		collapsed = !collapsed;
	}

	function handleImageSorted() {
		// Remove the sorted image from the list
		images = images.filter((_, i) => i !== selectedIndex);

		// Adjust selected index if needed
		if (selectedIndex >= images.length) {
			selectedIndex = Math.max(0, images.length - 1);
		}

		// Expand panel if there are more images to sort
		if (images.length > 0 && !pinned) {
			collapsed = false;
		}
	}

	function openFolderPicker() {
		fileInput?.click();
	}

	function handleFolderSelect(event) {
		const files = Array.from(event.target.files || []);
		const imageFiles = files.filter(file =>
			file.type.startsWith('image/')
		);

		if (imageFiles.length > 0) {
			// Get folder path from first file's webkitRelativePath
			const firstPath = imageFiles[0].webkitRelativePath;
			folderPath = firstPath.split('/')[0];

			// Notify parent of folder change
			onFolderChange?.(folderPath);

			// Convert files to image objects with blob URLs
			images = imageFiles.map(file => ({
				src: URL.createObjectURL(file),
				name: file.name,
				file: file
			}));
			selectedIndex = 0;
			hoveredIndex = -1;
		}
	}
</script>

<input
	type="file"
	bind:this={fileInput}
	onchange={handleFolderSelect}
	webkitdirectory
	multiple
	hidden
/>

<div class="image-sorter">
	<section class="thumbnail-panel" class:collapsed>
		{#if images.length === 0}
			<div class="empty-state">
				<p>No source folder selected</p>
				<button class="select-folder-btn" onclick={openFolderPicker}>Select Source Folder</button>
			</div>
		{:else}
			<div class="thumbnail-content">
				<div class="folder-header">
					<span class="folder-path" title={folderPath}>{folderPath}</span>
					<span class="image-count">{images.length} images</span>
					<button class="change-folder-btn" onclick={openFolderPicker}>Change</button>
					<button
						class="pin-btn"
						class:pinned
						onclick={() => pinned = !pinned}
						title={pinned ? 'Unpin panel (collapse on selection)' : 'Pin panel (stay open on selection)'}
					>
						{pinned ? '📌' : '📍'}
					</button>
				</div>
				<div class="thumbnail-grid">
					{#each images as image, index}
						<button
							class="thumbnail"
							class:selected={index === selectedIndex}
							onclick={() => selectImage(index)}
							onkeydown={(e) => handleKeydown(e, index)}
							onmouseenter={() => hoveredIndex = index}
							onmouseleave={() => hoveredIndex = -1}
							type="button"
						>
							<img src={image.src} alt={image.name} />
							<span class="filename">{image.name}</span>
						</button>
					{/each}
				</div>
			</div>
		{/if}
	</section>

	{#if images.length > 0}
		<button class="panel-toggle" class:collapsed onclick={togglePanel} title={collapsed ? 'Show thumbnails' : 'Hide thumbnails'}>
			<span class="toggle-icon">{collapsed ? '▶' : '◀'}</span>
			{#if collapsed}
				<span class="toggle-label">Images</span>
			{/if}
		</button>
	{/if}

	<section class="form-panel">
		<div class="selected-image">
			{#if previewImage}
				<img src={previewImage.src} alt={previewImage.name} />
			{:else}
				<div class="placeholder">Select an image</div>
			{/if}
		</div>

		<CaseNumberInput
			bind:this={caseNumberInputRef}
			selectedFile={images[selectedIndex]?.file}
			selectedFilename={images[selectedIndex]?.name}
			onSorted={handleImageSorted}
			bind:isDirty={formIsDirty}
		/>
	</section>
</div>

{#if showSwitchModal}
	<div class="modal-overlay" onclick={handleModalCancel}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<h3>Switch Image?</h3>
			<p>You have unsaved changes in the form. What would you like to do?</p>
			<div class="modal-actions">
				<button class="modal-btn secondary" onclick={handleModalCancel}>Cancel</button>
				<button class="modal-btn" onclick={handleModalKeepAndSwitch}>Keep Form & Switch</button>
				<button class="modal-btn primary" onclick={handleModalClearAndSwitch}>Clear & Switch</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.image-sorter {
		display: flex;
		flex: 1;
		overflow: hidden;
		position: relative;
	}

	.thumbnail-panel {
		flex: 1;
		max-width: 50%;
		background: #fafafa;
		border-right: 1px solid #ddd;
		overflow: hidden;
		display: flex;
		transition: max-width 0.25s ease, flex 0.25s ease, opacity 0.2s ease;
	}

	.thumbnail-panel.collapsed {
		max-width: 0;
		flex: 0;
		border-right: none;
		opacity: 0;
		pointer-events: none;
	}

	.panel-toggle {
		position: absolute;
		left: 0;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.75rem 0.5rem;
		background: #2563eb;
		color: white;
		border: none;
		border-radius: 0 4px 4px 0;
		cursor: pointer;
		font-size: 0.75rem;
		z-index: 10;
		transition: padding 0.2s ease, background 0.15s ease;
	}

	.panel-toggle:hover {
		background: #1d4ed8;
	}

	.panel-toggle:not(.collapsed) {
		padding: 0.5rem 0.35rem;
	}

	.toggle-icon {
		font-size: 0.625rem;
	}

	.toggle-label {
		writing-mode: vertical-rl;
		text-orientation: mixed;
		font-weight: 500;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 100%;
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

	.thumbnail-content {
		display: flex;
		flex-direction: column;
		height: 100%;
		width: 100%;
	}

	.folder-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 1rem;
		background: #f0f0f0;
		border-bottom: 1px solid #ddd;
		font-size: 0.8125rem;
	}

	.folder-path {
		font-family: monospace;
		color: #333;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.image-count {
		color: #666;
		margin-left: auto;
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

	.pin-btn {
		padding: 0.25rem 0.4rem;
		background: transparent;
		border: 1px solid #ccc;
		border-radius: 3px;
		font-size: 0.75rem;
		cursor: pointer;
		opacity: 0.6;
		transition: opacity 0.15s, background 0.15s;
	}

	.pin-btn:hover {
		background: #e5e5e5;
		opacity: 1;
	}

	.pin-btn.pinned {
		background: #dbeafe;
		border-color: #2563eb;
		opacity: 1;
	}

	.thumbnail-grid {
		display: flex;
		flex-wrap: wrap;
		align-content: flex-start;
		gap: 0.75rem;
		padding: 1rem;
		overflow-y: auto;
		flex: 1;
	}

	.thumbnail {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 140px;
		padding: 0.5rem;
		background: #f8f8f8;
		border: 2px solid transparent;
		border-radius: 4px;
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s;
	}

	.thumbnail:hover {
		background: #f0f0f0;
	}

	.thumbnail.selected {
		border-color: #2563eb;
		background: #eff6ff;
	}

	.thumbnail img {
		width: 100%;
		aspect-ratio: 1;
		object-fit: cover;
		border-radius: 2px;
		background: #e5e5e5;
	}

	.filename {
		margin-top: 0.5rem;
		font-size: 0.75rem;
		color: #555;
		text-overflow: ellipsis;
		overflow: hidden;
		white-space: nowrap;
		max-width: 100%;
	}

	.form-panel {
		flex: 1;
		min-width: 360px;
		padding: 1.5rem;
		background: #fff;
		overflow-y: auto;
	}

	.selected-image {
		width: 100%;
		aspect-ratio: 1;
		max-width: 320px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #f0f0f0;
		border-radius: 4px;
		margin: 0 auto 1.5rem auto;
	}

	.selected-image img {
		width: 100%;
		height: 100%;
		object-fit: contain;
		border-radius: 4px;
	}

	.placeholder {
		color: #999;
		font-size: 0.75rem;
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
