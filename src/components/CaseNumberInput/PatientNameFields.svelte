<script>
	let { state } = $props();
</script>

<div class="name-row">
	<div class="form-group">
		<label for="last_name">Last Name</label>
		<div class="ghost-input-wrapper">
			<input
				type="text"
				id="last_name"
				bind:value={state.lastName}
				readonly={!!state.selectedPatient}
				class:readonly={!!state.selectedPatient}
				placeholder={state.ghostPatient ? '' : 'Last name...'}
			/>
			{#if state.ghostPatient && !state.lastName}
				<span class="ghost-text">{state.ghostPatient.last_name}</span>
			{/if}
		</div>
	</div>
	<div class="form-group">
		<label for="first_name">First Name</label>
		<div class="ghost-input-wrapper">
			<input
				type="text"
				id="first_name"
				bind:value={state.firstName}
				readonly={!!state.selectedPatient}
				class:readonly={!!state.selectedPatient}
				placeholder={state.ghostPatient ? '' : 'First name...'}
			/>
			{#if state.ghostPatient && !state.firstName}
				<span class="ghost-text">{state.ghostPatient.first_name}</span>
			{/if}
		</div>
	</div>
</div>

<style>
	.form-group {
		margin-bottom: 0.75rem;
	}

	.form-group label {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		color: #555;
		margin-bottom: 0.25rem;
	}

	.form-group input {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		font-size: 0.9375rem;
	}

	.form-group input:focus {
		outline: none;
		border-color: #2563eb;
	}

	.form-group input.readonly {
		background: #f5f5f5;
		color: #666;
		cursor: not-allowed;
	}

	.name-row {
		display: flex;
		gap: 0.75rem;
	}

	.name-row .form-group {
		flex: 1;
	}

	.ghost-input-wrapper {
		position: relative;
	}

	.ghost-input-wrapper input {
		background: transparent;
		position: relative;
		z-index: 1;
	}

	.ghost-text {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		padding: 0.5rem;
		font-size: 0.9375rem;
		color: #9ca3af;
		pointer-events: none;
		white-space: nowrap;
		overflow: hidden;
	}
</style>
