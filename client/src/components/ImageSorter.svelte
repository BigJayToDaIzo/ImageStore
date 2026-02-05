<script>
	import CaseNumberInput from './CaseNumberInput.svelte';

	let { images: initialImages = [], onFolderChange = null } = $props();

	let images = $state(initialImages);
	let selectedIndex = $state(0);
	let hoveredIndex = $state(-1);
	let folderPath = $state('');
	let fileInput;
	let formIsDirty = $state(false);
	let caseNumberInputRef;
	let isLoading = $state(true);
	let loadError = $state('');
	let isServerLoaded = $state(false); // Track if images came from server vs file picker

	// Modal state
	let showSwitchModal = $state(false);
	let pendingIndex = $state(-1);
	let pendingFolderFiles = $state(null);

	// Load images from default source on mount
	$effect(() => {
		loadSourceImages();
	});

	async function loadSourceImages() {
		isLoading = true;
		loadError = '';
		try {
			const res = await fetch('/api/source-images');
			if (res.ok) {
				const data = await res.json();
				if (data.images && data.images.length > 0) {
					folderPath = data.sourceRoot;
					images = data.images.map(img => ({
						src: `/api/source-image?path=${encodeURIComponent(img.path)}`,
						name: img.name,
						path: img.path, // Server path for sorting
						file: null // No File object for server-loaded images
					}));
					selectedIndex = 0;
					isServerLoaded = true;
				} else if (data.error) {
					loadError = data.error;
				}
			}
		} catch (e) {
			console.error('Failed to load source images:', e);
		} finally {
			isLoading = false;
		}
	}

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
		}
	}

	function handleModalClearAndSwitch() {
		caseNumberInputRef?.resetForm();
		if (pendingFolderFiles) {
			applyFolderChange(pendingFolderFiles);
			pendingFolderFiles = null;
		} else if (pendingIndex >= 0) {
			selectedIndex = pendingIndex;
			pendingIndex = -1;
		}
		showSwitchModal = false;
	}

	function handleModalKeepAndSwitch() {
		if (pendingFolderFiles) {
			applyFolderChange(pendingFolderFiles);
			pendingFolderFiles = null;
		} else if (pendingIndex >= 0) {
			selectedIndex = pendingIndex;
			pendingIndex = -1;
		}
		showSwitchModal = false;
	}

	function handleModalCancel() {
		showSwitchModal = false;
		pendingIndex = -1;
		pendingFolderFiles = null;
		// Reset file input so the same folder can be selected again
		if (fileInput) fileInput.value = '';
	}

	function handleKeydown(event, index) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			selectImage(index);
		}
	}

	function handleImageSorted() {
		// Remove the sorted image from the list
		images = images.filter((_, i) => i !== selectedIndex);

		// Adjust selected index if needed
		if (selectedIndex >= images.length) {
			selectedIndex = Math.max(0, images.length - 1);
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
			if (formIsDirty) {
				// Store pending folder change and show modal
				pendingFolderFiles = imageFiles;
				showSwitchModal = true;
			} else {
				applyFolderChange(imageFiles);
			}
		}
	}

	function applyFolderChange(imageFiles) {
		// Get folder path from first file's webkitRelativePath
		const firstPath = imageFiles[0].webkitRelativePath;
		folderPath = firstPath.split('/')[0];

		// Notify parent of folder change
		onFolderChange?.(folderPath);

		// Convert files to image objects with blob URLs
		images = imageFiles.map(file => ({
			src: URL.createObjectURL(file),
			name: file.name,
			path: file.webkitRelativePath, // Store full relative path
			file: file
		}));
		selectedIndex = 0;
		hoveredIndex = -1;
		isServerLoaded = false;
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
	<!-- Left half: Preview image + Thumbnails -->
	<section class="left-panel">
		<div class="preview-area">
			{#if previewImage}
				<img src={previewImage.src} alt={previewImage.name} />
			{:else if isLoading}
				<div class="empty-state">
					<p>Loading source images...</p>
				</div>
			{:else if images.length === 0}
				<div class="empty-state">
					<p>{loadError || 'No images in source folder'}</p>
					<button class="select-folder-btn" onclick={openFolderPicker}>Select Source Folder</button>
				</div>
			{:else}
				<div class="placeholder">Select an image</div>
			{/if}
		</div>

		<div class="thumbnails-area">
			{#if images.length > 0}
				<div class="folder-header">
					<span class="folder-path" title={folderPath}>{folderPath}</span>
					<span class="image-count">{images.length} images</span>
					<button class="change-folder-btn" onclick={openFolderPicker}>Change</button>
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
			{/if}
		</div>
	</section>

	<!-- Right half: Form -->
	<section class="form-panel">
		<CaseNumberInput
			bind:this={caseNumberInputRef}
			selectedFile={images[selectedIndex]?.file}
			selectedFilename={images[selectedIndex]?.name}
			selectedPath={images[selectedIndex]?.path}
			onSorted={handleImageSorted}
			bind:isDirty={formIsDirty}
		/>
	</section>
</div>

{#if showSwitchModal}
	<div class="modal-overlay" onclick={handleModalCancel}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<h3>{pendingFolderFiles ? 'Change Folder?' : 'Switch Image?'}</h3>
			<p>You have unsaved changes in the form. What would you like to do?</p>
			<div class="modal-actions">
				<button class="modal-btn secondary" onclick={handleModalCancel}>Cancel</button>
				<button class="modal-btn" onclick={handleModalKeepAndSwitch}>Keep Form & {pendingFolderFiles ? 'Change' : 'Switch'}</button>
				<button class="modal-btn primary" onclick={handleModalClearAndSwitch}>Clear & {pendingFolderFiles ? 'Change' : 'Switch'}</button>
			</div>
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
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		min-height: 200px;
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

	.placeholder {
		color: #999;
		font-size: 0.875rem;
	}

	/* Thumbnails area */
	.thumbnails-area {
		display: flex;
		flex-direction: column;
		max-height: 50%;
		border-top: 1px solid #fca5a5;
		background: #fee2e2;
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
		flex-wrap: wrap;
		align-content: flex-start;
		gap: 0.5rem;
		padding: 0.75rem;
		overflow-y: auto;
		flex: 1;
	}

	.thumbnail {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100px;
		padding: 0.375rem;
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
		margin-top: 0.375rem;
		font-size: 0.6875rem;
		color: #555;
		text-overflow: ellipsis;
		overflow: hidden;
		white-space: nowrap;
		max-width: 100%;
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
