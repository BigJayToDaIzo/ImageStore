import { loadSettings, saveSettings, resetSettings } from '$lib/store/settings.js';
import {
	loadProcedures, addProcedure as storeAddProcedure,
	updateProcedure, deleteProcedure as storeDeleteProcedure,
	importProcedures, showProcedureFilePicker,
} from '$lib/store/procedures.js';
import {
	loadSurgeons, addSurgeon as storeAddSurgeon,
	updateSurgeon, deleteSurgeon as storeDeleteSurgeon,
	importSurgeons, showSurgeonFilePicker,
} from '$lib/store/surgeons.js';
import type { Settings, Procedure, Surgeon } from '$lib/store/types.js';

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
	let settings = $state<Settings>({
		defaults: {
			procedure: 'rhinoplasty',
			imageType: 'pre_op',
			angle: 'front',
			defaultPatientAge: 33,
			surgeon: '',
		},
	});

	let procedures = $state<Procedure[]>([]);
	let surgeons = $state<Surgeon[]>([]);

	let isLoading = $state(true);
	let isSaving = $state(false);
	let saveMessage = $state('');
	let saveError = $state('');

	let activeTab = $state('procedures');

	// Surgeon management
	let newSurgeonName = $state('');
	let editingSurgeonId = $state<string | null>(null);
	let editingSurgeonName = $state('');

	// Procedure management
	let newProcedureName = $state('');
	let editingProcedureId = $state<string | null>(null);
	let editingProcedureName = $state('');

	// CSV import status
	let surgeonsImportMsg = $state('');
	let surgeonsImportErr = $state('');
	let proceduresImportMsg = $state('');
	let proceduresImportErr = $state('');

	// Factory reset modal
	let showResetModal = $state(false);
	let isResetting = $state(false);

	// Surgeon CRUD
	async function addSurgeon() {
		if (!newSurgeonName.trim()) return;
		const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
		try {
			const newSurg = await storeAddSurgeon(id, newSurgeonName.trim());
			surgeons = [...surgeons, newSurg];
			newSurgeonName = '';
		} catch (e) {
			console.error('Failed to add surgeon:', e);
		}
	}

	function startEditSurgeon(surgeon: Surgeon) {
		editingSurgeonId = surgeon.id;
		editingSurgeonName = surgeon.name;
	}

	async function saveEditSurgeon() {
		if (!editingSurgeonName.trim()) return;
		try {
			await updateSurgeon(editingSurgeonId!, { name: editingSurgeonName.trim() });
			surgeons = surgeons.map(s =>
				s.id === editingSurgeonId ? { ...s, name: editingSurgeonName.trim() } : s
			);
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
			await storeDeleteSurgeon(id);
			surgeons = surgeons.filter(s => s.id !== id);
			if (settings.defaults.surgeon === id) {
				settings.defaults.surgeon = surgeons[0]?.id || '';
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
		try {
			const newProc = await storeAddProcedure(newProcedureName.trim());
			procedures = [...procedures, newProc];
			newProcedureName = '';
		} catch (e) {
			console.error('Failed to add procedure:', e);
		}
	}

	function startEditProcedure(procedure: Procedure) {
		editingProcedureId = procedure.id;
		editingProcedureName = procedure.name;
	}

	async function saveEditProcedure() {
		if (!editingProcedureName.trim()) return;
		try {
			await updateProcedure(editingProcedureId!, { name: editingProcedureName.trim() });
			procedures = procedures.map(p =>
				p.id === editingProcedureId ? { ...p, name: editingProcedureName.trim() } : p
			);
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
			await storeDeleteProcedure(id);
			procedures = procedures.filter(p => p.id !== id);
			if (settings.defaults.procedure === id) {
				settings.defaults.procedure = procedures[0]?.id || '';
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

	// CSV Import
	async function importSurgeonsCsv() {
		surgeonsImportMsg = '';
		surgeonsImportErr = '';
		try {
			const csvText = await showSurgeonFilePicker();
			const result = await importSurgeons(csvText);
			surgeons = await loadSurgeons();
			surgeonsImportMsg = `Imported ${result.imported} (${result.skipped} skipped)`;
			setTimeout(() => surgeonsImportMsg = '', 5000);
		} catch (e) {
			if (e instanceof DOMException && e.name === 'AbortError') return;
			surgeonsImportErr = e instanceof Error ? e.message : 'Import failed';
		}
	}

	async function importProceduresCsv() {
		proceduresImportMsg = '';
		proceduresImportErr = '';
		try {
			const csvText = await showProcedureFilePicker();
			const result = await importProcedures(csvText);
			procedures = await loadProcedures();
			proceduresImportMsg = `Imported ${result.imported} (${result.skipped} skipped)`;
			setTimeout(() => proceduresImportMsg = '', 5000);
		} catch (e) {
			if (e instanceof DOMException && e.name === 'AbortError') return;
			proceduresImportErr = e instanceof Error ? e.message : 'Import failed';
		}
	}

	$effect(() => {
		loadAllSettings();
	});

	async function loadAllSettings() {
		try {
			const [loaded, procs, surgs] = await Promise.all([
				loadSettings(),
				loadProcedures(),
				loadSurgeons()
			]);

			settings = loaded;
			procedures = procs;
			surgeons = surgs;
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
			await saveSettings(settings);
			saveMessage = 'Settings saved successfully';
			setTimeout(() => saveMessage = '', 3000);
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
			await resetSettings();
			settings = await loadSettings();
			showResetModal = false;
			saveMessage = 'Settings reset to factory defaults';
			setTimeout(() => saveMessage = '', 3000);
		} catch (e) {
			saveError = e instanceof Error ? e.message : 'Failed to reset settings';
		} finally {
			isResetting = false;
		}
	}

	return {
		get settings() { return settings; },
		set settings(v: Settings) { settings = v; },
		get procedures() { return procedures; },
		set procedures(v: Procedure[]) { procedures = v; },
		get surgeons() { return surgeons; },
		set surgeons(v: Surgeon[]) { surgeons = v; },
		get isLoading() { return isLoading; },
		get isSaving() { return isSaving; },
		get saveMessage() { return saveMessage; },
		get saveError() { return saveError; },
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

		// CSV import status
		get surgeonsImportMsg() { return surgeonsImportMsg; },
		get surgeonsImportErr() { return surgeonsImportErr; },
		get proceduresImportMsg() { return proceduresImportMsg; },
		get proceduresImportErr() { return proceduresImportErr; },

		// Factory reset
		get showResetModal() { return showResetModal; },
		set showResetModal(v: boolean) { showResetModal = v; },
		get isResetting() { return isResetting; },

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
		importSurgeonsCsv,
		importProceduresCsv,
		handleSave,
		handleFactoryReset,
	};
}
