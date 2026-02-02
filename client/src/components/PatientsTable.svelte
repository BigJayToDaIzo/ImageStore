<script lang="ts">
	import type { Patient } from '../lib/patients';

	let patients = $state<Patient[]>([]);
	let searchQuery = $state('');
	let isLoading = $state(true);
	let error = $state('');

	// Editing state
	let editingCase = $state<string | null>(null);
	let editForm = $state({ first_name: '', last_name: '', dob: '', surgery_date: '', primary_procedure: '' });

	// New patient state
	let showAddForm = $state(false);
	let newPatient = $state({ case_number: '', first_name: '', last_name: '', dob: '', surgery_date: '', primary_procedure: '' });
	let addError = $state('');

	// Delete modal state
	let deleteTarget = $state<Patient | null>(null);

	// Sorting state
	let sortColumn = $state<keyof Patient>('case_number');
	let sortDirection = $state<'asc' | 'desc'>('asc');

	// Image store base path
	const DEST_ROOT = '/tmp/imagestore-output';

	// Ghost text for search autocomplete
	let ghostText = $derived(() => {
		if (!searchQuery) return '';
		const first = displayedPatients()[0];
		if (!first) return '';

		// Find which field matches and return completion
		const q = searchQuery.toLowerCase();
		if (first.case_number.toLowerCase().startsWith(q)) {
			return searchQuery + first.case_number.slice(searchQuery.length);
		}
		if (first.last_name.toLowerCase().startsWith(q)) {
			return searchQuery + first.last_name.slice(searchQuery.length);
		}
		if (first.first_name.toLowerCase().startsWith(q)) {
			return searchQuery + first.first_name.slice(searchQuery.length);
		}
		return '';
	});

	function handleSearchKeydown(event: KeyboardEvent) {
		if ((event.key === 'Tab' || event.key === 'Enter') && ghostText()) {
			event.preventDefault();
			searchQuery = ghostText();
		}
	}

	// Filtered and sorted patients
	let displayedPatients = $derived(() => {
		let result = patients;

		// Filter by search
		if (searchQuery) {
			const q = searchQuery.toLowerCase();
			result = result.filter(p =>
				p.case_number.toLowerCase().includes(q) ||
				p.first_name.toLowerCase().includes(q) ||
				p.last_name.toLowerCase().includes(q)
			);
		}

		// Sort
		result = [...result].sort((a, b) => {
			const aVal = a[sortColumn];
			const bVal = b[sortColumn];
			const cmp = aVal.localeCompare(bVal);
			return sortDirection === 'asc' ? cmp : -cmp;
		});

		return result;
	});

	$effect(() => {
		loadPatients();
	});

	async function loadPatients() {
		isLoading = true;
		error = '';
		try {
			const res = await fetch('/api/patients');
			if (!res.ok) throw new Error('Failed to load patients');
			patients = await res.json();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load patients';
		} finally {
			isLoading = false;
		}
	}

	function handleSort(column: keyof Patient) {
		if (sortColumn === column) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortColumn = column;
			sortDirection = 'asc';
		}
	}

	function startEdit(patient: Patient) {
		editingCase = patient.case_number;
		editForm = {
			first_name: patient.first_name,
			last_name: patient.last_name,
			dob: patient.dob,
			surgery_date: patient.surgery_date,
			primary_procedure: patient.primary_procedure
		};
	}

	function cancelEdit() {
		editingCase = null;
		editForm = { first_name: '', last_name: '', dob: '', surgery_date: '', primary_procedure: '' };
	}

	function getImagePath(patient: Patient): string {
		// Build path based on folder structure: /<consent>/<procedure>/<surgery_date>/<case_number>/
		// Since we don't store consent in patient record, show the base case folder
		if (!patient.surgery_date || !patient.primary_procedure) return '';
		return `${DEST_ROOT}/no_consent/${patient.primary_procedure}/${patient.surgery_date}/${patient.case_number}`;
	}

	async function saveEdit() {
		if (!editingCase) return;

		try {
			const res = await fetch('/api/patients', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					case_number: editingCase,
					...editForm
				})
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Failed to update');
			}

			await loadPatients();
			cancelEdit();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to update patient';
		}
	}

	function handleEditKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			saveEdit();
		} else if (event.key === 'Escape') {
			cancelEdit();
		}
	}

	function openAddForm() {
		showAddForm = true;
		newPatient = { case_number: '', first_name: '', last_name: '', dob: '', surgery_date: '', primary_procedure: '' };
		addError = '';
	}

	function cancelAdd() {
		showAddForm = false;
		newPatient = { case_number: '', first_name: '', last_name: '', dob: '', surgery_date: '', primary_procedure: '' };
		addError = '';
	}

	async function submitAdd() {
		addError = '';

		if (!newPatient.case_number || !newPatient.first_name || !newPatient.last_name) {
			addError = 'Case #, first name, and last name are required';
			return;
		}

		try {
			const res = await fetch('/api/patients', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(newPatient)
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Failed to create');
			}

			await loadPatients();
			cancelAdd();
		} catch (e) {
			addError = e instanceof Error ? e.message : 'Failed to create patient';
		}
	}

	function handleAddKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			submitAdd();
		} else if (event.key === 'Escape') {
			cancelAdd();
		}
	}

	function confirmDelete(patient: Patient) {
		deleteTarget = patient;
	}

	function cancelDelete() {
		deleteTarget = null;
	}

	async function executeDelete() {
		if (!deleteTarget) return;

		try {
			const res = await fetch(`/api/patients?case_number=${encodeURIComponent(deleteTarget.case_number)}`, {
				method: 'DELETE'
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Failed to delete');
			}

			await loadPatients();
			cancelDelete();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to delete patient';
			cancelDelete();
		}
	}

	function formatDOB(dob: string): string {
		if (!dob) return '';
		const [year, month, day] = dob.split('-');
		return `${month}/${day}/${year}`;
	}
</script>

<div class="patients-table-container">
	<div class="toolbar">
		<div class="search-wrapper">
			<input
				type="text"
				class="search-input"
				placeholder="Search patients..."
				bind:value={searchQuery}
				onkeydown={handleSearchKeydown}
			/>
			{#if ghostText()}
				<span class="ghost-text">{ghostText()}</span>
			{/if}
		</div>
		<button class="add-btn" onclick={openAddForm}>+ Add Patient</button>
	</div>

	{#if error}
		<div class="error-banner">{error}</div>
	{/if}

	{#if isLoading}
		<div class="loading">Loading patients...</div>
	{:else}
		<div class="table-wrapper">
			<table class="patients-table">
				<thead>
					<tr>
						<th class="sortable" onclick={() => handleSort('case_number')}>
							Case #
							{#if sortColumn === 'case_number'}
								<span class="sort-icon">{sortDirection === 'asc' ? '▲' : '▼'}</span>
							{/if}
						</th>
						<th class="sortable" onclick={() => handleSort('last_name')}>
							Last Name
							{#if sortColumn === 'last_name'}
								<span class="sort-icon">{sortDirection === 'asc' ? '▲' : '▼'}</span>
							{/if}
						</th>
						<th class="sortable" onclick={() => handleSort('first_name')}>
							First Name
							{#if sortColumn === 'first_name'}
								<span class="sort-icon">{sortDirection === 'asc' ? '▲' : '▼'}</span>
							{/if}
						</th>
						<th class="sortable" onclick={() => handleSort('dob')}>
							DOB
							{#if sortColumn === 'dob'}
								<span class="sort-icon">{sortDirection === 'asc' ? '▲' : '▼'}</span>
							{/if}
						</th>
						<th class="sortable" onclick={() => handleSort('surgery_date')}>
							Surgery
							{#if sortColumn === 'surgery_date'}
								<span class="sort-icon">{sortDirection === 'asc' ? '▲' : '▼'}</span>
							{/if}
						</th>
						<th class="sortable" onclick={() => handleSort('primary_procedure')}>
							Procedure
							{#if sortColumn === 'primary_procedure'}
								<span class="sort-icon">{sortDirection === 'asc' ? '▲' : '▼'}</span>
							{/if}
						</th>
						<th>Images</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{#if showAddForm}
						<tr class="add-row">
							<td>
								<input
									type="text"
									bind:value={newPatient.case_number}
									placeholder="Case #"
									onkeydown={handleAddKeydown}
								/>
							</td>
							<td>
								<input
									type="text"
									bind:value={newPatient.last_name}
									placeholder="Last Name"
									onkeydown={handleAddKeydown}
								/>
							</td>
							<td>
								<input
									type="text"
									bind:value={newPatient.first_name}
									placeholder="First Name"
									onkeydown={handleAddKeydown}
								/>
							</td>
							<td>
								<input
									type="date"
									bind:value={newPatient.dob}
									onkeydown={handleAddKeydown}
								/>
							</td>
							<td>
								<input
									type="date"
									bind:value={newPatient.surgery_date}
									onkeydown={handleAddKeydown}
								/>
							</td>
							<td>
								<input
									type="text"
									bind:value={newPatient.primary_procedure}
									placeholder="Procedure"
									onkeydown={handleAddKeydown}
								/>
							</td>
							<td></td>
							<td class="actions">
								<button class="action-btn save" onclick={submitAdd}>Save</button>
								<button class="action-btn cancel" onclick={cancelAdd}>Cancel</button>
							</td>
						</tr>
						{#if addError}
							<tr class="error-row">
								<td colspan="8">{addError}</td>
							</tr>
						{/if}
					{/if}

					{#each displayedPatients() as patient}
						<tr class:editing={editingCase === patient.case_number}>
							<td class="case-number">{patient.case_number}</td>
							{#if editingCase === patient.case_number}
								<td>
									<input
										type="text"
										bind:value={editForm.last_name}
										onkeydown={handleEditKeydown}
									/>
								</td>
								<td>
									<input
										type="text"
										bind:value={editForm.first_name}
										onkeydown={handleEditKeydown}
									/>
								</td>
								<td>
									<input
										type="date"
										bind:value={editForm.dob}
										onkeydown={handleEditKeydown}
									/>
								</td>
								<td>
									<input
										type="date"
										bind:value={editForm.surgery_date}
										onkeydown={handleEditKeydown}
									/>
								</td>
								<td>
									<input
										type="text"
										bind:value={editForm.primary_procedure}
										onkeydown={handleEditKeydown}
									/>
								</td>
								<td></td>
								<td class="actions">
									<button class="action-btn save" onclick={saveEdit}>Save</button>
									<button class="action-btn cancel" onclick={cancelEdit}>Cancel</button>
								</td>
							{:else}
								<td>{patient.last_name}</td>
								<td>{patient.first_name}</td>
								<td>{formatDOB(patient.dob)}</td>
								<td>{patient.surgery_date}</td>
								<td class="procedure">{patient.primary_procedure}</td>
								<td class="images-link">
									{#if getImagePath(patient)}
										<button
											class="action-btn view"
											onclick={() => navigator.clipboard.writeText(getImagePath(patient))}
											title={getImagePath(patient)}
										>
											Copy Path
										</button>
									{:else}
										<span class="no-images">—</span>
									{/if}
								</td>
								<td class="actions">
									<button class="action-btn edit" onclick={() => startEdit(patient)}>Edit</button>
									<button class="action-btn delete" onclick={() => confirmDelete(patient)}>Delete</button>
								</td>
							{/if}
						</tr>
					{/each}

					{#if displayedPatients().length === 0 && !showAddForm}
						<tr>
							<td colspan="8" class="empty-message">
								{searchQuery ? 'No patients match your search' : 'No patients yet'}
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	{/if}
</div>

{#if deleteTarget}
	<div class="modal-overlay" onclick={cancelDelete}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<h3>Delete Patient?</h3>
			<p>Are you sure you want to delete patient <strong>{deleteTarget.case_number}</strong> ({deleteTarget.last_name}, {deleteTarget.first_name})?</p>
			<p class="warning">This action cannot be undone.</p>
			<div class="modal-actions">
				<button class="modal-btn secondary" onclick={cancelDelete}>Cancel</button>
				<button class="modal-btn danger" onclick={executeDelete}>Delete</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.patients-table-container {
		display: flex;
		flex-direction: column;
		height: 100%;
		width: 100%;
		padding: 1.5rem;
		background: #fff;
		overflow: hidden;
	}

	.toolbar {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.search-wrapper {
		position: relative;
		flex: 1;
		max-width: 300px;
	}

	.search-input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		font-size: 0.9375rem;
		background: transparent;
		position: relative;
		z-index: 1;
	}

	.search-input:focus {
		outline: none;
		border-color: #2563eb;
	}

	.ghost-text {
		position: absolute;
		top: 0;
		left: 0;
		padding: 0.5rem 0.75rem;
		font-size: 0.9375rem;
		color: #9ca3af;
		pointer-events: none;
		white-space: nowrap;
		overflow: hidden;
	}

	.add-btn {
		padding: 0.5rem 1rem;
		background: #2563eb;
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
	}

	.add-btn:hover {
		background: #1d4ed8;
	}

	.error-banner {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #dc2626;
		padding: 0.5rem 0.75rem;
		border-radius: 4px;
		margin-bottom: 1rem;
		font-size: 0.875rem;
	}

	.loading {
		display: flex;
		align-items: center;
		justify-content: center;
		flex: 1;
		color: #666;
	}

	.table-wrapper {
		flex: 1;
		overflow: auto;
		border: 1px solid #ddd;
		border-radius: 4px;
	}

	.patients-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9375rem;
	}

	.patients-table th {
		position: sticky;
		top: 0;
		background: #f8f8f8;
		border-bottom: 1px solid #ddd;
		padding: 0.75rem 1rem;
		text-align: left;
		font-weight: 600;
		color: #333;
	}

	.patients-table th.sortable {
		cursor: pointer;
		user-select: none;
	}

	.patients-table th.sortable:hover {
		background: #f0f0f0;
	}

	.sort-icon {
		font-size: 0.625rem;
		margin-left: 0.25rem;
		color: #2563eb;
	}

	.patients-table td {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid #eee;
		vertical-align: middle;
	}

	.patients-table tr:hover:not(.add-row):not(.error-row) {
		background: #fafafa;
	}

	.patients-table tr.editing {
		background: #eff6ff;
	}

	.case-number {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
		font-weight: 500;
	}

	.actions {
		white-space: nowrap;
	}

	.action-btn {
		padding: 0.25rem 0.5rem;
		border: 1px solid #ccc;
		border-radius: 3px;
		background: white;
		font-size: 0.75rem;
		cursor: pointer;
		margin-right: 0.25rem;
	}

	.action-btn:hover {
		background: #f5f5f5;
	}

	.action-btn.edit {
		color: #2563eb;
		border-color: #2563eb;
	}

	.action-btn.delete {
		color: #dc2626;
		border-color: #dc2626;
	}

	.action-btn.save {
		background: #2563eb;
		color: white;
		border-color: #2563eb;
	}

	.action-btn.save:hover {
		background: #1d4ed8;
	}

	.action-btn.cancel {
		color: #666;
	}

	.action-btn.view {
		color: #059669;
		border-color: #059669;
	}

	.procedure {
		text-transform: capitalize;
	}

	.images-link {
		white-space: nowrap;
	}

	.no-images {
		color: #9ca3af;
	}

	.add-row {
		background: #f0fdf4;
	}

	.add-row input {
		width: 100%;
		padding: 0.375rem 0.5rem;
		border: 1px solid #ccc;
		border-radius: 3px;
		font-size: 0.875rem;
	}

	.add-row input:focus {
		outline: none;
		border-color: #2563eb;
	}

	.error-row td {
		background: #fef2f2;
		color: #dc2626;
		font-size: 0.875rem;
		padding: 0.5rem 1rem;
	}

	.editing input {
		width: 100%;
		padding: 0.375rem 0.5rem;
		border: 1px solid #2563eb;
		border-radius: 3px;
		font-size: 0.875rem;
	}

	.empty-message {
		text-align: center;
		color: #666;
		padding: 2rem 1rem !important;
	}

	/* Modal styles */
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
		margin: 0 0 0.75rem 0;
		font-size: 0.9375rem;
		color: #555;
		line-height: 1.4;
	}

	.modal .warning {
		color: #dc2626;
		font-size: 0.875rem;
	}

	.modal-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
		margin-top: 1rem;
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

	.modal-btn.secondary {
		background: transparent;
		border-color: #ddd;
		color: #666;
	}

	.modal-btn.danger {
		background: #dc2626;
		color: white;
		border-color: #dc2626;
	}

	.modal-btn.danger:hover {
		background: #b91c1c;
	}
</style>
