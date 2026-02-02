<script>
	import ImageSorter from './ImageSorter.svelte';
	import PatientsTable from './PatientsTable.svelte';

	let activeTab = $state('sort');
</script>

<div class="app-container">
	<nav class="tab-bar">
		<button
			class="tab"
			class:active={activeTab === 'sort'}
			onclick={() => activeTab = 'sort'}
		>
			Sort Images
		</button>
		<button
			class="tab"
			class:active={activeTab === 'patients'}
			onclick={() => activeTab = 'patients'}
		>
			Patients
		</button>
	</nav>

	<div class="tab-content">
		{#if activeTab === 'sort'}
			<ImageSorter />
		{:else if activeTab === 'patients'}
			<PatientsTable />
		{/if}
	</div>
</div>

<style>
	.app-container {
		display: flex;
		flex-direction: column;
		height: 100%;
		width: 100%;
	}

	.tab-bar {
		display: flex;
		gap: 0;
		background: #fff;
		border-bottom: 1px solid #ddd;
		padding: 0 1rem;
	}

	.tab {
		padding: 0.75rem 1.25rem;
		background: transparent;
		border: none;
		border-bottom: 2px solid transparent;
		font-size: 0.9375rem;
		font-weight: 500;
		color: #666;
		cursor: pointer;
		transition: color 0.15s, border-color 0.15s;
	}

	.tab:hover {
		color: #333;
	}

	.tab.active {
		color: #2563eb;
		border-bottom-color: #2563eb;
	}

	.tab-content {
		flex: 1;
		display: flex;
		overflow: hidden;
	}
</style>
