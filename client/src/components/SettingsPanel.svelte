<script>
	let settings = $state({
		destinationRoot: '',
		sourceRoot: '',
		dataPath: '',
		surgeons: [],
		defaults: {
			procedure: 'rhinoplasty',
			imageType: 'pre_op',
			angle: 'front',
			defaultPatientAge: 33,
			surgeon: '',
		},
	});

	// Procedures stored separately in CSV
	let procedures = $state([]);

	let isLoading = $state(true);
	let isSaving = $state(false);
	let saveMessage = $state('');
	let saveError = $state('');
	let useCustomDataPath = $state(false);

	// Settings subtabs
	let activeTab = $state('storage');

	// Surgeon management
	let newSurgeonName = $state('');
	let editingSurgeonId = $state(null);
	let editingSurgeonName = $state('');

	// Procedure management
	let newProcedureName = $state('');
	let editingProcedureId = $state(null);
	let editingProcedureName = $state('');

	// File picker modal
	let showFilePicker = $state(false);
	let filePickerPath = $state('');
	let filePickerEntries = $state([]);
	let filePickerTarget = $state(null); // 'destination', 'data', 'surgeonsCsv', 'proceduresCsv'
	let filePickerMode = $state('directory'); // 'directory' or 'file'

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

	// Surgeon CRUD (auto-saves to settings)
	async function addSurgeon() {
		if (!newSurgeonName.trim()) return;
		settings.surgeons = [...settings.surgeons, { id: generateId(), name: newSurgeonName.trim() }];
		newSurgeonName = '';
		await saveSettingsQuiet();
	}

	function startEditSurgeon(surgeon) {
		editingSurgeonId = surgeon.id;
		editingSurgeonName = surgeon.name;
	}

	async function saveEditSurgeon() {
		if (!editingSurgeonName.trim()) return;
		settings.surgeons = settings.surgeons.map(s =>
			s.id === editingSurgeonId ? { ...s, name: editingSurgeonName.trim() } : s
		);
		editingSurgeonId = null;
		editingSurgeonName = '';
		await saveSettingsQuiet();
	}

	function cancelEditSurgeon() {
		editingSurgeonId = null;
		editingSurgeonName = '';
	}

	async function deleteSurgeonById(id) {
		settings.surgeons = settings.surgeons.filter(s => s.id !== id);
		if (settings.defaults.surgeon === id) {
			settings.defaults.surgeon = '';
		}
		await saveSettingsQuiet();
	}

	// Quiet save (no success message)
	async function saveSettingsQuiet() {
		try {
			await fetch('/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(settings),
			});
		} catch (e) {
			console.error('Failed to save settings:', e);
		}
	}

	function handleSurgeonKeydown(event) {
		if (event.key === 'Enter') {
			event.preventDefault();
			addSurgeon();
		}
	}

	function handleSurgeonEditKeydown(event) {
		if (event.key === 'Enter') {
			event.preventDefault();
			saveEditSurgeon();
		} else if (event.key === 'Escape') {
			cancelEditSurgeon();
		}
	}

	// Procedure CRUD (persisted to CSV via API)
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

	function startEditProcedure(procedure) {
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

	async function deleteProcedureById(id) {
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

	function handleProcedureKeydown(event) {
		if (event.key === 'Enter') {
			event.preventDefault();
			addProcedure();
		}
	}

	function handleProcedureEditKeydown(event) {
		if (event.key === 'Enter') {
			event.preventDefault();
			saveEditProcedure();
		} else if (event.key === 'Escape') {
			cancelEditProcedure();
		}
	}

	// File picker
	async function openFilePicker(target, mode = 'directory') {
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

	async function browseDirectory(path) {
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

	async function selectEntry(entry) {
		if (entry.isDirectory) {
			if (filePickerMode === 'directory') {
				// In directory mode, clicking a directory navigates into it
				await browseDirectory(entry.path);
			} else {
				// In file mode, navigate into directory
				await browseDirectory(entry.path);
			}
		} else if (entry.isFile && filePickerMode === 'file') {
			// Select the file
			confirmFilePicker(entry.path);
		}
	}

	function confirmFilePicker(path = null) {
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
			const res = await fetch('/api/import-csv', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					path: surgeonsCsvPath,
					type: 'surgeons',
					existingIds: settings.surgeons.map(s => s.id),
				}),
			});

			const data = await res.json();
			if (res.ok) {
				settings.surgeons = [...settings.surgeons, ...data.items];
				surgeonsImportMsg = `Imported ${data.imported} (${data.skipped} skipped)`;
				setTimeout(() => surgeonsImportMsg = '', 5000);
			} else {
				surgeonsImportErr = data.error || 'Import failed';
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
			// First read the external CSV
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

			// Then save to procedures API (which persists to CSV)
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

	const imageTypes = [
		{ value: 'pre_op', label: 'Pre-Op' },
		{ value: '1day_post_op', label: '1 Day Post-Op' },
		{ value: '3mo_post_op', label: '3 Month Post-Op' },
		{ value: '6mo_post_op', label: '6 Month Post-Op' },
		{ value: '9plus_mo_post_op', label: '9+ Month Post-Op' },
	];

	const angles = [
		{ value: 'front', label: 'Front' },
		{ value: 'back', label: 'Back' },
		{ value: 'left', label: 'Left' },
		{ value: 'right', label: 'Right' },
	];

	$effect(() => {
		loadAllSettings();
	});

	async function loadAllSettings() {
		try {
			// Load settings and procedures in parallel
			const [settingsRes, proceduresRes] = await Promise.all([
				fetch('/api/settings'),
				fetch('/api/procedures')
			]);

			if (settingsRes.ok) {
				const loaded = await settingsRes.json();
				settings = loaded;
				useCustomDataPath = !!loaded.dataPath;
			}

			if (proceduresRes.ok) {
				procedures = await proceduresRes.json();
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
		// Patient data lives with images
		return `${settings.destinationRoot}/patients.csv`;
	});
</script>

<div class="settings-panel">
	{#if isLoading}
		<div class="loading">Loading settings...</div>
	{:else}
		<form onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
			<!-- Subtab Navigation -->
			<div class="subtab-nav">
				<button
					type="button"
					class="subtab"
					class:active={activeTab === 'storage'}
					onclick={() => activeTab = 'storage'}
				>
					Storage
				</button>
				<button
					type="button"
					class="subtab"
					class:active={activeTab === 'procedures'}
					onclick={() => activeTab = 'procedures'}
				>
					Procedures
				</button>
				<button
					type="button"
					class="subtab"
					class:active={activeTab === 'surgeons'}
					onclick={() => activeTab = 'surgeons'}
				>
					Surgeons
				</button>
				<button
					type="button"
					class="subtab"
					class:active={activeTab === 'misc'}
					onclick={() => activeTab = 'misc'}
				>
					Misc
				</button>
			</div>

			<div class="tab-content">
				<!-- Storage Tab -->
				{#if activeTab === 'storage'}
					<section class="settings-section">
						<h2>Storage Paths</h2>
						<div class="section-content">
							<div class="form-group">
								<label for="source_root">Default Source Path</label>
								<div class="path-input-row">
									<input
										type="text"
										id="source_root"
										bind:value={settings.sourceRoot}
										placeholder="/path/to/unsorted/images"
									/>
									<button type="button" class="browse-btn" onclick={() => openFilePicker('source', 'directory')}>
										Browse
									</button>
								</div>
								<p class="field-hint">Default folder for unsorted images</p>
							</div>

							<div class="form-group">
								<label for="destination_root">Destination Path</label>
								<div class="path-input-row">
									<input
										type="text"
										id="destination_root"
										bind:value={settings.destinationRoot}
										placeholder="/path/to/imagestore"
									/>
									<button type="button" class="browse-btn" onclick={() => openFilePicker('destination', 'directory')}>
										Browse
									</button>
								</div>
								<p class="field-hint">Where sorted images will be saved</p>
							</div>

							<div class="form-group">
								<label class="checkbox-label">
									<input type="checkbox" bind:checked={useCustomDataPath} />
									<span>Use custom data path</span>
								</label>
							</div>

							{#if useCustomDataPath}
								<div class="form-group">
									<label for="data_path">Data Path</label>
									<div class="path-input-row">
										<input
											type="text"
											id="data_path"
											bind:value={settings.dataPath}
											placeholder="/path/to/data/patients.csv"
										/>
										<button type="button" class="browse-btn" onclick={() => openFilePicker('data', 'file')}>
											Browse
										</button>
									</div>
								</div>
							{/if}

							<div class="path-preview">
								<span class="preview-label">Patient data location:</span>
								<code>{dataPathPreview()}</code>
							</div>
						</div>
					</section>
				{/if}

				<!-- Procedures Tab -->
				{#if activeTab === 'procedures'}
					<section class="settings-section">
						<h2>Procedures</h2>
						<div class="section-content">
							<div class="form-group">
								<label for="default_procedure">Default Procedure</label>
								<select id="default_procedure" bind:value={settings.defaults.procedure}>
									{#each procedures as proc}
										<option value={proc.id}>{proc.name}</option>
									{/each}
								</select>
							</div>

							<div class="csv-import-row">
								<button type="button" class="import-btn" onclick={() => openFilePicker('proceduresCsv', 'file')}>
									Import CSV
								</button>
							</div>
							{#if proceduresImportErr}
								<div class="inline-error">{proceduresImportErr}</div>
							{/if}
							{#if proceduresImportMsg}
								<div class="inline-success">{proceduresImportMsg}</div>
							{/if}

							<div class="list-container">
								{#each procedures as procedure}
									<div class="list-item">
										{#if editingProcedureId === procedure.id}
											<input
												type="text"
												bind:value={editingProcedureName}
												onkeydown={handleProcedureEditKeydown}
												class="edit-input"
											/>
											<button type="button" class="item-btn save" onclick={saveEditProcedure}>Save</button>
											<button type="button" class="item-btn cancel" onclick={cancelEditProcedure}>Cancel</button>
										{:else}
											<span class="item-name">{procedure.name}</span>
											<span class="item-id">{procedure.id}</span>
											<button type="button" class="item-btn edit" onclick={() => startEditProcedure(procedure)}>Edit</button>
											<button type="button" class="item-btn delete" onclick={() => deleteProcedureById(procedure.id)}>Delete</button>
										{/if}
									</div>
								{/each}
								{#if procedures.length === 0}
									<div class="empty-list">No procedures added yet</div>
								{/if}
							</div>

							<div class="add-row">
								<input
									type="text"
									bind:value={newProcedureName}
									placeholder="Add procedure..."
									onkeydown={handleProcedureKeydown}
								/>
								<button type="button" class="add-btn" onclick={addProcedure}>Add</button>
							</div>
						</div>
					</section>
				{/if}

				<!-- Surgeons Tab -->
				{#if activeTab === 'surgeons'}
					<section class="settings-section">
						<h2>Surgeons</h2>
						<div class="section-content">
							<div class="form-group">
								<label for="default_surgeon">Default Surgeon</label>
								<select id="default_surgeon" bind:value={settings.defaults.surgeon}>
									<option value="">None</option>
									{#each settings.surgeons as surgeon}
										<option value={surgeon.id}>{surgeon.name}</option>
									{/each}
								</select>
							</div>

							<div class="csv-import-row">
								<button type="button" class="import-btn" onclick={() => openFilePicker('surgeonsCsv', 'file')}>
									Import CSV
								</button>
							</div>
							{#if surgeonsImportErr}
								<div class="inline-error">{surgeonsImportErr}</div>
							{/if}
							{#if surgeonsImportMsg}
								<div class="inline-success">{surgeonsImportMsg}</div>
							{/if}

							<div class="list-container">
								{#each settings.surgeons as surgeon}
									<div class="list-item">
										{#if editingSurgeonId === surgeon.id}
											<input
												type="text"
												bind:value={editingSurgeonName}
												onkeydown={handleSurgeonEditKeydown}
												class="edit-input"
											/>
											<button type="button" class="item-btn save" onclick={saveEditSurgeon}>Save</button>
											<button type="button" class="item-btn cancel" onclick={cancelEditSurgeon}>Cancel</button>
										{:else}
											<span class="item-name">{surgeon.name}</span>
											<span class="item-id">{surgeon.id}</span>
											<button type="button" class="item-btn edit" onclick={() => startEditSurgeon(surgeon)}>Edit</button>
											<button type="button" class="item-btn delete" onclick={() => deleteSurgeonById(surgeon.id)}>Delete</button>
										{/if}
									</div>
								{/each}
								{#if settings.surgeons.length === 0}
									<div class="empty-list">No surgeons added yet</div>
								{/if}
							</div>

							<div class="add-row">
								<input
									type="text"
									bind:value={newSurgeonName}
									placeholder="Add surgeon..."
									onkeydown={handleSurgeonKeydown}
							/>
								<button type="button" class="add-btn" onclick={addSurgeon}>Add</button>
							</div>
						</div>
					</section>
				{/if}

				<!-- Misc Tab -->
				{#if activeTab === 'misc'}
					<section class="settings-section">
						<h2>Other Defaults</h2>
						<div class="section-content">
							<div class="defaults-grid">
								<div class="form-group">
									<label for="default_image_type">Image Type</label>
									<select id="default_image_type" bind:value={settings.defaults.imageType}>
										{#each imageTypes as type}
											<option value={type.value}>{type.label}</option>
										{/each}
									</select>
								</div>

								<div class="form-group">
									<label for="default_angle">Angle</label>
									<select id="default_angle" bind:value={settings.defaults.angle}>
										{#each angles as a}
											<option value={a.value}>{a.label}</option>
										{/each}
									</select>
								</div>

								<div class="form-group">
									<label for="default_age">Patient Age</label>
									<input
										type="number"
										id="default_age"
										bind:value={settings.defaults.defaultPatientAge}
										min="1"
										max="120"
									/>
									<p class="field-hint">Default for DOB year picker</p>
								</div>
							</div>
						</div>
					</section>
				{/if}
			</div>

			<div class="footer">
				<button type="button" class="reset-btn" onclick={() => showResetModal = true}>
					Factory Reset
				</button>
				<div class="footer-spacer"></div>
				{#if saveMessage}
					<div class="save-success">{saveMessage}</div>
				{/if}
				{#if saveError}
					<div class="save-error">{saveError}</div>
				{/if}
				<button type="submit" class="save-btn" disabled={isSaving}>
					{isSaving ? 'Saving...' : 'Save Settings'}
				</button>
			</div>
		</form>
	{/if}
</div>

<!-- Factory Reset Confirmation Modal -->
{#if showResetModal}
	<div class="modal-overlay" onclick={() => showResetModal = false}>
		<div class="modal reset-modal" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h3>Factory Reset</h3>
				<button type="button" class="modal-close" onclick={() => showResetModal = false}>&times;</button>
			</div>
			<div class="modal-body">
				<p>This will reset all settings to factory defaults:</p>
				<ul>
					<li>Storage paths</li>
					<li>All surgeons (removed)</li>
					<li>Form defaults (procedure, image type, angle, etc.)</li>
				</ul>
				<p class="warning-text">Patient data and procedures are stored separately and will not be affected.</p>
			</div>
			<div class="modal-footer">
				<button type="button" class="btn-secondary" onclick={() => showResetModal = false}>Cancel</button>
				<button type="button" class="btn-danger" onclick={handleFactoryReset} disabled={isResetting}>
					{isResetting ? 'Resetting...' : 'Reset to Factory Defaults'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- File Picker Modal -->
{#if showFilePicker}
	<div class="modal-overlay" onclick={cancelFilePicker}>
		<div class="modal file-picker-modal" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h3>Select {filePickerMode === 'file' ? 'File' : 'Directory'}</h3>
				<button type="button" class="modal-close" onclick={cancelFilePicker}>&times;</button>
			</div>
			<div class="modal-body">
				<div class="current-path">
					<button type="button" class="nav-btn" onclick={navigateToParent}>&larr; Up</button>
					<input type="text" value={filePickerPath} readonly class="path-display" />
				</div>
				<div class="file-list">
					{#each filePickerEntries as entry}
						<button
							type="button"
							class="file-entry"
							class:directory={entry.isDirectory}
							class:file={entry.isFile}
							onclick={() => selectEntry(entry)}
						>
							<span class="entry-icon">{entry.isDirectory ? '📁' : '📄'}</span>
							<span class="entry-name">{entry.name}</span>
						</button>
					{/each}
					{#if filePickerEntries.length === 0}
						<div class="empty-dir">Empty directory</div>
					{/if}
				</div>
			</div>
			<div class="modal-footer">
				<button type="button" class="btn-secondary" onclick={cancelFilePicker}>Cancel</button>
				{#if filePickerMode === 'directory'}
					<button type="button" class="btn-primary" onclick={() => confirmFilePicker()}>
						Select This Directory
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.settings-panel {
		height: 100%;
		width: 100%;
		display: flex;
		flex-direction: column;
		background: #f3e8ff;
	}

	.loading {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: #666;
	}

	form {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.subtab-nav {
		display: flex;
		align-items: flex-end;
		gap: 2px;
		background: #f3e8ff;
		padding: 0.5rem 1rem 0 1rem;
	}

	.subtab {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 6px 6px 0 0;
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s;
		background: #ede9fe;
		color: #7c3aed;
	}

	.subtab:hover {
		background: #ddd6fe;
	}

	.subtab.active {
		background: #ddd6fe;
		color: #5b21b6;
		box-shadow: 0 2px 0 0 #ddd6fe;
	}

	.tab-content {
		flex: 1;
		padding: 1rem;
		overflow: auto;
		background: #ddd6fe;
	}

	.settings-section {
		background: white;
		border-radius: 8px;
		padding: 1.25rem;
		box-shadow: 0 1px 3px rgba(0,0,0,0.1);
		display: flex;
		flex-direction: column;
		width: 100%;
		max-width: 50%;
		min-width: 400px;
	}

	.settings-section h2 {
		font-size: 1rem;
		font-weight: 600;
		color: #333;
		margin: 0 0 1rem 0;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid #e5e7eb;
	}


	.section-content {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		flex: 1;
	}

	.defaults-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 1rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.form-group label {
		font-size: 0.8125rem;
		font-weight: 500;
		color: #555;
	}

	.field-hint {
		font-size: 0.6875rem;
		color: #888;
		margin: 0;
	}

	.form-group input[type="text"],
	.form-group input[type="number"],
	.form-group select {
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 0.875rem;
		background: white;
	}

	.form-group input[type="number"] {
		width: 5rem;
	}

	.form-group input:focus,
	.form-group select:focus {
		outline: none;
		border-color: #2563eb;
	}

	.path-input-row {
		display: flex;
		gap: 0.5rem;
	}

	.path-input-row input {
		flex: 1;
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 0.875rem;
	}

	.browse-btn {
		padding: 0.5rem 0.75rem;
		background: #f3f4f6;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 0.8125rem;
		cursor: pointer;
		white-space: nowrap;
	}

	.browse-btn:hover {
		background: #e5e7eb;
	}

	.checkbox-label {
		flex-direction: row !important;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		font-weight: normal !important;
	}

	.checkbox-label input[type="checkbox"] {
		width: auto;
		margin: 0;
	}

	.radio-group {
		display: flex;
		gap: 1.5rem;
		margin-top: 0.25rem;
	}

	.radio-label {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		cursor: pointer;
		font-size: 0.875rem;
		font-weight: normal !important;
	}

	.radio-label input[type="radio"] {
		width: auto;
		margin: 0;
	}

	.path-preview {
		background: #f0f4f8;
		padding: 0.625rem;
		border-radius: 4px;
		margin-top: 0.5rem;
	}

	.preview-label {
		display: block;
		font-size: 0.6875rem;
		color: #666;
		margin-bottom: 0.125rem;
	}

	.path-preview code {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
		font-size: 0.75rem;
		color: #2563eb;
		word-break: break-all;
	}

	/* CSV Import Row */
	.csv-import-row {
		display: flex;
		gap: 0.5rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.csv-import-row input {
		flex: 1;
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 0.8125rem;
	}

	.import-btn {
		padding: 0.5rem 0.75rem;
		background: #059669;
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 0.8125rem;
		cursor: pointer;
	}

	.import-btn:hover:not(:disabled) {
		background: #047857;
	}

	.import-btn:disabled {
		background: #9ca3af;
		cursor: not-allowed;
	}

	.inline-error {
		color: #dc2626;
		font-size: 0.8125rem;
		padding: 0.25rem 0;
	}

	.inline-success {
		color: #047857;
		font-size: 0.8125rem;
		padding: 0.25rem 0;
	}

	/* List (surgeons/procedures) */
	.list-container {
		flex: 1;
		overflow-y: auto;
		max-height: 200px;
		min-height: 100px;
	}

	.list-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem;
		background: #f8f9fa;
		border-radius: 4px;
		margin-bottom: 0.5rem;
	}

	.item-name {
		flex: 1;
		font-size: 0.875rem;
	}

	.item-id {
		font-size: 0.75rem;
		color: #888;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
	}

	.edit-input {
		flex: 1;
		padding: 0.375rem 0.5rem;
		border: 1px solid #2563eb;
		border-radius: 3px;
		font-size: 0.8125rem;
	}

	.item-btn {
		padding: 0.25rem 0.5rem;
		border: 1px solid #ccc;
		border-radius: 3px;
		background: white;
		font-size: 0.6875rem;
		cursor: pointer;
	}

	.item-btn:hover {
		background: #f5f5f5;
	}

	.item-btn.edit {
		color: #2563eb;
		border-color: #2563eb;
	}

	.item-btn.delete {
		color: #dc2626;
		border-color: #dc2626;
	}

	.item-btn.save {
		background: #2563eb;
		color: white;
		border-color: #2563eb;
	}

	.item-btn.cancel {
		color: #666;
	}

	.empty-list {
		color: #999;
		font-size: 0.8125rem;
		font-style: italic;
		padding: 1rem;
		text-align: center;
	}

	.add-row {
		display: flex;
		gap: 0.5rem;
	}

	.add-row input {
		flex: 1;
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 0.875rem;
	}

	.add-row input:focus {
		outline: none;
		border-color: #2563eb;
	}

	.add-btn {
		padding: 0.5rem 1rem;
		background: #2563eb;
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 0.8125rem;
		cursor: pointer;
	}

	.add-btn:hover {
		background: #1d4ed8;
	}

	/* Footer */
	.footer {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 1rem;
		padding: 1rem;
		background: white;
		border-top: 1px solid #e5e7eb;
		flex-wrap: wrap;
	}

	.save-success, .import-success {
		background: #ecfdf5;
		border: 1px solid #10b981;
		color: #047857;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		font-size: 0.8125rem;
	}

	.save-error, .import-error {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #dc2626;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		font-size: 0.8125rem;
	}

	.save-btn {
		padding: 0.625rem 1.5rem;
		background: #2563eb;
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
	}

	.save-btn:hover:not(:disabled) {
		background: #1d4ed8;
	}

	.save-btn:disabled {
		background: #9ca3af;
		cursor: not-allowed;
	}

	.reset-btn {
		padding: 0.5rem 1rem;
		background: transparent;
		color: #dc2626;
		border: 1px solid #dc2626;
		border-radius: 4px;
		font-size: 0.8125rem;
		cursor: pointer;
	}

	.reset-btn:hover {
		background: #fef2f2;
	}

	.footer-spacer {
		flex: 1;
	}

	.btn-danger {
		padding: 0.5rem 1rem;
		background: #dc2626;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}

	.btn-danger:hover:not(:disabled) {
		background: #b91c1c;
	}

	.btn-danger:disabled {
		background: #9ca3af;
		cursor: not-allowed;
	}

	.reset-modal .warning-text {
		font-size: 0.8125rem;
		color: #059669;
		font-style: italic;
	}

	.reset-modal ul {
		margin: 0.5rem 0;
		padding-left: 1.5rem;
		font-size: 0.875rem;
		color: #666;
	}

	/* File Picker Modal */
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
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
		max-width: 90vw;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
	}

	.file-picker-modal {
		width: 600px;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.modal-header h3 {
		margin: 0;
		font-size: 1.125rem;
	}

	.modal-close {
		background: none;
		border: none;
		font-size: 1.5rem;
		color: #666;
		cursor: pointer;
		line-height: 1;
	}

	.modal-close:hover {
		color: #333;
	}

	.modal-body {
		flex: 1;
		padding: 1rem 1.25rem;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.current-path {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.nav-btn {
		padding: 0.5rem 0.75rem;
		background: #f3f4f6;
		border: 1px solid #ddd;
		border-radius: 4px;
		cursor: pointer;
	}

	.nav-btn:hover {
		background: #e5e7eb;
	}

	.path-display {
		flex: 1;
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		background: #f9fafb;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
		font-size: 0.8125rem;
	}

	.file-list {
		flex: 1;
		overflow-y: auto;
		border: 1px solid #e5e7eb;
		border-radius: 4px;
		max-height: 300px;
	}

	.file-entry {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.625rem 0.75rem;
		background: none;
		border: none;
		border-bottom: 1px solid #f3f4f6;
		text-align: left;
		cursor: pointer;
		font-size: 0.875rem;
	}

	.file-entry:hover {
		background: #f3f4f6;
	}

	.file-entry.directory {
		font-weight: 500;
	}

	.entry-icon {
		font-size: 1rem;
	}

	.entry-name {
		flex: 1;
	}

	.empty-dir {
		padding: 2rem;
		text-align: center;
		color: #999;
		font-style: italic;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		border-top: 1px solid #e5e7eb;
	}

	.btn-secondary {
		padding: 0.5rem 1rem;
		background: #f3f4f6;
		border: 1px solid #ddd;
		border-radius: 4px;
		cursor: pointer;
	}

	.btn-secondary:hover {
		background: #e5e7eb;
	}

	.btn-primary {
		padding: 0.5rem 1rem;
		background: #2563eb;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}

	.btn-primary:hover {
		background: #1d4ed8;
	}
</style>
