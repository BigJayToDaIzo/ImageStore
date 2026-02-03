<script>
	import ImageSorter from './ImageSorter.svelte';
	import PatientsTable from './PatientsTable.svelte';
	import SettingsPanel from './SettingsPanel.svelte';

	let activeTab = $state('sort');
</script>

<div class="app-container">
	<nav class="tab-bar">
		<button
			class="tab tab-sort"
			class:active={activeTab === 'sort'}
			onclick={() => activeTab = 'sort'}
		>
			Sort Images
		</button>
		<button
			class="tab tab-patients"
			class:active={activeTab === 'patients'}
			onclick={() => activeTab = 'patients'}
		>
			Patients
		</button>
		<div class="tab-spacer"></div>
		<button
			class="tab tab-settings settings-tab"
			class:active={activeTab === 'settings'}
			onclick={() => activeTab = 'settings'}
		>
			<svg class="settings-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<!-- Wrench (bottom-left to top-right) -->
				<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
				<!-- Hammer (top-left to bottom-right) -->
				<path d="M2 2l4 4m4-2l-4 4"/>
				<path d="M10 10l8 8"/>
				<rect x="18" y="18" width="4" height="4" rx="1" transform="rotate(-45 20 20)"/>
			</svg>
			Settings
		</button>
	</nav>

	<div class="tab-content" class:tab-sort={activeTab === 'sort'} class:tab-patients={activeTab === 'patients'} class:tab-settings={activeTab === 'settings'}>
		{#if activeTab === 'sort'}
			<ImageSorter />
		{:else if activeTab === 'patients'}
			<PatientsTable />
		{:else if activeTab === 'settings'}
			<SettingsPanel />
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
		align-items: flex-end;
		gap: 2px;
		background: #fff;
		padding: 0.5rem 1rem 0 1rem;
	}

	.tab {
		padding: 0.625rem 1.25rem;
		border: none;
		border-radius: 8px 8px 0 0;
		font-size: 0.9375rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s;
		position: relative;
	}

	/* Individual tab colors - ROYGBIV */
	.tab.tab-sort {
		background: #fef2f2;
		color: #991b1b;
	}
	.tab.tab-sort:hover { background: #fee2e2; }
	.tab.tab-sort.active {
		background: #fee2e2;
		box-shadow: 0 2px 0 0 #fee2e2;
	}

	.tab.tab-patients {
		background: #fff7ed;
		color: #9a3412;
	}
	.tab.tab-patients:hover { background: #ffedd5; }
	.tab.tab-patients.active {
		background: #ffedd5;
		box-shadow: 0 2px 0 0 #ffedd5;
	}

	.tab.tab-settings {
		background: #faf5ff;
		color: #6b21a8;
	}
	.tab.tab-settings:hover { background: #f3e8ff; }
	.tab.tab-settings.active {
		background: #f3e8ff;
		box-shadow: 0 2px 0 0 #f3e8ff;
	}

	.tab-spacer {
		flex: 1;
	}

	.settings-tab {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.settings-icon {
		width: 1rem;
		height: 1rem;
	}

	.tab-content {
		flex: 1;
		display: flex;
		overflow: hidden;
	}

	/* Tab-specific content background colors */
	.tab-content.tab-sort { background: #fee2e2; }
	.tab-content.tab-patients { background: #ffedd5; }
	.tab-content.tab-settings { background: #f3e8ff; }
</style>
