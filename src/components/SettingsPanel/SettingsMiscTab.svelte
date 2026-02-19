<script>
	let { state, imageTypes, angles } = $props();
</script>

<section class="settings-section">
	<h2>Other Defaults</h2>
	<div class="section-content">
		<div class="defaults-grid">
			<div class="form-group">
				<label for="default_image_type">Image Type</label>
				<select id="default_image_type" bind:value={state.settings.defaults.imageType}>
					{#each imageTypes as type}
						<option value={type.value}>{type.label}</option>
					{/each}
				</select>
			</div>

			<div class="form-group">
				<label for="default_angle">Angle</label>
				<select id="default_angle" bind:value={state.settings.defaults.angle}>
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
					bind:value={state.settings.defaults.defaultPatientAge}
					min="1"
					max="120"
				/>
				<p class="field-hint">Default for DOB year picker</p>
			</div>
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

	.field-hint {
		font-size: 0.6875rem;
		color: #888;
		margin: 0;
	}
</style>
