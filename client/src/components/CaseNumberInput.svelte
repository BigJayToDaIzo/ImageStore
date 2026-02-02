<script>
	let {
		selectedFile = null,
		selectedFilename = '',
		onSorted = () => {},
		isDirty = $bindable(false)
	} = $props();

	let caseNumber = $state('');
	let showPatientFields = $derived(caseNumber.length > 0);

	let isSubmitting = $state(false);
	let submitError = $state('');

	// Consent fields
	let consentStatus = $state('no_consent');
	let consentType = $state('');

	// Procedure field
	let procedureType = $state('rhinoplasty');
	const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
	let surgeryDate = $state(yesterday);
	const procedures = [
		{ value: 'rhinoplasty', label: 'Rhinoplasty' },
		{ value: 'facelift', label: 'Facelift' },
		{ value: 'blepharoplasty', label: 'Blepharoplasty' },
		{ value: 'breast_augmentation', label: 'Breast Augmentation' },
		{ value: 'liposuction', label: 'Liposuction' },
	];

	// Image metadata
	let imageType = $state('pre_op');
	const imageTypes = [
		{ value: 'pre_op', label: 'Pre-Op' },
		{ value: '1day_post_op', label: '1 Day Post-Op' },
		{ value: '3mo_post_op', label: '3 Month Post-Op' },
		{ value: '6mo_post_op', label: '6 Month Post-Op' },
		{ value: '9plus_mo_post_op', label: '9+ Month Post-Op' },
	];

	let angle = $state('front');
	const angles = [
		{ value: 'front', label: 'Front' },
		{ value: 'back', label: 'Back' },
		{ value: 'left', label: 'Left' },
		{ value: 'right', label: 'Right' },
	];

	// Track if form has been modified from defaults
	$effect(() => {
		isDirty = caseNumber !== '' ||
			consentStatus !== 'no_consent' ||
			consentType !== '' ||
			procedureType !== 'rhinoplasty' ||
			surgeryDate !== yesterday ||
			imageType !== 'pre_op' ||
			angle !== 'front' ||
			dobMonth !== '' ||
			dobDay !== '' ||
			dobYear !== '';
	});

	// Reset form to defaults
	export function resetForm() {
		caseNumber = '';
		consentStatus = 'no_consent';
		consentType = '';
		procedureType = 'rhinoplasty';
		surgeryDate = yesterday;
		imageType = 'pre_op';
		angle = 'front';
		dobMonth = '';
		dobDay = '';
		dobYear = '';
		dobText = '';
		dobError = '';
	}

	// Build destination path preview as structured segments for visual display
	let pathSegments = $derived(() => {
		const segments = [];

		// Consent segment
		if (consentStatus === 'consent') {
			segments.push({ label: 'Consent', value: 'consent', type: 'consent', filled: true });
			segments.push({
				label: 'Type',
				value: consentType || 'consent_type',
				type: 'consent-type',
				filled: !!consentType
			});
		} else {
			segments.push({ label: 'Consent', value: 'no_consent', type: 'consent', filled: true });
		}

		// Procedure segment
		segments.push({
			label: 'Procedure',
			value: procedureType || 'procedure',
			type: 'procedure',
			filled: !!procedureType
		});

		// Date segment
		segments.push({
			label: 'Surgery Date',
			value: surgeryDate || 'date',
			type: 'date',
			filled: !!surgeryDate
		});

		// Case number segment
		segments.push({
			label: 'Case #',
			value: caseNumber || 'case',
			type: 'case',
			filled: !!caseNumber
		});

		return segments;
	});

	let filenameSegments = $derived(() => {
		return [
			{ label: 'Case #', value: caseNumber || 'case', type: 'case', filled: !!caseNumber },
			{ label: 'Image Type', value: imageType || 'type', type: 'image-type', filled: !!imageType },
			{ label: 'Angle', value: angle || 'angle', type: 'angle', filled: !!angle },
		];
	});

	// Check if form is complete for submit button
	let formComplete = $derived(() => {
		if (!caseNumber || !procedureType || !surgeryDate || !imageType || !angle || !consentStatus) {
			return false;
		}
		if (consentStatus === 'consent' && !consentType) {
			return false;
		}
		return true;
	});

	// DOB as separate fields
	let dobMonth = $state('');
	let dobDay = $state('');
	let dobYear = $state('');
	let dobText = $state('');
	let dobError = $state('');

	const currentYear = new Date().getFullYear();
	const defaultAge = 33;
	let yearPickerOpen = $state(false);


	function adjustYear(amount) {
		const baseYear = dobYear ? parseInt(dobYear) : (currentYear - defaultAge);
		const newYear = baseYear + amount;
		if (newYear >= 1900 && newYear <= currentYear) {
			dobYear = String(newYear);
		}
	}

	function selectDefaultYear() {
		if (!dobYear) {
			dobYear = String(currentYear - defaultAge);
		}
		yearPickerOpen = !yearPickerOpen;
	}

	function closeYearPicker() {
		yearPickerOpen = false;
	}

	// Generate day options based on selected month/year
	let daysInMonth = $derived(() => {
		if (!dobMonth || !dobYear) return 31;
		return new Date(parseInt(dobYear), parseInt(dobMonth), 0).getDate();
	});

	const months = [
		{ value: '01', label: 'January' },
		{ value: '02', label: 'February' },
		{ value: '03', label: 'March' },
		{ value: '04', label: 'April' },
		{ value: '05', label: 'May' },
		{ value: '06', label: 'June' },
		{ value: '07', label: 'July' },
		{ value: '08', label: 'August' },
		{ value: '09', label: 'September' },
		{ value: '10', label: 'October' },
		{ value: '11', label: 'November' },
		{ value: '12', label: 'December' },
	];

	// Sync text input to dropdowns
	function handleTextInput() {
		dobError = '';
		const cleaned = dobText.replace(/[^\d]/g, '');

		// Auto-format as they type
		if (cleaned.length >= 2) {
			const mm = cleaned.slice(0, 2);
			const dd = cleaned.slice(2, 4);
			const yyyy = cleaned.slice(4, 8);

			let formatted = mm;
			if (cleaned.length > 2) formatted += '/' + dd;
			if (cleaned.length > 4) formatted += '/' + yyyy;
			dobText = formatted;
		}

		// Validate and sync when complete
		if (cleaned.length === 8) {
			validateAndSyncFromText(cleaned);
		}
	}

	function handleTextBlur() {
		const cleaned = dobText.replace(/[^\d]/g, '');

		if (cleaned.length === 0) {
			dobText = '';
			return;
		}

		// Partial input - fill in the blanks
		const mm = cleaned.slice(0, 2).padStart(2, '0');
		const dd = cleaned.length > 2 ? cleaned.slice(2, 4).padStart(2, '0') : '';
		const yyyy = cleaned.length > 4 ? cleaned.slice(4, 8) : '';

		// Validate and sync month if we have it
		const monthNum = parseInt(mm);
		if (monthNum >= 1 && monthNum <= 12) {
			dobMonth = mm;
		}

		// Validate and sync day if we have it
		if (dd) {
			const dayNum = parseInt(dd);
			const maxDays = daysInMonth();
			if (dayNum >= 1 && dayNum <= maxDays) {
				dobDay = dd;
			}
		}

		// Validate and sync year if we have it
		if (yyyy.length === 4) {
			const yearNum = parseInt(yyyy);
			if (yearNum >= 1900 && yearNum <= currentYear) {
				dobYear = yyyy;
			}
		} else if (cleaned.length <= 4 && !dobYear) {
			// No year entered, use default
			dobYear = displayYear;
		}

		// Update text to show full formatted date
		syncTextFromDropdowns();
	}

	function handleTextKeydown(event) {
		if (event.key === 'Enter') {
			event.preventDefault();
			const cleaned = dobText.replace(/[^\d]/g, '');

			if (cleaned.length >= 4) {
				// We have at least MM/DD, accept default year if not provided
				const mm = cleaned.slice(0, 2).padStart(2, '0');
				const dd = cleaned.slice(2, 4).padStart(2, '0');
				const yyyy = cleaned.length >= 8 ? cleaned.slice(4, 8) : displayYear;

				const monthNum = parseInt(mm);
				const dayNum = parseInt(dd);
				const yearNum = parseInt(yyyy);

				// Validate
				if (monthNum >= 1 && monthNum <= 12) {
					const maxDays = new Date(yearNum, monthNum, 0).getDate();
					if (dayNum >= 1 && dayNum <= maxDays) {
						dobMonth = mm;
						dobDay = dd;
						dobYear = yyyy;
						dobError = '';
						syncTextFromDropdowns();

						// Move focus to consent status
						const consentRadio = document.querySelector('input[name="consent_status"]');
						consentRadio?.focus();
					} else {
						dobError = 'Invalid day';
					}
				} else {
					dobError = 'Invalid month';
				}
			}
		}
	}

	function validateAndSyncFromText(cleaned) {
		const mm = cleaned.slice(0, 2);
		const dd = cleaned.slice(2, 4);
		const yyyy = cleaned.slice(4, 8);

		const monthNum = parseInt(mm);
		const dayNum = parseInt(dd);
		const yearNum = parseInt(yyyy);

		if (monthNum < 1 || monthNum > 12) {
			dobError = 'Invalid month';
			return;
		}
		if (yearNum < 1900 || yearNum > currentYear) {
			dobError = 'Invalid year';
			return;
		}
		const maxDays = new Date(yearNum, monthNum, 0).getDate();
		if (dayNum < 1 || dayNum > maxDays) {
			dobError = 'Invalid day';
			return;
		}

		dobMonth = mm;
		dobDay = dd;
		dobYear = yyyy;
		dobError = '';
	}

	// Display year (shown value, may differ from committed dobYear)
	let displayYear = $derived(dobYear || String(currentYear - defaultAge));

	// Placeholder showing current state
	let dobPlaceholder = $derived(() => {
		const monthPart = dobMonth || 'MM';
		const dayPart = dobDay || 'DD';
		const yearPart = displayYear;
		return `${monthPart}/${dayPart}/${yearPart}`;
	});

	// Sync dropdowns to text input (called explicitly on dropdown change)
	function syncTextFromDropdowns() {
		const monthPart = dobMonth || 'MM';
		const dayPart = dobDay || 'DD';
		const yearPart = displayYear;
		dobText = `${monthPart}/${dayPart}/${yearPart}`;
		if (dobMonth && dobDay && dobYear) {
			dobError = '';
		}
	}

	async function handleSubmit() {
		if (!formComplete() || !selectedFile || isSubmitting) return;

		isSubmitting = true;
		submitError = '';

		try {
			const formData = new FormData();
			formData.append('file', selectedFile);
			formData.append('caseNumber', caseNumber);
			formData.append('consentStatus', consentStatus);
			if (consentStatus === 'consent') {
				formData.append('consentType', consentType);
			}
			formData.append('procedureType', procedureType);
			formData.append('surgeryDate', surgeryDate);
			formData.append('imageType', imageType);
			formData.append('angle', angle);
			formData.append('originalFilename', selectedFilename || selectedFile.name);

			const response = await fetch('/api/sort-image', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Failed to sort image');
			}

			// Success - notify parent and reset form for next image
			onSorted();

			// Reset image-specific fields (keep patient info)
			imageType = 'pre_op';
			angle = 'front';

		} catch (error) {
			submitError = error instanceof Error ? error.message : 'Failed to sort image';
		} finally {
			isSubmitting = false;
		}
	}
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
		<div class="name-row">
			<div class="form-group">
				<label for="last_name">Last Name</label>
				<input type="text" id="last_name" />
			</div>
			<div class="form-group">
				<label for="first_name">First Name</label>
				<input type="text" id="first_name" />
			</div>
		</div>

		<div class="form-group">
			<label for="dob_text">Date of Birth</label>
			<input
				type="text"
				id="dob_text"
				bind:value={dobText}
				oninput={handleTextInput}
				onblur={handleTextBlur}
				onkeydown={handleTextKeydown}
				placeholder={dobPlaceholder()}
				maxlength="10"
				class:error={dobError}
			/>
			{#if dobError}
				<span class="error-msg">{dobError}</span>
			{/if}
			<div class="dob-selects">
				<select bind:value={dobMonth} onchange={syncTextFromDropdowns} aria-label="Month">
					<option value="">Month</option>
					{#each months as month}
						<option value={month.value}>{month.label}</option>
					{/each}
				</select>

				<select bind:value={dobDay} onchange={syncTextFromDropdowns} aria-label="Day">
					<option value="">Day</option>
					{#each Array.from({ length: daysInMonth() }, (_, i) => i + 1) as day}
						<option value={String(day).padStart(2, '0')}>{day}</option>
					{/each}
				</select>

				<div class="year-picker-container">
					<button
						type="button"
						class="year-button"
						onclick={selectDefaultYear}
					>
						{dobYear || currentYear - defaultAge}
					</button>

					{#if yearPickerOpen}
						<div class="year-picker-modal">
							<div class="year-display">{dobYear}</div>
							<div class="year-adjust-row">
								<button type="button" onclick={() => adjustYear(-50)}>−50</button>
								<button type="button" onclick={() => adjustYear(-10)}>−10</button>
								<button type="button" onclick={() => adjustYear(-5)}>−5</button>
								<button type="button" onclick={() => adjustYear(-1)}>−1</button>
							</div>
							<div class="year-adjust-row">
								<button type="button" onclick={() => adjustYear(1)}>+1</button>
								<button type="button" onclick={() => adjustYear(5)}>+5</button>
								<button type="button" onclick={() => adjustYear(10)}>+10</button>
								<button type="button" onclick={() => adjustYear(50)}>+50</button>
							</div>
							<button type="button" class="year-done" onclick={closeYearPicker}>Done</button>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<div class="consent-form">
			<div class="form-group">
				<label>Consent Status</label>
				<div class="radio-group">
					<label class="radio-label">
						<input type="radio" name="consent_status" value="no_consent" bind:group={consentStatus} />
						<span>No Consent</span>
					</label>
					<label class="radio-label">
						<input type="radio" name="consent_status" value="consent" bind:group={consentStatus} />
						<span>Consent Given</span>
					</label>
				</div>
			</div>

			{#if consentStatus === 'consent'}
				<div class="form-group">
					<label>Consent Type</label>
					<div class="radio-group">
						<label class="radio-label">
							<input type="radio" name="consent_type" value="hipaa" bind:group={consentType} />
							<span>HIPAA Only</span>
						</label>
						<label class="radio-label">
							<input type="radio" name="consent_type" value="social_media" bind:group={consentType} />
							<span>Social Media</span>
						</label>
					</div>
				</div>
			{/if}
		</div>

		<div class="form-group">
			<label for="procedure_type">Procedure</label>
			<select id="procedure_type" bind:value={procedureType}>
				<option value="">Select procedure...</option>
				{#each procedures as proc}
					<option value={proc.value}>{proc.label}</option>
				{/each}
			</select>
		</div>

		<div class="form-group">
			<label for="surgery_date">Surgery Date</label>
			<input type="date" id="surgery_date" bind:value={surgeryDate} />
		</div>

		<div class="form-group">
			<label for="image_type">Image Type</label>
			<select id="image_type" bind:value={imageType}>
				<option value="">Select type...</option>
				{#each imageTypes as type}
					<option value={type.value}>{type.label}</option>
				{/each}
			</select>
		</div>

		<div class="form-group">
			<label for="angle">Angle</label>
			<select id="angle" bind:value={angle}>
				<option value="">Select angle...</option>
				{#each angles as a}
					<option value={a.value}>{a.label}</option>
				{/each}
			</select>
		</div>

		<div class="submit-section">
			<div class="path-preview" class:incomplete={!formComplete()}>
				<div class="preview-section">
					<span class="preview-title">Folder</span>
					<div class="path-with-labels">
						{#each pathSegments() as segment, i}
							<span class="segment-col">
								<span class="legend-item {segment.type}" class:placeholder={!segment.filled}>{segment.label}</span>
								<span class="value-row"><span class="sep">/</span><span class="path-value {segment.type}" class:placeholder={!segment.filled}>{segment.value}</span></span>
							</span>
						{/each}
					</div>
				</div>

				<div class="preview-section filename-section">
					<span class="preview-title">Filename</span>
					<div class="path-with-labels">
						{#each filenameSegments() as segment, i}
							<span class="segment-col">
								<span class="legend-item {segment.type}" class:placeholder={!segment.filled}>{segment.label}</span>
								<span class="value-row">{#if i > 0}<span class="sep underscore">_</span>{/if}<span class="path-value {segment.type}" class:placeholder={!segment.filled}>{segment.value}</span></span>
							</span>
						{/each}
						<span class="segment-col ext-col">
							<span class="legend-item ext-label">&nbsp;</span>
							<span class="value-row"><span class="file-ext">.jpg</span></span>
						</span>
					</div>
				</div>
			</div>
			{#if submitError}
				<div class="submit-error">{submitError}</div>
			{/if}
			<button
				type="button"
				class="submit-btn"
				disabled={!formComplete() || !selectedFile || isSubmitting}
				onclick={handleSubmit}
			>
				{isSubmitting ? 'Sorting...' : 'Sort Image'}
			</button>
		</div>
	{/if}
</div>

<style>
	.form-group {
		margin-bottom: 1rem;
	}

	.name-row {
		display: flex;
		gap: 0.75rem;
	}

	.name-row .form-group {
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

	.form-group input.error {
		border-color: #dc2626;
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

	.radio-group {
		display: flex;
		gap: 1rem;
	}

	.radio-label {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		cursor: pointer;
		font-size: 0.9375rem;
		font-weight: normal;
	}

	.radio-label input[type="radio"] {
		width: auto;
		margin: 0;
		cursor: pointer;
	}

	.consent-form {
		background: #f8f8f8;
		border-radius: 6px;
		padding: 1rem;
	}

	.consent-form .form-group:last-child {
		margin-bottom: 0;
	}

	.submit-section {
		margin-top: 1.5rem;
		padding-top: 1rem;
		border-top: 1px solid #ddd;
	}

	.path-preview {
		background: #f8f9fa;
		padding: 0.75rem;
		border-radius: 6px;
		margin-bottom: 0.75rem;
		border: 1px solid #e5e7eb;
	}

	.preview-section {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
	}

	.preview-title {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #6b7280;
		min-width: 4rem;
		padding-top: 1.5rem;
	}

	.path-with-labels {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 0.125rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
		font-size: 0.875rem;
	}

	.segment-col {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	.value-row {
		display: flex;
		align-items: center;
	}

	.ext-col {
		justify-content: flex-end;
	}

	.legend-item {
		font-size: 0.5625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.02em;
		padding: 0.125rem 0.375rem;
		border-radius: 3px;
		border: 1px solid;
		font-family: system-ui, -apple-system, sans-serif;
	}

	.legend-item.placeholder {
		border-style: dashed;
		opacity: 0.6;
	}

	.legend-item.ext-label {
		border: none;
		background: transparent;
	}

	.filename-section {
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid #e5e7eb;
	}


	.sep {
		color: #374151;
		font-weight: 700;
		padding: 0 0.125rem;
	}

	.sep.underscore {
		color: #6b7280;
		padding: 0 0.0625rem;
	}

	.path-value {
		font-weight: 600;
		padding: 0.125rem 0.25rem;
		border-radius: 3px;
		margin: -0.125rem 0;
	}

	.path-value.placeholder {
		font-weight: 400;
		font-style: italic;
		background: transparent !important;
		color: #9ca3af !important;
	}

	.file-ext {
		color: #6b7280;
		font-weight: 500;
	}

	/* Consent status - green */
	.legend-item.consent { border-color: #10b981; background: #ecfdf5; color: #047857; }
	.path-value.consent { color: #047857; background: #ecfdf5; }

	/* Consent type - teal */
	.legend-item.consent-type { border-color: #14b8a6; background: #f0fdfa; color: #0f766e; }
	.path-value.consent-type { color: #0f766e; background: #f0fdfa; }

	/* Procedure - purple */
	.legend-item.procedure { border-color: #8b5cf6; background: #f5f3ff; color: #6d28d9; }
	.path-value.procedure { color: #6d28d9; background: #f5f3ff; }

	/* Date - blue */
	.legend-item.date { border-color: #3b82f6; background: #eff6ff; color: #1d4ed8; }
	.path-value.date { color: #1d4ed8; background: #eff6ff; }

	/* Case number - orange */
	.legend-item.case { border-color: #f97316; background: #fff7ed; color: #c2410c; }
	.path-value.case { color: #c2410c; background: #fff7ed; }

	/* Image type - pink */
	.legend-item.image-type { border-color: #ec4899; background: #fdf2f8; color: #be185d; }
	.path-value.image-type { color: #be185d; background: #fdf2f8; }

	/* Angle - cyan */
	.legend-item.angle { border-color: #06b6d4; background: #ecfeff; color: #0e7490; }
	.path-value.angle { color: #0e7490; background: #ecfeff; }

	.submit-btn {
		width: 100%;
		padding: 0.75rem;
		background: #2563eb;
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
	}

	.submit-btn:hover:not(:disabled) {
		background: #1d4ed8;
	}

	.submit-btn:disabled {
		background: #9ca3af;
		cursor: not-allowed;
	}

	.submit-error {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #dc2626;
		padding: 0.5rem 0.75rem;
		border-radius: 4px;
		font-size: 0.875rem;
		margin-bottom: 0.75rem;
	}
</style>
