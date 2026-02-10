<script>
	import { createSettingsPanelState, imageTypes, angles } from './SettingsPanel.svelte.ts';
	import SettingsStorageTab from './SettingsStorageTab.svelte';
	import CrudListTab from './CrudListTab.svelte';
	import SettingsMiscTab from './SettingsMiscTab.svelte';
	import SettingsFooter from './SettingsFooter.svelte';
	import FactoryResetModal from './FactoryResetModal.svelte';
	import FilePickerModal from './FilePickerModal.svelte';

	const state = createSettingsPanelState();
</script>

<div class="settings-panel">
	{#if state.isLoading}
		<div class="loading">Loading settings...</div>
	{:else}
		<form onsubmit={(e) => { e.preventDefault(); state.handleSave(); }}>
			<div class="subtab-nav">
				<button
					type="button"
					class="subtab"
					class:active={state.activeTab === 'storage'}
					onclick={() => state.activeTab = 'storage'}
				>
					Storage
				</button>
				<button
					type="button"
					class="subtab"
					class:active={state.activeTab === 'procedures'}
					onclick={() => state.activeTab = 'procedures'}
				>
					Procedures
				</button>
				<button
					type="button"
					class="subtab"
					class:active={state.activeTab === 'surgeons'}
					onclick={() => state.activeTab = 'surgeons'}
				>
					Surgeons
				</button>
				<button
					type="button"
					class="subtab"
					class:active={state.activeTab === 'misc'}
					onclick={() => state.activeTab = 'misc'}
				>
					Misc
				</button>
			</div>

			<div class="tab-content">
				{#if state.activeTab === 'storage'}
					<SettingsStorageTab {state} />
				{/if}

				{#if state.activeTab === 'procedures'}
					<CrudListTab
						title="Procedures"
						items={state.procedures}
						defaultValue={state.settings.defaults.procedure}
						newItemName={state.newProcedureName}
						editingItemId={state.editingProcedureId}
						editingItemName={state.editingProcedureName}
						importErr={state.proceduresImportErr}
						importMsg={state.proceduresImportMsg}
						onDefaultChange={(v) => state.settings.defaults.procedure = v}
						onNewItemNameChange={(v) => state.newProcedureName = v}
						onEditingNameChange={(v) => state.editingProcedureName = v}
						onAdd={state.addProcedure}
						onStartEdit={state.startEditProcedure}
						onSaveEdit={state.saveEditProcedure}
						onCancelEdit={state.cancelEditProcedure}
						onDelete={state.deleteProcedureById}
						onEditKeydown={state.handleProcedureEditKeydown}
						onAddKeydown={state.handleProcedureKeydown}
						onImport={() => state.openFilePicker('proceduresCsv', 'file')}
					/>
				{/if}

				{#if state.activeTab === 'surgeons'}
					<CrudListTab
						title="Surgeons"
						items={state.surgeons}
						defaultValue={state.settings.defaults.surgeon}
						newItemName={state.newSurgeonName}
						editingItemId={state.editingSurgeonId}
						editingItemName={state.editingSurgeonName}
						importErr={state.surgeonsImportErr}
						importMsg={state.surgeonsImportMsg}
						onDefaultChange={(v) => state.settings.defaults.surgeon = v}
						onNewItemNameChange={(v) => state.newSurgeonName = v}
						onEditingNameChange={(v) => state.editingSurgeonName = v}
						onAdd={state.addSurgeon}
						onStartEdit={state.startEditSurgeon}
						onSaveEdit={state.saveEditSurgeon}
						onCancelEdit={state.cancelEditSurgeon}
						onDelete={state.deleteSurgeonById}
						onEditKeydown={state.handleSurgeonEditKeydown}
						onAddKeydown={state.handleSurgeonKeydown}
						onImport={() => state.openFilePicker('surgeonsCsv', 'file')}
					/>
				{/if}

				{#if state.activeTab === 'misc'}
					<SettingsMiscTab {state} {imageTypes} {angles} />
				{/if}
			</div>

			<SettingsFooter {state} />
		</form>
	{/if}
</div>

<FactoryResetModal
	show={state.showResetModal}
	isResetting={state.isResetting}
	onCancel={() => state.showResetModal = false}
	onConfirm={state.handleFactoryReset}
/>

<FilePickerModal
	show={state.showFilePicker}
	path={state.filePickerPath}
	entries={state.filePickerEntries}
	mode={state.filePickerMode}
	onCancel={state.cancelFilePicker}
	onNavigateToParent={state.navigateToParent}
	onSelectEntry={state.selectEntry}
	onConfirm={state.confirmFilePicker}
/>

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
</style>
