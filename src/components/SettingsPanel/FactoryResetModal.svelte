<script>
	let { show, isResetting, onCancel, onConfirm } = $props();
</script>

{#if show}
	<div class="modal-overlay" onclick={onCancel}>
		<div class="modal reset-modal" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h3>Factory Reset</h3>
				<button type="button" class="modal-close" onclick={onCancel}>&times;</button>
			</div>
			<div class="modal-body">
				<p>This will reset all settings to factory defaults:</p>
				<ul>
					<li>Storage paths</li>
					<li>Form defaults (procedure, image type, angle, etc.)</li>
				</ul>
				<p class="warning-text">Patient data, procedures, and surgeons are stored separately and will not be affected.</p>
			</div>
			<div class="modal-footer">
				<button type="button" class="btn-secondary" onclick={onCancel}>Cancel</button>
				<button type="button" class="btn-danger" onclick={onConfirm} disabled={isResetting}>
					{isResetting ? 'Resetting...' : 'Reset to Factory Defaults'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal {
		background: white;
		border-radius: 8px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
		max-width: 90vw;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.modal-header h3 {
		margin: 0;
		font-size: 1.125rem;
	}

	.modal-close {
		background: none;
		border: none;
		font-size: 1.5rem;
		color: #666;
		cursor: pointer;
		line-height: 1;
	}

	.modal-close:hover {
		color: #333;
	}

	.modal-body {
		flex: 1;
		padding: 1rem 1.25rem;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		border-top: 1px solid #e5e7eb;
	}

	.btn-secondary {
		padding: 0.5rem 1rem;
		background: #f3f4f6;
		border: 1px solid #ddd;
		border-radius: 4px;
		cursor: pointer;
	}

	.btn-secondary:hover {
		background: #e5e7eb;
	}

	.btn-danger {
		padding: 0.5rem 1rem;
		background: #dc2626;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}

	.btn-danger:hover:not(:disabled) {
		background: #b91c1c;
	}

	.btn-danger:disabled {
		background: #9ca3af;
		cursor: not-allowed;
	}

	.reset-modal .warning-text {
		font-size: 0.8125rem;
		color: #059669;
		font-style: italic;
	}

	.reset-modal ul {
		margin: 0.5rem 0;
		padding-left: 1.5rem;
		font-size: 0.875rem;
		color: #666;
	}
</style>
