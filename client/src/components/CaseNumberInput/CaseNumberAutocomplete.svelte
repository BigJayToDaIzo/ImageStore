<script>
	let { state } = $props();
</script>

<div class="form-group">
	<label for="case_number">Case Number</label>
	<div class="case-input-wrapper">
		<input
			type="text"
			id="case_number"
			bind:value={state.caseNumber}
			oninput={state.handleCaseNumberInput}
			onkeydown={state.handleCaseNumberKeydown}
			onfocus={() => state.showSuggestions = state.suggestions.length > 0 && !state.selectedPatient}
			onblur={() => setTimeout(() => state.showSuggestions = false, 150)}
			placeholder={state.ghostCaseNumber() ? '' : 'Start typing...'}
			autocomplete="off"
		/>
		{#if state.ghostCaseNumber()}
			<span class="ghost-text case-ghost">{state.ghostCaseNumber()}</span>
		{/if}
		{#if state.showSuggestions}
			<ul class="suggestions-dropdown">
				{#each state.suggestions as patient}
					<li>
						<button type="button" onmousedown={() => state.selectPatient(patient)}>
							<span class="suggestion-case">{patient.case_number}</span>
							<span class="suggestion-name">{patient.last_name}, {patient.first_name}</span>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
	{#if state.selectedPatient}
		<span class="patient-selected">Existing patient selected</span>
	{:else if state.ghostPatient}
		<span class="ghost-hint">Press Tab or Enter to select {state.ghostPatient.last_name}, {state.ghostPatient.first_name}</span>
	{/if}
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

	.case-input-wrapper {
		position: relative;
	}

	.case-input-wrapper input {
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

	.case-ghost {
		padding: 0.5rem;
	}

	.suggestions-dropdown {
		position: absolute;
		top: 0;
		right: calc(100% + 0.5rem);
		width: 280px;
		background: white;
		border: 1px solid #ccc;
		border-radius: 4px;
		box-shadow: -4px 4px 8px rgba(0, 0, 0, 0.1);
		list-style: none;
		margin: 0;
		padding: 0;
		z-index: 1000;
		max-height: 200px;
		overflow-y: auto;
	}

	.suggestions-dropdown li button {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: none;
		background: white;
		text-align: left;
		cursor: pointer;
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}

	.suggestions-dropdown li button:hover {
		background: #eff6ff;
	}

	.suggestion-case {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
		font-weight: 600;
		color: #2563eb;
	}

	.suggestion-name {
		color: #555;
		font-size: 0.875rem;
	}

	.patient-selected {
		display: inline-block;
		margin-top: 0.25rem;
		font-size: 0.75rem;
		color: #059669;
		background: #ecfdf5;
		padding: 0.125rem 0.5rem;
		border-radius: 3px;
	}

	.ghost-hint {
		display: inline-block;
		margin-top: 0.25rem;
		font-size: 0.75rem;
		color: #6b7280;
		font-style: italic;
	}
</style>
