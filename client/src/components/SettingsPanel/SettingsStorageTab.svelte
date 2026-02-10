<script>
	let { state } = $props();
</script>

<section class="settings-section">
	<h2>Storage Paths</h2>
	<div class="section-content">
		<div class="form-group">
			<label for="source_root">Default Source Path</label>
			<div class="path-input-row">
				<input
					type="text"
					id="source_root"
					bind:value={state.settings.sourceRoot}
					placeholder="/path/to/unsorted/images"
				/>
				<button type="button" class="browse-btn" onclick={() => state.openFilePicker('source', 'directory')}>
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
					bind:value={state.settings.destinationRoot}
					placeholder="/path/to/imagestore"
				/>
				<button type="button" class="browse-btn" onclick={() => state.openFilePicker('destination', 'directory')}>
					Browse
				</button>
			</div>
			<p class="field-hint">Where sorted images will be saved</p>
		</div>

		<div class="form-group">
			<label class="checkbox-label">
				<input type="checkbox" bind:checked={state.useCustomDataPath} />
				<span>Use custom data path</span>
			</label>
		</div>

		{#if state.useCustomDataPath}
			<div class="form-group">
				<label for="data_path">Data Path</label>
				<div class="path-input-row">
					<input
						type="text"
						id="data_path"
						bind:value={state.settings.dataPath}
						placeholder="/path/to/data/patients.csv"
					/>
					<button type="button" class="browse-btn" onclick={() => state.openFilePicker('data', 'file')}>
						Browse
					</button>
				</div>
			</div>
		{/if}

		<div class="path-preview">
			<span class="preview-label">Patient data location:</span>
			<code>{state.dataPathPreview()}</code>
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

	.field-hint {
		font-size: 0.6875rem;
		color: #888;
		margin: 0;
	}

	.form-group input[type="text"] {
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 0.875rem;
		background: white;
	}

	.form-group input:focus {
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
</style>
