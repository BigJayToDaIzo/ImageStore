interface ImageSorterProps {
	initialImages: () => any[];
	onFolderChange: () => ((path: string) => void) | null;
	getFileInput: () => HTMLInputElement | undefined;
	getCaseNumberInputRef: () => { resetForm: () => void } | undefined;
	isActive: () => boolean;
}

export function createImageSorterState(props: ImageSorterProps) {
	let images = $state(props.initialImages());
	let selectedIndex = $state(0);
	let hoveredIndex = $state(-1);
	let folderPath = $state('');
	let formIsDirty = $state(false);
	let isLoading = $state(true);
	let loadError = $state('');
	let isServerLoaded = $state(false);

	// Modal state
	let showSwitchModal = $state(false);
	let pendingIndex = $state(-1);
	let pendingFolderFiles = $state<any>(null);

	// Manifest state
	let manifestId = $state<string | null>(null);
	let manifestStatus = $state<string | null>(null);
	let imageStatuses = $state<Record<string, string>>({});

	let isPracticeLoading = $state(false);
	let showCompleteModal = $state(false);
	let completeModalShown = $state(false);

	let previewImage = $derived(
		hoveredIndex >= 0 ? images[hoveredIndex] : images[selectedIndex]
	);

	let sortedCount = $derived(Object.values(imageStatuses).filter(s => s === 'sorted').length);
	let skippedCount = $derived(Object.values(imageStatuses).filter(s => s === 'skipped').length);
	let pendingCount = $derived(images.length - sortedCount - skippedCount);
	let isSessionComplete = $derived(
		images.length > 0 && manifestId !== null &&
		images.every((img: any) => {
			const s = imageStatuses[img.name];
			return s && s !== 'pending' && s !== 'sorting';
		})
	);

	// Load/reload images when tab becomes active
	$effect(() => {
		if (props.isActive()) loadSourceImages();
	});

	// Auto-show completion modal when all images are processed
	$effect(() => {
		if (isSessionComplete && !completeModalShown) {
			showCompleteModal = true;
			completeModalShown = true;
		}
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
					images = data.images.map((img: any) => ({
						src: `/api/source-image?path=${encodeURIComponent(img.path)}`,
						name: img.name,
						path: img.path,
						file: null
					}));
					selectedIndex = 0;
					isServerLoaded = true;

					// Create or resume manifest session
					await initManifest(data.sourceRoot);
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

	async function initManifest(sourceRoot: string) {
		try {
			// Check for existing active session
			const currentRes = await fetch('/api/manifest/current');
			if (currentRes.ok) {
				const { manifest } = await currentRes.json();
				if (manifest && manifest.sourcePath === sourceRoot) {
					// Resume existing session
					applyManifest(manifest);
					return;
				}
				// Active manifest for a different folder — abandon it before creating new
				if (manifest) {
					await fetch('/api/manifest/abandon', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ manifestId: manifest.id }),
					});
				}
			}

			// Create new manifest
			const createRes = await fetch('/api/manifest/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sourcePath: sourceRoot }),
			});
			if (createRes.ok) {
				const { manifest } = await createRes.json();
				applyManifest(manifest);
			} else if (createRes.status === 409) {
				// Session already active (race condition) — use it
				const { manifest } = await createRes.json();
				if (manifest) applyManifest(manifest);
			} else {
				const err = await createRes.json().catch(() => ({}));
				console.error('Manifest create failed:', createRes.status, err);
			}
		} catch (e) {
			console.error('Failed to init manifest:', e);
		}
	}

	function applyManifest(manifest: any) {
		manifestId = manifest.id;
		manifestStatus = manifest.status;
		imageStatuses = {};
		for (const img of manifest.images) {
			imageStatuses[img.filename] = img.status;
		}
		// Auto-select the first pending image
		advanceToNextPending();
	}

	function advanceToNextPending() {
		const idx = images.findIndex((img: any) => {
			const status = imageStatuses[img.name];
			return !status || status === 'pending';
		});
		if (idx >= 0) selectedIndex = idx;
	}

	async function refreshManifest() {
		try {
			const res = await fetch('/api/manifest/current');
			if (res.ok) {
				const { manifest } = await res.json();
				if (manifest) {
					manifestId = manifest.id;
					manifestStatus = manifest.status;
					const newStatuses: Record<string, string> = {};
					for (const img of manifest.images) {
						newStatuses[img.filename] = img.status;
					}
					imageStatuses = newStatuses;
				}
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
		if (pendingFolderFiles) {
			if (typeof pendingFolderFiles === 'string') {
				applyFolderChange(pendingFolderFiles);
			} else {
				applyFolderChangeLegacy(pendingFolderFiles);
			}
			pendingFolderFiles = null;
		} else if (pendingIndex >= 0) {
			selectedIndex = pendingIndex;
			pendingIndex = -1;
		}
		showSwitchModal = false;
	}

	function handleModalKeepAndSwitch() {
		if (pendingFolderFiles) {
			if (typeof pendingFolderFiles === 'string') {
				applyFolderChange(pendingFolderFiles);
			} else {
				applyFolderChangeLegacy(pendingFolderFiles);
			}
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
		const fi = props.getFileInput();
		if (fi) fi.value = '';
	}

	function handleKeydown(event: KeyboardEvent, index: number) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			selectImage(index);
		}
	}

	function handleImageSorted() {
		// Update local status for the sorted image
		const sortedImage = images[selectedIndex];
		if (sortedImage) {
			imageStatuses[sortedImage.name] = 'sorted';
			imageStatuses = imageStatuses; // trigger reactivity
		}

		// Advance to next pending image
		advanceToNextPending();

		// Sync with server manifest
		refreshManifest();
	}

	async function skipImage(index: number) {
		const image = images[index];
		if (!image) return;

		try {
			const res = await fetch('/api/manifest/image', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ filename: image.name, status: 'skipped' }),
			});
			if (res.ok) {
				const { manifest } = await res.json();
				applyManifest(manifest);
			}
		} catch (e) {
			console.error('Failed to skip image:', e);
		}
	}

	async function undoSkip(index: number) {
		const image = images[index];
		if (!image) return;

		try {
			const res = await fetch('/api/manifest/image', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ filename: image.name, status: 'pending' }),
			});
			if (res.ok) {
				const { manifest } = await res.json();
				applyManifest(manifest);
			}
		} catch (e) {
			console.error('Failed to undo skip:', e);
		}
	}

	async function openFolderPicker() {
		let selectedPath: string | null = null;

		if ((window as any).__TAURI_INTERNALS__) {
			try {
				const { open } = await import('@tauri-apps/plugin-dialog');
				const defaultPath = folderPath || undefined;
				selectedPath = await open({ directory: true, multiple: false, defaultPath }) as string | null;
			} catch {
				props.getFileInput()?.click();
				return;
			}
		} else {
			props.getFileInput()?.click();
			return;
		}

		if (!selectedPath) return;

		if (formIsDirty) {
			pendingFolderFiles = selectedPath;
			showSwitchModal = true;
		} else {
			await applyFolderChange(selectedPath);
		}
	}

	function handleFolderSelect(event: Event) {
		const files = Array.from((event.target as HTMLInputElement).files || []);
		const imageFiles = files.filter(file => file.type.startsWith('image/'));

		if (imageFiles.length > 0) {
			if (formIsDirty) {
				pendingFolderFiles = imageFiles;
				showSwitchModal = true;
			} else {
				applyFolderChangeLegacy(imageFiles);
			}
		}
	}

	async function applyFolderChange(dirPath: string) {
		const res = await fetch(`/api/source-images?path=${encodeURIComponent(dirPath)}`);
		if (!res.ok) return;

		const data = await res.json();

		// Abandon current manifest before switching
		if (manifestId) {
			await fetch('/api/manifest/abandon', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ manifestId }),
			});
		}

		// Always apply the change, even if new folder is empty
		folderPath = dirPath;
		props.onFolderChange()?.(folderPath);
		manifestId = null;
		manifestStatus = null;
		imageStatuses = {};
		showCompleteModal = false;
		completeModalShown = false;
		hoveredIndex = -1;

		if (data.images && data.images.length > 0) {
			images = data.images.map((img: any) => ({
				src: `/api/source-image?path=${encodeURIComponent(img.path)}&sourceRoot=${encodeURIComponent(dirPath)}`,
				name: img.name,
				path: img.path,
				file: null
			}));
			selectedIndex = 0;
			isServerLoaded = true;
			await initManifest(dirPath);
		} else {
			images = [];
			selectedIndex = 0;
			isServerLoaded = false;
		}
	}

	function applyFolderChangeLegacy(imageFiles: File[]) {
		const firstPath = imageFiles[0].webkitRelativePath;
		folderPath = firstPath.split('/')[0];

		props.onFolderChange()?.(folderPath);

		images = imageFiles.map(file => ({
			src: URL.createObjectURL(file),
			name: file.name,
			path: file.webkitRelativePath,
			file: file
		}));
		selectedIndex = 0;
		hoveredIndex = -1;
		isServerLoaded = false;

		// Reset manifest state for legacy folder picker (no server path)
		manifestId = null;
		manifestStatus = null;
		imageStatuses = {};
		showCompleteModal = false;
		completeModalShown = false;
	}

	function resetLocalState() {
		manifestId = null;
		manifestStatus = null;
		imageStatuses = {};
		images = [];
		selectedIndex = 0;
		hoveredIndex = -1;
		folderPath = '';
		isServerLoaded = false;
		formIsDirty = false;
		loadError = '';
		showCompleteModal = false;
		completeModalShown = false;
		props.getCaseNumberInputRef()?.resetForm();
	}

	function dismissCompleteModal() {
		showCompleteModal = false;
	}

	async function completeSession() {
		try {
			// Try cleanup first (verifies hashes, deletes sources — requires 'confirming' status)
			const cleanupRes = await fetch('/api/manifest/cleanup', { method: 'POST' });
			if (cleanupRes.ok) {
				resetLocalState();
				return;
			}

			// Cleanup failed (not in confirming state) — abandon instead
			if (manifestId) {
				await fetch('/api/manifest/abandon', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ manifestId }),
				});
			}
			resetLocalState();
		} catch (e) {
			console.error('Failed to complete session:', e);
			loadError = 'Failed to complete session';
		}
	}

	async function abandonSession() {
		if (!manifestId) return;
		try {
			await fetch('/api/manifest/abandon', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ manifestId }),
			});
			resetLocalState();
			await loadSourceImages();
		} catch (e) {
			console.error('Failed to abandon session:', e);
		}
	}

	async function generatePracticeSession() {
		isPracticeLoading = true;
		try {
			const patients = [
				{
					id: '101', label: 'Practice 101', color: '#e87461',
					images: [
						{ angle: 'Front', type: 'Pre-Op', bg: '#e87461' },
						{ angle: 'Left', type: 'Pre-Op', bg: '#d4634f' },
						{ angle: 'Right', type: 'Pre-Op', bg: '#f0956a' },
						{ angle: 'Front', type: '3 Mo Post-Op', bg: '#c25040' },
					],
				},
				{
					id: '102', label: 'Practice 102', color: '#5b8fb9',
					images: [
						{ angle: 'Front', type: 'Pre-Op', bg: '#5b8fb9' },
						{ angle: 'Back', type: 'Pre-Op', bg: '#4a7ea8' },
						{ angle: 'Left', type: 'Pre-Op', bg: '#6da0ca' },
					],
				},
				{
					id: '103', label: 'Practice 103', color: '#8b9e6b',
					images: [
						{ angle: 'Front', type: 'Pre-Op', bg: '#8b9e6b' },
						{ angle: 'Right', type: 'Pre-Op', bg: '#7a8d5a' },
						{ angle: 'Front', type: '6 Mo Post-Op', bg: '#9caf7c' },
					],
				},
			];

			const formData = new FormData();

			for (const patient of patients) {
				for (const img of patient.images) {
					const canvas = document.createElement('canvas');
					canvas.width = 640;
					canvas.height = 480;
					const ctx = canvas.getContext('2d')!;

					// Fill background
					ctx.fillStyle = img.bg;
					ctx.fillRect(0, 0, 640, 480);

					// Draw text labels
					ctx.fillStyle = '#ffffff';
					ctx.textAlign = 'center';
					ctx.font = 'bold 36px sans-serif';
					ctx.fillText(patient.label, 320, 180);
					ctx.font = '28px sans-serif';
					ctx.fillText(img.angle, 320, 240);
					ctx.font = '24px sans-serif';
					ctx.fillText(img.type, 320, 300);

					// Subtle border
					ctx.strokeStyle = 'rgba(255,255,255,0.3)';
					ctx.lineWidth = 4;
					ctx.strokeRect(20, 20, 600, 440);

					// Use toDataURL instead of toBlob for WKWebView compatibility
					const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
					const byteString = atob(dataUrl.split(',')[1]);
					const ab = new ArrayBuffer(byteString.length);
					const ia = new Uint8Array(ab);
					for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
					const blob = new Blob([ab], { type: 'image/jpeg' });

					const safeName = `practice_${patient.id}_${img.angle.toLowerCase()}_${img.type.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}.jpg`;
					formData.append('images', blob, safeName);
				}
			}

			const res = await fetch('/api/practice-session', { method: 'POST', body: formData });
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || 'Failed to save practice images');
			}

			await loadSourceImages();
		} catch (e) {
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
		get isServerLoaded() { return isServerLoaded; },
		get previewImage() { return previewImage; },
		get showSwitchModal() { return showSwitchModal; },
		get pendingFolderFiles() { return pendingFolderFiles; },

		// Manifest state
		get manifestId() { return manifestId; },
		get manifestStatus() { return manifestStatus; },
		get imageStatuses() { return imageStatuses; },
		get sortedCount() { return sortedCount; },
		get skippedCount() { return skippedCount; },
		get pendingCount() { return pendingCount; },
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
		openFolderPicker,
		handleFolderSelect,
		handleModalClearAndSwitch,
		handleModalKeepAndSwitch,
		handleModalCancel,
		skipImage,
		undoSkip,
	};
}
