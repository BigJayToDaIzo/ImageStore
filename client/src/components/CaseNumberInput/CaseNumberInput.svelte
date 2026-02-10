<script>
	import { createCaseNumberInputState, imageTypes, angles, months } from './CaseNumberInput.svelte.ts';
	import CaseNumberAutocomplete from './CaseNumberAutocomplete.svelte';
	import PatientNameFields from './PatientNameFields.svelte';
	import DateOfBirthInput from './DateOfBirthInput.svelte';
	import ConsentRadioGroup from './ConsentRadioGroup.svelte';
	import PathPreviewPanel from './PathPreviewPanel.svelte';

	let {
		selectedFile = null,
		selectedFilename = '',
		selectedPath = '',
		onSorted = () => {},
		isDirty = $bindable(false)
	} = $props();

	const state = createCaseNumberInputState({
		selectedFile: () => selectedFile,
		selectedFilename: () => selectedFilename,
		selectedPath: () => selectedPath,
		onSorted: () => onSorted,
		onDirtyChange: (dirty) => { isDirty = dirty; },
	});

	export const resetForm = state.resetForm;
</script>

<div class="case-input-group">
	<CaseNumberAutocomplete {state} />

	{#if state.showPatientFields}
		<PatientNameFields {state} />

		<DateOfBirthInput {state} {months} />

		<ConsentRadioGroup {state} />

		<div class="two-col-row">
			<div class="form-group">
				<label for="procedure_type">Procedure</label>
				<select id="procedure_type" bind:value={state.procedureType}>
					<option value="">Select procedure...</option>
					{#each state.proceduresList as proc}
						<option value={proc.id}>{proc.name}</option>
					{/each}
				</select>
			</div>

			<div class="form-group">
				<label for="surgeon">Surgeon</label>
				<select id="surgeon" bind:value={state.surgeon}>
					<option value="">Select surgeon...</option>
					{#each state.surgeonsList as s}
						<option value={s.id}>{s.name}</option>
					{/each}
				</select>
			</div>
		</div>

		<div class="form-group">
			<label for="surgery_date">Surgery Date</label>
			<input type="date" id="surgery_date" bind:value={state.surgeryDate} />
		</div>

		<div class="two-col-row">
			<div class="form-group">
				<label for="image_type">Image Type</label>
				<select id="image_type" bind:value={state.imageType}>
					<option value="">Select type...</option>
					{#each imageTypes as type}
						<option value={type.value}>{type.label}</option>
					{/each}
				</select>
			</div>

			<div class="form-group">
				<label for="angle">Angle</label>
				<select id="angle" bind:value={state.angle}>
					<option value="">Select angle...</option>
					{#each angles as a}
						<option value={a.value}>{a.label}</option>
					{/each}
				</select>
			</div>
		</div>

		<PathPreviewPanel {state} />
	{/if}
</div>

<style>
	.form-group {
		margin-bottom: 0.75rem;
	}

	.two-col-row {
		display: flex;
		gap: 0.75rem;
	}

	.two-col-row .form-group {
		flex: 1;
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

	.form-group select {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		font-size: 0.9375rem;
		background: white;
	}

	.form-group input:focus,
	.form-group select:focus {
		outline: none;
		border-color: #2563eb;
	}
</style>
