<script>
	let { images = [], selectedIndex = $bindable(0) } = $props();

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

<div class="thumbnail-grid">
	{#if images.length === 0}
		<div class="empty-state">
			<p>No source folder selected</p>
			<button class="select-folder-btn">Select Source Folder</button>
		</div>
	{:else}
		{#each images as image, index}
			<button
				class="thumbnail"
				class:selected={index === selectedIndex}
				onclick={() => selectImage(index)}
				onkeydown={(e) => handleKeydown(e, index)}
				type="button"
			>
				<img src={image.src} alt={image.name} />
				<span class="filename">{image.name}</span>
			</button>
		{/each}
	{/if}
</div>

<style>
	.thumbnail-grid {
		display: flex;
		flex-wrap: wrap;
		align-content: flex-start;
		gap: 0.75rem;
		padding: 1rem;
		overflow-y: auto;
		height: 100%;
	}

	.empty-state {
		grid-column: 1 / -1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
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
</style>
