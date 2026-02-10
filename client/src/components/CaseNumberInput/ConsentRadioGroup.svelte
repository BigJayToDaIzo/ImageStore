<script>
	let { state } = $props();
</script>

<div class="consent-form">
	<div class="form-group">
		<label>Consent Status</label>
		<div class="radio-group">
			<label class="radio-label">
				<input type="radio" name="consent_status" value="no_consent" bind:group={state.consentStatus} />
				<span>No Consent</span>
			</label>
			<label class="radio-label">
				<input type="radio" name="consent_status" value="consent" bind:group={state.consentStatus} />
				<span>Consent Given</span>
			</label>
		</div>
	</div>

	{#if state.consentStatus === 'consent'}
		<div class="form-group">
			<label>Consent Type</label>
			<div class="radio-group">
				<label class="radio-label">
					<input type="radio" name="consent_type" value="hipaa" bind:group={state.consentType} />
					<span>HIPAA Only</span>
				</label>
				<label class="radio-label">
					<input type="radio" name="consent_type" value="social_media" bind:group={state.consentType} />
					<span>Social Media</span>
				</label>
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
		padding: 0.75rem;
	}

	.consent-form .form-group:last-child {
		margin-bottom: 0;
	}
</style>
