<script>
	let { state } = $props();
</script>

<div class="footer">
	<button type="button" class="reset-btn" onclick={() => state.showResetModal = true}>
		Factory Reset
	</button>
	<div class="footer-spacer"></div>
	{#if state.saveMessage}
		<div class="save-success">{state.saveMessage}</div>
	{/if}
	{#if state.saveError}
		<div class="save-error">{state.saveError}</div>
	{/if}
	<button type="submit" class="save-btn" disabled={state.isSaving}>
		{state.isSaving ? 'Saving...' : 'Save Settings'}
	</button>
</div>

<style>
	.footer {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 1rem;
		padding: 1rem;
		background: white;
		border-top: 1px solid #e5e7eb;
		flex-wrap: wrap;
	}

	.reset-btn {
		padding: 0.5rem 1rem;
		background: transparent;
		color: #dc2626;
		border: 1px solid #dc2626;
		border-radius: 4px;
		font-size: 0.8125rem;
		cursor: pointer;
	}

	.reset-btn:hover {
		background: #fef2f2;
	}

	.footer-spacer {
		flex: 1;
	}

	.save-success {
		background: #ecfdf5;
		border: 1px solid #10b981;
		color: #047857;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		font-size: 0.8125rem;
	}

	.save-error {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #dc2626;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		font-size: 0.8125rem;
	}

	.save-btn {
		padding: 0.625rem 1.5rem;
		background: #2563eb;
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
	}

	.save-btn:hover:not(:disabled) {
		background: #1d4ed8;
	}

	.save-btn:disabled {
		background: #9ca3af;
		cursor: not-allowed;
	}
</style>
