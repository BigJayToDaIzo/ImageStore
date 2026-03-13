import { untrack } from 'svelte';
import { listSourceImages, getImageObjectURL, revokeAllObjectURLs } from '$lib/store/source-images.js';
import { createManifest, saveManifest, getCurrentManifest, updateImageStatus, abandonManifest, getManifest } from '$lib/store/manifest.js';
import { batchCleanup } from '$lib/store/sort-image.js';
import { pickDirectory, persistHandle } from '$lib/store/fs-handles.js';
import type { Manifest, SourceImage } from '$lib/store/types.js';

export interface ImageEntry {
	name: string;
	thumbSrc: string | null;
	previewSrc: string | null;
	handle: FileSystemFileHandle;
}

interface ImageSorterProps {
	getCaseNumberInputRef: () => { resetForm: () => void } | undefined;
	isActive: () => boolean;
	getSourceHandle: () => FileSystemDirectoryHandle | null;
	getDestHandle: () => FileSystemDirectoryHandle | null;
	onSourceConnected?: (handle: FileSystemDirectoryHandle) => void;
}

export function createImageSorterState(props: ImageSorterProps) {
	let images = $state<ImageEntry[]>([]);
	let selectedIndex = $state(0);
	let hoveredIndex = $state(-1);
	let folderPath = $state('');
	let formIsDirty = $state(false);
	let isLoading = $state(false);
	let loadError = $state('');

	// Modal state
	let showSwitchModal = $state(false);
	let pendingIndex = $state(-1);

	// Manifest state
	let manifestId = $state<string | null>(null);
	let manifestStatus = $state<string | null>(null);
	let imageStatuses = $state<Record<string, string>>({});

	let isPracticeLoading = $state(false);
	let showCompleteModal = $state(false);
	let completeModalShown = $state(false);

	// Track the last sourceHandle we loaded from, to avoid re-loading
	let lastLoadedHandle = $state<FileSystemDirectoryHandle | null>(null);

	// Incremental status counters — one O(n) pass instead of three $derived scans
	let statusCounts = $state({ sorted: 0, skipped: 0, pending: 0, sorting: 0, error: 0 });

	function computeCountsFromStatuses() {
		const counts = { sorted: 0, skipped: 0, pending: 0, sorting: 0, error: 0 };
		for (const img of images) {
			const s = imageStatuses[img.name];
			if (s === 'sorted') counts.sorted++;
			else if (s === 'skipped') counts.skipped++;
			else if (s === 'sorting') counts.sorting++;
			else if (s === 'error') counts.error++;
			else counts.pending++;
		}
		statusCounts = counts;
	}

	let previewImage = $derived(
		hoveredIndex >= 0 ? images[hoveredIndex] : images[selectedIndex]
	);

	let isSessionComplete = $derived(
		images.length > 0 && statusCounts.pending === 0 && statusCounts.sorting === 0
	);

	// Load images when sourceHandle changes or tab becomes active
	$effect(() => {
		const handle = props.getSourceHandle();
		const active = props.isActive();
		if (active && handle && handle !== lastLoadedHandle) {
			loadSourceImages(handle);
		}
	});

	// Eagerly load preview URL when selection/hover changes
	$effect(() => {
		const idx = hoveredIndex >= 0 ? hoveredIndex : selectedIndex;
		const len = images.length;
		untrack(() => {
			if (idx >= 0 && idx < len) {
				ensureURL(idx);
			}
		});
	});

	// Auto-show completion modal when all images are processed
	$effect(() => {
		if (isSessionComplete && !completeModalShown) {
			showCompleteModal = true;
			completeModalShown = true;
		}
	});

	async function ensureURL(index: number, options?: { thumbnail?: boolean }): Promise<void> {
		const entry = images[index];
		if (!entry?.handle) return;

		if (options?.thumbnail) {
			if (entry.thumbSrc) return;
			const url = await getImageObjectURL(entry.handle, { maxDimension: 400 });
			entry.thumbSrc = url;
		} else {
			if (entry.previewSrc) return;
			const url = await getImageObjectURL(entry.handle);
			entry.previewSrc = url;
		}
	}

	async function loadSourceImages(sourceHandle: FileSystemDirectoryHandle) {
		isLoading = true;
		loadError = '';
		revokeAllObjectURLs();

		try {
			const sourceImages = await listSourceImages(sourceHandle);
			if (sourceImages.length > 0) {
				folderPath = sourceHandle.name;
				lastLoadedHandle = sourceHandle;

				// Populate immediately with null URLs — UI renders placeholders
				images = sourceImages.map(img => ({
					name: img.name,
					thumbSrc: null,
					previewSrc: null,
					handle: img.handle,
				}));
				selectedIndex = 0;

				// Eagerly load the first preview so it's visible when loading spinner clears
				await ensureURL(0);

				// Create or resume manifest session
				await initManifest(sourceImages);
			} else {
				folderPath = sourceHandle.name;
				lastLoadedHandle = sourceHandle;
				images = [];
				selectedIndex = 0;
			}
		} catch (e) {
			console.error('Failed to load source images:', e);
			loadError = e instanceof Error ? e.message : 'Failed to load images';
		} finally {
			isLoading = false;
		}
	}

	async function initManifest(sourceImages: SourceImage[]) {
		try {
			// Look for an existing active manifest
			const existing = await getCurrentManifest();
			if (existing) {
				applyManifest(existing);
				return;
			}

			// No existing manifest — create one (synchronous, no hashing)
			const manifest = createManifest(sourceImages);
			await saveManifest(manifest);
			applyManifest(manifest);
		} catch (e) {
			loadError = e instanceof Error ? e.message : 'Failed to initialize session';
		}
	}

	function applyManifest(manifest: Manifest) {
		manifestId = manifest.id;
		manifestStatus = manifest.status;
		imageStatuses = {};
		for (const img of manifest.images) {
			imageStatuses[img.filename] = img.status;
		}
		computeCountsFromStatuses();
		advanceToNextPending();
	}

	function advanceToNextPending() {
		const idx = images.findIndex((img: ImageEntry) => {
			const status = imageStatuses[img.name];
			return !status || status === 'pending';
		});
		if (idx >= 0) selectedIndex = idx;
	}

	async function refreshManifest() {
		if (!manifestId) return;
		try {
			const manifest = await getManifest(manifestId);
			if (manifest) {
				manifestStatus = manifest.status;
				const newStatuses: Record<string, string> = {};
				for (const img of manifest.images) {
					newStatuses[img.filename] = img.status;
				}
				imageStatuses = newStatuses;
				computeCountsFromStatuses();
			}
		} catch (e) {
			console.error('Failed to refresh manifest:', e);
		}
	}

	function selectImage(index: number) {
		if (index === selectedIndex) return;

		if (formIsDirty) {
			pendingIndex = index;
			showSwitchModal = true;
		} else {
			selectedIndex = index;
		}
	}

	function handleModalClearAndSwitch() {
		props.getCaseNumberInputRef()?.resetForm();
		if (pendingIndex >= 0) {
			selectedIndex = pendingIndex;
			pendingIndex = -1;
		}
		showSwitchModal = false;
	}

	function handleModalKeepAndSwitch() {
		if (pendingIndex >= 0) {
			selectedIndex = pendingIndex;
			pendingIndex = -1;
		}
		showSwitchModal = false;
	}

	function handleModalCancel() {
		showSwitchModal = false;
		pendingIndex = -1;
	}

	function handleKeydown(event: KeyboardEvent, index: number) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			selectImage(index);
		}
	}

	function handleImageSorted() {
		const sortedImage = images[selectedIndex];
		if (sortedImage) {
			const oldStatus = imageStatuses[sortedImage.name];
			imageStatuses[sortedImage.name] = 'sorted';
			imageStatuses = imageStatuses;

			// Incremental count update for instant UI feedback
			if (oldStatus === 'sorting') statusCounts.sorting--;
			else if (!oldStatus || oldStatus === 'pending') statusCounts.pending--;
			statusCounts.sorted++;
		}

		advanceToNextPending();
		refreshManifest();
	}

	async function skipImage(index: number) {
		const image = images[index];
		if (!image) return;

		if (!manifestId) {
			imageStatuses[image.name] = 'skipped';
			imageStatuses = imageStatuses;
			computeCountsFromStatuses();
			advanceToNextPending();
			return;
		}

		try {
			const manifest = await updateImageStatus(manifestId, image.name, { status: 'skipped' });
			applyManifest(manifest);
		} catch (e) {
			console.error('Failed to skip image:', e);
		}
	}

	async function undoSkip(index: number) {
		const image = images[index];
		if (!image) return;

		if (!manifestId) {
			imageStatuses[image.name] = 'pending';
			imageStatuses = imageStatuses;
			computeCountsFromStatuses();
			return;
		}

		try {
			const manifest = await updateImageStatus(manifestId, image.name, { status: 'pending' });
			applyManifest(manifest);
		} catch (e) {
			console.error('Failed to undo skip:', e);
		}
	}

	function resetLocalState() {
		manifestId = null;
		manifestStatus = null;
		imageStatuses = {};
		images = [];
		selectedIndex = 0;
		hoveredIndex = -1;
		folderPath = '';
		formIsDirty = false;
		loadError = '';
		showCompleteModal = false;
		completeModalShown = false;
		lastLoadedHandle = null;
		statusCounts = { sorted: 0, skipped: 0, pending: 0, sorting: 0, error: 0 };
		revokeAllObjectURLs();
		props.getCaseNumberInputRef()?.resetForm();
	}

	function dismissCompleteModal() {
		showCompleteModal = false;
	}

	async function completeSession() {
		const sourceHandle = props.getSourceHandle();
		const destHandle = props.getDestHandle();

		try {
			if (!manifestId || !sourceHandle || !destHandle) {
				loadError = 'No active session or missing directory handles';
				showCompleteModal = false;
				return;
			}

			const manifest = await getManifest(manifestId);
			if (!manifest) {
				loadError = 'Session manifest not found';
				showCompleteModal = false;
				return;
			}

			const result = await batchCleanup(manifest, sourceHandle, destHandle);
			if (result.failedCount > 0) {
				loadError = `Cleanup: ${result.cleanedCount} cleaned, ${result.failedCount} failed`;
			}
			resetLocalState();
		} catch (e) {
			console.error('Failed to complete session:', e);
			loadError = 'Failed to complete session';
		}
	}

	async function abandonSession() {
		try {
			if (manifestId) {
				await abandonManifest(manifestId);
			}
			resetLocalState();
			const sourceHandle = props.getSourceHandle();
			if (sourceHandle) {
				await loadSourceImages(sourceHandle);
			}
		} catch (e) {
			console.error('Failed to abandon session:', e);
		}
	}

	async function generatePracticeSession() {
		const destHandle = props.getDestHandle();
		if (!destHandle) {
			loadError = 'Connect a destination directory before starting practice';
			return;
		}

		isPracticeLoading = true;
		try {
			// Abandon any existing manifest before starting fresh
			if (manifestId) {
				await abandonManifest(manifestId);
			}
			resetLocalState();

			// User picks the practice directory
			const practiceDir = await pickDirectory();

			const patients = [
				{
					id: '101', label: 'Practice 101',
					images: [
						{ angle: 'Front', type: 'Pre-Op', bg: '#e87461' },
						{ angle: 'Left', type: 'Pre-Op', bg: '#d4634f' },
						{ angle: 'Right', type: 'Pre-Op', bg: '#f0956a' },
						{ angle: 'Front', type: '3 Mo Post-Op', bg: '#c25040' },
					],
				},
				{
					id: '102', label: 'Practice 102',
					images: [
						{ angle: 'Front', type: 'Pre-Op', bg: '#5b8fb9' },
						{ angle: 'Back', type: 'Pre-Op', bg: '#4a7ea8' },
						{ angle: 'Left', type: 'Pre-Op', bg: '#6da0ca' },
					],
				},
				{
					id: '103', label: 'Practice 103',
					images: [
						{ angle: 'Front', type: 'Pre-Op', bg: '#8b9e6b' },
						{ angle: 'Right', type: 'Pre-Op', bg: '#7a8d5a' },
						{ angle: 'Front', type: '6 Mo Post-Op', bg: '#9caf7c' },
					],
				},
			];

			// Generate canvas blobs and write as real files to the practice directory
			for (const patient of patients) {
				for (const img of patient.images) {
					const canvas = document.createElement('canvas');
					canvas.width = 640;
					canvas.height = 480;
					const ctx = canvas.getContext('2d')!;

					ctx.fillStyle = img.bg;
					ctx.fillRect(0, 0, 640, 480);

					ctx.fillStyle = '#ffffff';
					ctx.textAlign = 'center';
					ctx.font = 'bold 36px sans-serif';
					ctx.fillText(patient.label, 320, 180);
					ctx.font = '28px sans-serif';
					ctx.fillText(img.angle, 320, 240);
					ctx.font = '24px sans-serif';
					ctx.fillText(img.type, 320, 300);

					ctx.strokeStyle = 'rgba(255,255,255,0.3)';
					ctx.lineWidth = 4;
					ctx.strokeRect(20, 20, 600, 440);

					const blob: Blob = await new Promise((resolve, reject) => {
						canvas.toBlob(
							(b) => b ? resolve(b) : reject(new Error('Canvas toBlob failed')),
							'image/png'
						);
					});

					const safeName = `practice_${patient.id}_${img.angle.toLowerCase()}_${img.type.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}.png`;
					const fileHandle = await practiceDir.getFileHandle(safeName, { create: true });
					const writable = await fileHandle.createWritable();
					await writable.write(blob);
					await writable.close();
				}
			}

			// Persist as the source directory — the $effect picks up the handle change
			await persistHandle('source', practiceDir);
			props.onSourceConnected?.(practiceDir);
		} catch (e) {
			if (e instanceof DOMException && e.name === 'AbortError') return;
			console.error('Practice session failed:', e);
			loadError = e instanceof Error ? e.message : 'Practice session failed';
		} finally {
			isPracticeLoading = false;
		}
	}

	return {
		get images() { return images; },
		get selectedIndex() { return selectedIndex; },
		get hoveredIndex() { return hoveredIndex; },
		set hoveredIndex(v: number) { hoveredIndex = v; },
		get folderPath() { return folderPath; },
		get formIsDirty() { return formIsDirty; },
		set formIsDirty(v: boolean) { formIsDirty = v; },
		get isLoading() { return isLoading; },
		get loadError() { return loadError; },
		get previewImage() { return previewImage; },
		get showSwitchModal() { return showSwitchModal; },

		// Manifest state
		get manifestId() { return manifestId; },
		get manifestStatus() { return manifestStatus; },
		get imageStatuses() { return imageStatuses; },
		get sortedCount() { return statusCounts.sorted; },
		get skippedCount() { return statusCounts.skipped; },
		get pendingCount() { return images.length - statusCounts.sorted - statusCounts.skipped; },
		get isSessionComplete() { return isSessionComplete; },
		get showCompleteModal() { return showCompleteModal; },
		get isPracticeLoading() { return isPracticeLoading; },

		dismissCompleteModal,
		completeSession,
		abandonSession,
		generatePracticeSession,
		selectImage,
		handleKeydown,
		handleImageSorted,
		handleModalClearAndSwitch,
		handleModalKeepAndSwitch,
		handleModalCancel,
		skipImage,
		undoSkip,
		ensureURL,
	};
}
