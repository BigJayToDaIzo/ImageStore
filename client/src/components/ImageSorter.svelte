<script>
	let { images = [] } = $props();

	let selectedIndex = $state(0);
	let hoveredIndex = $state(-1);

	// Show hovered image if hovering, otherwise show selected
	let previewImage = $derived(
		hoveredIndex >= 0 ? images[hoveredIndex] : images[selectedIndex]
	);

	function selectImage(index) {
		selectedIndex = index;
	}

	function handleKeydown(event, index) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			selectImage(index);
		}
	}
</script>

<div class="image-sorter">
	<section class="thumbnail-panel">
		{#if images.length === 0}
			<div class="empty-state">
				<p>No source folder selected</p>
				<button class="select-folder-btn">Select Source Folder</button>
			</div>
		{:else}
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
	</section>

	<section class="form-panel">
		<div class="selected-image">
			{#if previewImage}
				<img src={previewImage.src} alt={previewImage.name} />
			{:else}
				<div class="placeholder">Select an image</div>
			{/if}
		</div>

		<slot />
	</section>
</div>

<style>
	.image-sorter {
		display: flex;
		flex: 1;
		overflow: hidden;
	}

	.thumbnail-panel {
		flex: 1;
		max-width: 50%;
		background: #fafafa;
		border-right: 1px solid #ddd;
		overflow: hidden;
		display: flex;
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

	.thumbnail-grid {
		display: flex;
		flex-wrap: wrap;
		align-content: flex-start;
		gap: 0.75rem;
		padding: 1rem;
		overflow-y: auto;
		height: 100%;
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
</style>
