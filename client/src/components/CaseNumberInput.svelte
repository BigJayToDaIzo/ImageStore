<script>
	let caseNumber = $state('');
	let showPatientFields = $derived(caseNumber.length > 0);
</script>

<div class="case-input-group">
	<div class="form-group">
		<label for="case_number">Case Number</label>
		<input
			type="text"
			id="case_number"
			bind:value={caseNumber}
			placeholder="Start typing..."
		/>
	</div>

	{#if showPatientFields}
		<div class="form-group">
			<label for="patient_name">Patient Name</label>
			<input type="text" id="patient_name" />
		</div>

		<div class="form-group">
			<label for="dob">Date of Birth</label>
			<input type="date" id="dob" />
		</div>
	{/if}
</div>

<style>
	.form-group {
		margin-bottom: 1rem;
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
</style>
