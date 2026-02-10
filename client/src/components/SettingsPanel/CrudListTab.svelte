<script>
	let {
		title,
		items,
		defaultValue,
		newItemName,
		editingItemId,
		editingItemName,
		importErr,
		importMsg,
		onDefaultChange,
		onNewItemNameChange,
		onEditingNameChange,
		onAdd,
		onStartEdit,
		onSaveEdit,
		onCancelEdit,
		onDelete,
		onEditKeydown,
		onAddKeydown,
		onImport,
	} = $props();
</script>

<section class="settings-section">
	<h2>{title}</h2>
	<div class="section-content">
		<div class="form-group">
			<label for="default_{title.toLowerCase()}">Default {title.slice(0, -1)}</label>
			<select id="default_{title.toLowerCase()}" value={defaultValue} onchange={(e) => onDefaultChange(e.target.value)}>
				{#if title === 'Surgeons'}
					<option value="">None</option>
				{/if}
				{#each items as item}
					<option value={item.id}>{item.name}</option>
				{/each}
			</select>
		</div>

		<div class="csv-import-row">
			<button type="button" class="import-btn" onclick={onImport}>
				Import CSV
			</button>
		</div>
		{#if importErr}
			<div class="inline-error">{importErr}</div>
		{/if}
		{#if importMsg}
			<div class="inline-success">{importMsg}</div>
		{/if}

		<div class="list-container">
			{#each items as item}
				<div class="list-item">
					{#if editingItemId === item.id}
						<input
							type="text"
							value={editingItemName}
							oninput={(e) => onEditingNameChange(e.target.value)}
							onkeydown={onEditKeydown}
							class="edit-input"
						/>
						<button type="button" class="item-btn save" onclick={onSaveEdit}>Save</button>
						<button type="button" class="item-btn cancel" onclick={onCancelEdit}>Cancel</button>
					{:else}
						<span class="item-name">{item.name}</span>
						<span class="item-id">{item.id}</span>
						<button type="button" class="item-btn edit" onclick={() => onStartEdit(item)}>Edit</button>
						<button type="button" class="item-btn delete" onclick={() => onDelete(item.id)}>Delete</button>
					{/if}
				</div>
			{/each}
			{#if items.length === 0}
				<div class="empty-list">No {title.toLowerCase()} added yet</div>
			{/if}
		</div>

		<div class="add-row">
			<input
				type="text"
				value={newItemName}
				oninput={(e) => onNewItemNameChange(e.target.value)}
				placeholder="Add {title.toLowerCase().slice(0, -1)}..."
				onkeydown={onAddKeydown}
			/>
			<button type="button" class="add-btn" onclick={onAdd}>Add</button>
		</div>
	</div>
</section>

<style>
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

	.form-group select {
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 0.875rem;
		background: white;
	}

	.form-group select:focus {
		outline: none;
		border-color: #2563eb;
	}

	.csv-import-row {
		display: flex;
		gap: 0.5rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid #e5e7eb;
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
</style>
