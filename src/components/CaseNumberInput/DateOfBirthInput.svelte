<script>
	let { state, months } = $props();
</script>

<div class="form-group">
	<label for="dob_text">Date of Birth</label>
	<div class="ghost-input-wrapper">
		<input
			type="text"
			id="dob_text"
			bind:value={state.dobText}
			oninput={state.handleTextInput}
			onblur={state.handleTextBlur}
			onkeydown={state.handleTextKeydown}
			placeholder={state.ghostPatient ? '' : state.dobPlaceholder()}
			maxlength="10"
			class:error={state.dobError}
			readonly={!!state.selectedPatient}
			class:readonly={!!state.selectedPatient}
		/>
		{#if state.ghostPatient && !state.dobText}
			<span class="ghost-text">{state.ghostDOB()}</span>
		{/if}
	</div>
	{#if state.dobError}
		<span class="error-msg">{state.dobError}</span>
	{/if}
	{#if !state.selectedPatient}
		<div class="dob-selects">
			<select bind:value={state.dobMonth} onchange={state.syncTextFromDropdowns} aria-label="Month">
				<option value="">Month</option>
				{#each months as month}
					<option value={month.value}>{month.label}</option>
				{/each}
			</select>

			<select bind:value={state.dobDay} onchange={state.syncTextFromDropdowns} aria-label="Day">
				<option value="">Day</option>
				{#each Array.from({ length: state.daysInMonth() }, (_, i) => i + 1) as day}
					<option value={String(day).padStart(2, '0')}>{day}</option>
				{/each}
			</select>

			<div class="year-picker-container">
				<button
					type="button"
					class="year-button"
					onclick={state.selectDefaultYear}
				>
					{state.dobYear || state.currentYear - state.defaultAge}
				</button>

				{#if state.yearPickerOpen}
					<div class="year-picker-modal">
						<div class="year-display">{state.dobYear}</div>
						<div class="year-adjust-row">
							<button type="button" onclick={() => state.adjustYear(-50)}>−50</button>
							<button type="button" onclick={() => state.adjustYear(-10)}>−10</button>
							<button type="button" onclick={() => state.adjustYear(-5)}>−5</button>
							<button type="button" onclick={() => state.adjustYear(-1)}>−1</button>
						</div>
						<div class="year-adjust-row">
							<button type="button" onclick={() => state.adjustYear(1)}>+1</button>
							<button type="button" onclick={() => state.adjustYear(5)}>+5</button>
							<button type="button" onclick={() => state.adjustYear(10)}>+10</button>
							<button type="button" onclick={() => state.adjustYear(50)}>+50</button>
						</div>
						<button type="button" class="year-done" onclick={state.closeYearPicker}>Done</button>
					</div>
				{/if}
			</div>
		</div>
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

	.form-group input.readonly {
		background: #f5f5f5;
		color: #666;
		cursor: not-allowed;
	}

	.form-group input.error {
		border-color: #dc2626;
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

	.error-msg {
		display: block;
		font-size: 0.75rem;
		color: #dc2626;
		margin-top: 0.25rem;
		margin-bottom: 0.25rem;
	}

	.dob-selects {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.dob-selects select {
		flex: 1;
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		font-size: 0.9375rem;
		background: white;
	}

	.dob-selects select:first-child {
		flex: 1.5;
	}

	.year-picker-container {
		position: relative;
		flex: 0.8;
	}

	.year-button {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		font-size: 0.9375rem;
		background: white;
		cursor: pointer;
		text-align: center;
	}

	.year-button:hover {
		border-color: #2563eb;
	}

	.year-picker-modal {
		position: absolute;
		bottom: 100%;
		left: 50%;
		transform: translateX(-50%);
		background: white;
		border: 1px solid #ccc;
		border-radius: 6px;
		padding: 0.75rem;
		box-shadow: 0 4px 12px rgba(0,0,0,0.15);
		z-index: 100;
		margin-bottom: 0.5rem;
	}

	.year-display {
		text-align: center;
		font-size: 1.5rem;
		font-weight: 600;
		color: #2563eb;
		margin-bottom: 0.5rem;
	}

	.year-adjust-row {
		display: flex;
		gap: 0.25rem;
		margin-bottom: 0.25rem;
	}

	.year-adjust-row button {
		flex: 1;
		padding: 0.5rem 0.25rem;
		font-size: 0.8125rem;
		background: #f0f0f0;
		border: 1px solid #ddd;
		border-radius: 4px;
		cursor: pointer;
	}

	.year-adjust-row button:hover {
		background: #e5e5e5;
	}

	.year-done {
		width: 100%;
		margin-top: 0.5rem;
		padding: 0.5rem;
		background: #2563eb;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.875rem;
	}

	.year-done:hover {
		background: #1d4ed8;
	}
</style>
