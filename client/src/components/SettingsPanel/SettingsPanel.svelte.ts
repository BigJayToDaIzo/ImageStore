export const imageTypes = [
	{ value: 'pre_op', label: 'Pre-Op' },
	{ value: '1day_post_op', label: '1 Day Post-Op' },
	{ value: '3mo_post_op', label: '3 Month Post-Op' },
	{ value: '6mo_post_op', label: '6 Month Post-Op' },
	{ value: '9plus_mo_post_op', label: '9+ Month Post-Op' },
];

export const angles = [
	{ value: 'front', label: 'Front' },
	{ value: 'back', label: 'Back' },
	{ value: 'left', label: 'Left' },
	{ value: 'right', label: 'Right' },
];

export function createSettingsPanelState() {
	let settings = $state({
		destinationRoot: '',
		sourceRoot: '',
		dataPath: '',
		defaults: {
			procedure: 'rhinoplasty',
			imageType: 'pre_op',
			angle: 'front',
			defaultPatientAge: 33,
			surgeon: '',
		},
	});

	let procedures = $state<any[]>([]);
	let surgeons = $state<any[]>([]);

	let isLoading = $state(true);
	let isSaving = $state(false);
	let saveMessage = $state('');
	let saveError = $state('');
	let useCustomDataPath = $state(false);

	let activeTab = $state('storage');

	// Surgeon management
	let newSurgeonName = $state('');
	let editingSurgeonId = $state<string | null>(null);
	let editingSurgeonName = $state('');

	// Procedure management
	let newProcedureName = $state('');
	let editingProcedureId = $state<string | null>(null);
	let editingProcedureName = $state('');

	// File picker modal
	let showFilePicker = $state(false);
	let filePickerPath = $state('');
	let filePickerEntries = $state<any[]>([]);
	let filePickerTarget = $state<string | null>(null);
	let filePickerMode = $state('directory');

	// CSV import paths
	let surgeonsCsvPath = $state('');
	let proceduresCsvPath = $state('');
	let surgeonsImportMsg = $state('');
	let surgeonsImportErr = $state('');
	let proceduresImportMsg = $state('');
	let proceduresImportErr = $state('');

	// Factory reset modal
	let showResetModal = $state(false);
	let isResetting = $state(false);

	function generateId() {
		return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
	}

	// Surgeon CRUD
	async function addSurgeon() {
		if (!newSurgeonName.trim()) return;
		const id = generateId();
		try {
			const res = await fetch('/api/surgeons', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id, name: newSurgeonName.trim() })
			});
			if (res.ok) {
				const newSurg = await res.json();
				surgeons = [...surgeons, newSurg];
				newSurgeonName = '';
			}
		} catch (e) {
			console.error('Failed to add surgeon:', e);
		}
	}

	function startEditSurgeon(surgeon: any) {
		editingSurgeonId = surgeon.id;
		editingSurgeonName = surgeon.name;
	}

	async function saveEditSurgeon() {
		if (!editingSurgeonName.trim()) return;
		try {
			const res = await fetch('/api/surgeons', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: editingSurgeonId, name: editingSurgeonName.trim() })
			});
			if (res.ok) {
				const updated = await res.json();
				surgeons = surgeons.map(s => s.id === editingSurgeonId ? updated : s);
			}
		} catch (e) {
			console.error('Failed to update surgeon:', e);
		}
		editingSurgeonId = null;
		editingSurgeonName = '';
	}

	function cancelEditSurgeon() {
		editingSurgeonId = null;
		editingSurgeonName = '';
	}

	async function deleteSurgeonById(id: string) {
		try {
			const res = await fetch('/api/surgeons', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id })
			});
			if (res.ok) {
				surgeons = surgeons.filter(s => s.id !== id);
				if (settings.defaults.surgeon === id) {
					settings.defaults.surgeon = surgeons[0]?.id || '';
				}
			}
		} catch (e) {
			console.error('Failed to delete surgeon:', e);
		}
	}

	function handleSurgeonKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			addSurgeon();
		}
	}

	function handleSurgeonEditKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			saveEditSurgeon();
		} else if (event.key === 'Escape') {
			cancelEditSurgeon();
		}
	}

	// Procedure CRUD
	async function addProcedure() {
		if (!newProcedureName.trim()) return;
		const id = newProcedureName.trim().toLowerCase().replace(/\s+/g, '_');
		try {
			const res = await fetch('/api/procedures', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id, name: newProcedureName.trim(), favorite: false })
			});
			if (res.ok) {
				const newProc = await res.json();
				procedures = [...procedures, newProc];
				newProcedureName = '';
			}
		} catch (e) {
			console.error('Failed to add procedure:', e);
		}
	}

	function startEditProcedure(procedure: any) {
		editingProcedureId = procedure.id;
		editingProcedureName = procedure.name;
	}

	async function saveEditProcedure() {
		if (!editingProcedureName.trim()) return;
		try {
			const res = await fetch('/api/procedures', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: editingProcedureId, name: editingProcedureName.trim() })
			});
			if (res.ok) {
				const updated = await res.json();
				procedures = procedures.map(p => p.id === editingProcedureId ? updated : p);
			}
		} catch (e) {
			console.error('Failed to update procedure:', e);
		}
		editingProcedureId = null;
		editingProcedureName = '';
	}

	function cancelEditProcedure() {
		editingProcedureId = null;
		editingProcedureName = '';
	}

	async function deleteProcedureById(id: string) {
		try {
			const res = await fetch('/api/procedures', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id })
			});
			if (res.ok) {
				procedures = procedures.filter(p => p.id !== id);
				if (settings.defaults.procedure === id) {
					settings.defaults.procedure = procedures[0]?.id || '';
				}
			}
		} catch (e) {
			console.error('Failed to delete procedure:', e);
		}
	}

	function handleProcedureKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			addProcedure();
		}
	}

	function handleProcedureEditKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			saveEditProcedure();
		} else if (event.key === 'Escape') {
			cancelEditProcedure();
		}
	}

	// File picker
	async function openFilePicker(target: string, mode = 'directory') {
		filePickerTarget = target;
		filePickerMode = mode;

		let initialPath = '';
		if (target === 'source') initialPath = settings.sourceRoot;
		else if (target === 'destination') initialPath = settings.destinationRoot;
		else if (target === 'data') initialPath = settings.dataPath;
		else if (target === 'surgeonsCsv') initialPath = surgeonsCsvPath;
		else if (target === 'proceduresCsv') initialPath = proceduresCsvPath;

		await browseDirectory(initialPath || '~');
		showFilePicker = true;
	}

	async function browseDirectory(path: string) {
		try {
			const res = await fetch(`/api/browse-files?path=${encodeURIComponent(path)}`);
			if (res.ok) {
				const data = await res.json();
				filePickerPath = data.currentPath;
				filePickerEntries = data.entries;
			}
		} catch (e) {
			console.error('Failed to browse:', e);
		}
	}

	async function navigateToParent() {
		const parts = filePickerPath.split('/');
		if (parts.length > 1) {
			parts.pop();
			await browseDirectory(parts.join('/') || '/');
		}
	}

	async function selectEntry(entry: any) {
		if (entry.isDirectory) {
			if (filePickerMode === 'directory') {
				await browseDirectory(entry.path);
			} else {
				await browseDirectory(entry.path);
			}
		} else if (entry.isFile && filePickerMode === 'file') {
			confirmFilePicker(entry.path);
		}
	}

	function confirmFilePicker(path: string | null = null) {
		const selectedPath = path || filePickerPath;

		if (filePickerTarget === 'source') {
			settings.sourceRoot = selectedPath;
		} else if (filePickerTarget === 'destination') {
			settings.destinationRoot = selectedPath;
		} else if (filePickerTarget === 'data') {
			settings.dataPath = selectedPath;
		} else if (filePickerTarget === 'surgeonsCsv') {
			surgeonsCsvPath = selectedPath;
			showFilePicker = false;
			importSurgeonsCsv();
			return;
		} else if (filePickerTarget === 'proceduresCsv') {
			proceduresCsvPath = selectedPath;
			showFilePicker = false;
			importProceduresCsv();
			return;
		}

		showFilePicker = false;
	}

	function cancelFilePicker() {
		showFilePicker = false;
	}

	// CSV Import
	async function importSurgeonsCsv() {
		if (!surgeonsCsvPath) return;
		surgeonsImportMsg = '';
		surgeonsImportErr = '';

		try {
			const readRes = await fetch('/api/import-csv', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					path: surgeonsCsvPath,
					type: 'surgeons',
					existingIds: surgeons.map(s => s.id),
				}),
			});

			const readData = await readRes.json();
			if (!readRes.ok) {
				surgeonsImportErr = readData.error || 'Import failed';
				return;
			}

			if (readData.items.length > 0) {
				const saveRes = await fetch('/api/surgeons', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(readData.items),
				});

				if (saveRes.ok) {
					const result = await saveRes.json();
					surgeons = result.surgeons;
					surgeonsImportMsg = `Imported ${result.imported} (${result.skipped} skipped)`;
					setTimeout(() => surgeonsImportMsg = '', 5000);
				} else {
					surgeonsImportErr = 'Failed to save imported surgeons';
				}
			} else {
				surgeonsImportMsg = `Imported 0 (${readData.skipped} skipped)`;
				setTimeout(() => surgeonsImportMsg = '', 5000);
			}
		} catch (e) {
			surgeonsImportErr = e instanceof Error ? e.message : 'Import failed';
		}
	}

	async function importProceduresCsv() {
		if (!proceduresCsvPath) return;
		proceduresImportMsg = '';
		proceduresImportErr = '';

		try {
			const readRes = await fetch('/api/import-csv', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					path: proceduresCsvPath,
					type: 'procedures',
					existingIds: procedures.map(p => p.id),
				}),
			});

			const readData = await readRes.json();
			if (!readRes.ok) {
				proceduresImportErr = readData.error || 'Import failed';
				return;
			}

			if (readData.items.length > 0) {
				const saveRes = await fetch('/api/procedures', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(readData.items),
				});

				if (saveRes.ok) {
					const result = await saveRes.json();
					procedures = result.procedures;
					proceduresImportMsg = `Imported ${result.imported} (${result.skipped} skipped)`;
					setTimeout(() => proceduresImportMsg = '', 5000);
				} else {
					proceduresImportErr = 'Failed to save imported procedures';
				}
			} else {
				proceduresImportMsg = `Imported 0 (${readData.skipped} skipped)`;
				setTimeout(() => proceduresImportMsg = '', 5000);
			}
		} catch (e) {
			proceduresImportErr = e instanceof Error ? e.message : 'Import failed';
		}
	}

	$effect(() => {
		loadAllSettings();
	});

	async function loadAllSettings() {
		try {
			const [settingsRes, proceduresRes, surgeonsRes] = await Promise.all([
				fetch('/api/settings'),
				fetch('/api/procedures'),
				fetch('/api/surgeons')
			]);

			if (settingsRes.ok) {
				const loaded = await settingsRes.json();
				settings = loaded;
				useCustomDataPath = !!loaded.dataPath;
			}

			if (proceduresRes.ok) {
				procedures = await proceduresRes.json();
			}

			if (surgeonsRes.ok) {
				surgeons = await surgeonsRes.json();
			}
		} catch (e) {
			console.error('Failed to load settings:', e);
		} finally {
			isLoading = false;
		}
	}

	async function handleSave() {
		isSaving = true;
		saveMessage = '';
		saveError = '';

		try {
			const toSave = {
				...settings,
				dataPath: useCustomDataPath ? settings.dataPath : '',
			};

			const res = await fetch('/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(toSave),
			});

			if (res.ok) {
				settings = await res.json();
				saveMessage = 'Settings saved successfully';
				setTimeout(() => saveMessage = '', 3000);
			} else {
				const error = await res.json();
				saveError = error.error || 'Failed to save settings';
			}
		} catch (e) {
			saveError = e instanceof Error ? e.message : 'Failed to save settings';
		} finally {
			isSaving = false;
		}
	}

	async function handleFactoryReset() {
		isResetting = true;
		saveError = '';

		try {
			const res = await fetch('/api/settings', { method: 'DELETE' });

			if (res.ok) {
				settings = await res.json();
				useCustomDataPath = false;
				showResetModal = false;
				saveMessage = 'Settings reset to factory defaults';
				setTimeout(() => saveMessage = '', 3000);
			} else {
				const error = await res.json();
				saveError = error.error || 'Failed to reset settings';
			}
		} catch (e) {
			saveError = e instanceof Error ? e.message : 'Failed to reset settings';
		} finally {
			isResetting = false;
		}
	}

	let dataPathPreview = $derived(() => {
		if (useCustomDataPath && settings.dataPath) {
			return settings.dataPath;
		}
		return `${settings.destinationRoot}/patients.csv`;
	});

	return {
		get settings() { return settings; },
		set settings(v: any) { settings = v; },
		get procedures() { return procedures; },
		set procedures(v: any[]) { procedures = v; },
		get surgeons() { return surgeons; },
		set surgeons(v: any[]) { surgeons = v; },
		get isLoading() { return isLoading; },
		get isSaving() { return isSaving; },
		get saveMessage() { return saveMessage; },
		get saveError() { return saveError; },
		get useCustomDataPath() { return useCustomDataPath; },
		set useCustomDataPath(v: boolean) { useCustomDataPath = v; },
		get activeTab() { return activeTab; },
		set activeTab(v: string) { activeTab = v; },

		// Surgeon editing
		get newSurgeonName() { return newSurgeonName; },
		set newSurgeonName(v: string) { newSurgeonName = v; },
		get editingSurgeonId() { return editingSurgeonId; },
		get editingSurgeonName() { return editingSurgeonName; },
		set editingSurgeonName(v: string) { editingSurgeonName = v; },

		// Procedure editing
		get newProcedureName() { return newProcedureName; },
		set newProcedureName(v: string) { newProcedureName = v; },
		get editingProcedureId() { return editingProcedureId; },
		get editingProcedureName() { return editingProcedureName; },
		set editingProcedureName(v: string) { editingProcedureName = v; },

		// File picker
		get showFilePicker() { return showFilePicker; },
		get filePickerPath() { return filePickerPath; },
		get filePickerEntries() { return filePickerEntries; },
		get filePickerTarget() { return filePickerTarget; },
		get filePickerMode() { return filePickerMode; },

		// CSV import status
		get surgeonsImportMsg() { return surgeonsImportMsg; },
		get surgeonsImportErr() { return surgeonsImportErr; },
		get proceduresImportMsg() { return proceduresImportMsg; },
		get proceduresImportErr() { return proceduresImportErr; },

		// Factory reset
		get showResetModal() { return showResetModal; },
		set showResetModal(v: boolean) { showResetModal = v; },
		get isResetting() { return isResetting; },

		// Derived
		dataPathPreview,

		// Functions
		addSurgeon,
		startEditSurgeon,
		saveEditSurgeon,
		cancelEditSurgeon,
		deleteSurgeonById,
		handleSurgeonKeydown,
		handleSurgeonEditKeydown,
		addProcedure,
		startEditProcedure,
		saveEditProcedure,
		cancelEditProcedure,
		deleteProcedureById,
		handleProcedureKeydown,
		handleProcedureEditKeydown,
		openFilePicker,
		navigateToParent,
		selectEntry,
		confirmFilePicker,
		cancelFilePicker,
		handleSave,
		handleFactoryReset,
	};
}
