interface ImageSorterProps {
	initialImages: () => any[];
	onFolderChange: () => ((path: string) => void) | null;
	getFileInput: () => HTMLInputElement | undefined;
	getCaseNumberInputRef: () => { resetForm: () => void } | undefined;
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

	let previewImage = $derived(
		hoveredIndex >= 0 ? images[hoveredIndex] : images[selectedIndex]
	);

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
					images = data.images.map((img: any) => ({
						src: `/api/source-image?path=${encodeURIComponent(img.path)}`,
						name: img.name,
						path: img.path,
						file: null
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
		images = images.filter((_: any, i: number) => i !== selectedIndex);
		if (selectedIndex >= images.length) {
			selectedIndex = Math.max(0, images.length - 1);
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
		if (!data.images || data.images.length === 0) return;

		folderPath = dirPath;
		props.onFolderChange()?.(folderPath);

		images = data.images.map((img: any) => ({
			src: `/api/source-image?path=${encodeURIComponent(img.path)}&sourceRoot=${encodeURIComponent(dirPath)}`,
			name: img.name,
			path: img.path,
			file: null
		}));
		selectedIndex = 0;
		hoveredIndex = -1;
		isServerLoaded = true;
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

		selectImage,
		handleKeydown,
		handleImageSorted,
		openFolderPicker,
		handleFolderSelect,
		handleModalClearAndSwitch,
		handleModalKeepAndSwitch,
		handleModalCancel,
	};
}
