<script>
	let { state } = $props();
</script>

<div class="submit-section">
	<div class="path-preview" class:incomplete={!state.formComplete()}>
		<div class="preview-section">
			<span class="preview-title">Folder</span>
			<div class="path-with-labels">
				{#each state.pathSegments() as segment, i}
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
				{#each state.filenameSegments() as segment, i}
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
	{#if state.submitError}
		<div class="submit-error">{state.submitError}</div>
	{/if}
	<button
		type="button"
		class="submit-btn"
		disabled={!state.formComplete() || !state.hasImage || state.isSubmitting}
		onclick={state.handleSubmit}
	>
		{state.isSubmitting ? 'Sorting...' : 'Sort Image'}
	</button>
</div>

<style>
	.submit-section {
		margin-top: 1rem;
		padding-top: 0.75rem;
		border-top: 1px solid #ddd;
	}

	.path-preview {
		background: #f8f9fa;
		padding: 0.5rem 0.75rem;
		border-radius: 6px;
		margin-bottom: 0.5rem;
		border: 1px solid #e5e7eb;
	}

	.preview-section {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
	}

	.preview-title {
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #6b7280;
		min-width: 3.5rem;
		padding-top: 1.25rem;
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
		margin-top: 0.5rem;
		padding-top: 0.5rem;
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
