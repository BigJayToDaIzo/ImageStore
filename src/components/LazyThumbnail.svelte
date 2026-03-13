<script lang="ts">
	import { onMount } from 'svelte';
	import { observeThumbnail, unobserveThumbnail } from './lazyObserver';
	import type { ImageEntry } from './ImageSorter.svelte.ts';

	let {
		image,
		index,
		status,
		isSelected,
		ensureURL,
		onselect,
		onkeydown,
		onmouseenter,
		onmouseleave,
		onskip,
		onundoskip,
	}: {
		image: ImageEntry;
		index: number;
		status: string | undefined;
		isSelected: boolean;
		ensureURL: (index: number, options?: { thumbnail?: boolean }) => Promise<void>;
		onselect: () => void;
		onkeydown: (e: KeyboardEvent) => void;
		onmouseenter: () => void;
		onmouseleave: () => void;
		onskip: () => void;
		onundoskip: () => void;
	} = $props();

	let el: HTMLButtonElement;

	onMount(() => {
		observeThumbnail(el, () => ensureURL(index, { thumbnail: true }));
		return () => unobserveThumbnail(el);
	});
</script>

<button
	bind:this={el}
	class="thumbnail"
	class:selected={isSelected}
	class:sorted={status === 'sorted'}
	class:skipped={status === 'skipped'}
	class:errored={status === 'error'}
	onclick={onselect}
	{onkeydown}
	{onmouseenter}
	{onmouseleave}
	type="button"
>
	{#if image.thumbSrc}
		<img src={image.thumbSrc} alt={image.name} />
	{:else}
		<div class="thumb-placeholder"></div>
	{/if}
	<span class="filename">{image.name}</span>
	{#if status === 'sorted'}
		<span class="status-badge sorted-badge">&#10003;</span>
	{:else if status === 'skipped'}
		<button class="status-badge undo-badge" type="button" onclick={(e) => { e.stopPropagation(); onundoskip(); }} title="Undo skip">&#8630;</button>
	{:else if status !== 'error'}
		<button class="status-badge skip-badge" type="button" onclick={(e) => { e.stopPropagation(); onskip(); }} title="Skip image">&#10005;</button>
	{/if}
</button>

<style>
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
		position: relative;
	}

	.thumbnail:hover {
		background: #f0f0f0;
	}

	.thumbnail.selected {
		border-color: #2563eb;
		background: #eff6ff;
	}

	.thumbnail.sorted {
		border-color: #16a34a;
		opacity: 0.7;
	}

	.thumbnail.skipped {
		border-color: #9ca3af;
		opacity: 0.4;
	}

	.thumbnail.errored {
		border-color: #dc2626;
	}

	.thumbnail img {
		width: 100%;
		aspect-ratio: 1;
		object-fit: cover;
		border-radius: 2px;
		background: #e5e5e5;
	}

	.thumb-placeholder {
		width: 100%;
		aspect-ratio: 1;
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

	.status-badge {
		position: absolute;
		top: 2px;
		right: 2px;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.6875rem;
		line-height: 1;
		border: none;
		padding: 0;
	}

	.sorted-badge {
		background: #16a34a;
		color: white;
	}

	.skip-badge {
		background: #9ca3af;
		color: white;
		cursor: pointer;
		opacity: 0;
		transition: opacity 0.15s;
	}

	.thumbnail:hover .skip-badge {
		opacity: 1;
	}

	.skip-badge:hover {
		background: #6b7280;
	}

	.undo-badge {
		background: #9ca3af;
		color: white;
		cursor: pointer;
	}

	.undo-badge:hover {
		background: #6b7280;
	}
</style>
