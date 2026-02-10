export const imageTypes = [
	{ value: 'pre_op', label: 'Pre-Op' },
	{ value: '1day_post_op', label: '1 Day Post-Op' },
	{ value: '3mo_post_op', label: '3 Month Post-Op' },
	{ value: '6mo_post_op', label: '6 Month Post-Op' },
	{ value: '9plus_mo_post_op', label: '9+ Month Post-Op' },
];

export const angles = [
	{ value: 'front', label: 'Front' },
	{ value: 'back', label: 'Back' },
	{ value: 'left', label: 'Left' },
	{ value: 'right', label: 'Right' },
];

export const months = [
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

interface CaseNumberInputProps {
	selectedFile: () => File | null;
	selectedFilename: () => string;
	selectedPath: () => string;
	onSorted: () => () => void;
	onDirtyChange: (dirty: boolean) => void;
}

export function createCaseNumberInputState(props: CaseNumberInputProps) {
	const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
	const currentYear = new Date().getFullYear();

	let hasImage = $derived(props.selectedFile() !== null || props.selectedPath() !== '');

	// Settings-driven defaults
	let settingsLoaded = $state(false);
	let defaultProcedure = $state('rhinoplasty');
	let defaultImageType = $state('pre_op');
	let defaultAngle = $state('front');
	let defaultAge = $state(33);
	let defaultSurgeon = $state('');
	let surgeonsList = $state<any[]>([]);
	let proceduresList = $state<any[]>([
		{ id: 'rhinoplasty', name: 'Rhinoplasty' },
		{ id: 'facelift', name: 'Facelift' },
		{ id: 'blepharoplasty', name: 'Blepharoplasty' },
		{ id: 'breast_augmentation', name: 'Breast Augmentation' },
		{ id: 'liposuction', name: 'Liposuction' },
	]);

	// Load settings, procedures, and surgeons on mount
	$effect(() => {
		if (!settingsLoaded) {
			Promise.all([
				fetch('/api/settings').then(res => res.ok ? res.json() : null),
				fetch('/api/procedures').then(res => res.ok ? res.json() : null),
				fetch('/api/surgeons').then(res => res.ok ? res.json() : null)
			])
				.then(([settings, procs, surgs]) => {
					if (settings) {
						if (settings.defaults) {
							defaultProcedure = settings.defaults.procedure || 'rhinoplasty';
							defaultImageType = settings.defaults.imageType || 'pre_op';
							defaultAngle = settings.defaults.angle || 'front';
							defaultAge = settings.defaults.defaultPatientAge || 33;
							defaultSurgeon = settings.defaults.surgeon || '';
							procedureType = defaultProcedure;
							imageType = defaultImageType;
							angle = defaultAngle;
							surgeon = defaultSurgeon;
						}
					}
					if (procs && procs.length > 0) {
						proceduresList = procs;
					}
					if (surgs && surgs.length > 0) {
						surgeonsList = surgs;
					}
					settingsLoaded = true;
				})
				.catch(() => { settingsLoaded = true; });
		}
	});

	let caseNumber = $state('');
	let firstName = $state('');
	let lastName = $state('');
	let showPatientFields = $derived(caseNumber.length > 0);

	// Patient autocomplete state
	let suggestions = $state<any[]>([]);
	let selectedPatient = $state<any>(null);
	let showSuggestions = $state(false);
	let searchTimeout: any = null;

	let ghostPatient = $derived(
		!selectedPatient && suggestions.length > 0 ? suggestions[0] : null
	);
	let ghostCaseNumber = $derived(() => {
		if (!ghostPatient || !caseNumber) return '';
		const ghostCase = ghostPatient.case_number;
		if (ghostCase.toLowerCase().startsWith(caseNumber.toLowerCase())) {
			return caseNumber + ghostCase.slice(caseNumber.length);
		}
		return '';
	});
	let ghostDOB = $derived(() => {
		if (!ghostPatient?.dob) return '';
		const [year, month, day] = ghostPatient.dob.split('-');
		return `${month}/${day}/${year}`;
	});

	// Search patients when case number changes
	$effect(() => {
		if (caseNumber.length >= 1) {
			clearTimeout(searchTimeout);
			searchTimeout = setTimeout(async () => {
				try {
					const res = await fetch(`/api/patients?search=${encodeURIComponent(caseNumber)}`);
					if (res.ok) {
						suggestions = await res.json();
						showSuggestions = suggestions.length > 0 && !selectedPatient;
					}
				} catch (e) {
					suggestions = [];
				}
			}, 100);
		} else {
			suggestions = [];
			showSuggestions = false;
		}
	});

	function selectPatient(patient: any) {
		selectedPatient = patient;
		caseNumber = patient.case_number;
		firstName = patient.first_name;
		lastName = patient.last_name;

		if (patient.dob) {
			const [year, month, day] = patient.dob.split('-');
			dobYear = year;
			dobMonth = month;
			dobDay = day;
			syncTextFromDropdowns();
		}

		if (patient.surgeon) {
			surgeon = patient.surgeon;
		}

		showSuggestions = false;
	}

	function clearPatient() {
		selectedPatient = null;
		firstName = '';
		lastName = '';
		dobMonth = '';
		dobDay = '';
		dobYear = '';
		dobText = '';
	}

	function handleCaseNumberKeydown(event: KeyboardEvent) {
		if ((event.key === 'Enter' || event.key === 'Tab') && suggestions.length > 0 && !selectedPatient) {
			event.preventDefault();
			const exactMatch = suggestions.find((p: any) => p.case_number.toLowerCase() === caseNumber.toLowerCase());
			if (exactMatch) {
				selectPatient(exactMatch);
			} else {
				selectPatient(suggestions[0]);
			}
		} else if (event.key === 'Escape') {
			showSuggestions = false;
		}
	}

	function handleCaseNumberInput() {
		if (selectedPatient && caseNumber !== selectedPatient.case_number) {
			clearPatient();
		}
	}

	let isSubmitting = $state(false);
	let submitError = $state('');

	// Consent fields
	let consentStatus = $state('no_consent');
	let consentType = $state('');

	$effect(() => {
		if (consentStatus === 'consent' && consentType === '') {
			consentType = 'hipaa';
		}
	});

	// Procedure field
	let procedureType = $state('rhinoplasty');
	let surgeryDate = $state(yesterday);

	// Image metadata
	let imageType = $state('pre_op');
	let angle = $state('front');

	// Surgeon field
	let surgeon = $state('');

	// Track if form has been modified from defaults
	$effect(() => {
		const dirty = caseNumber !== '' ||
			consentStatus !== 'no_consent' ||
			consentType !== '' ||
			procedureType !== defaultProcedure ||
			surgeryDate !== yesterday ||
			imageType !== defaultImageType ||
			angle !== defaultAngle ||
			surgeon !== defaultSurgeon ||
			dobMonth !== '' ||
			dobDay !== '' ||
			dobYear !== '';
		props.onDirtyChange(dirty);
	});

	function resetForm() {
		caseNumber = '';
		firstName = '';
		lastName = '';
		selectedPatient = null;
		suggestions = [];
		showSuggestions = false;
		consentStatus = 'no_consent';
		consentType = '';
		procedureType = defaultProcedure;
		surgeryDate = yesterday;
		imageType = defaultImageType;
		angle = defaultAngle;
		surgeon = defaultSurgeon;
		dobMonth = '';
		dobDay = '';
		dobYear = '';
		dobText = '';
		dobError = '';
	}

	// Build destination path preview
	let pathSegments = $derived(() => {
		const segments: any[] = [];

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

		segments.push({
			label: 'Procedure',
			value: procedureType || 'procedure',
			type: 'procedure',
			filled: !!procedureType
		});

		segments.push({
			label: 'Surgery Date',
			value: surgeryDate || 'date',
			type: 'date',
			filled: !!surgeryDate
		});

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

	let formComplete = $derived(() => {
		if (!caseNumber || !procedureType || !surgeryDate || !imageType || !angle || !consentStatus) {
			return false;
		}
		if (consentStatus === 'consent' && !consentType) {
			return false;
		}
		return true;
	});

	// DOB fields
	let dobMonth = $state('');
	let dobDay = $state('');
	let dobYear = $state('');
	let dobText = $state('');
	let dobError = $state('');

	let yearPickerOpen = $state(false);

	function adjustYear(amount: number) {
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

	let daysInMonth = $derived(() => {
		if (!dobMonth || !dobYear) return 31;
		return new Date(parseInt(dobYear), parseInt(dobMonth), 0).getDate();
	});

	function handleTextInput() {
		dobError = '';
		const cleaned = dobText.replace(/[^\d]/g, '');

		if (cleaned.length >= 2) {
			const mm = cleaned.slice(0, 2);
			const dd = cleaned.slice(2, 4);
			const yyyy = cleaned.slice(4, 8);

			let formatted = mm;
			if (cleaned.length > 2) formatted += '/' + dd;
			if (cleaned.length > 4) formatted += '/' + yyyy;
			dobText = formatted;
		}

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

		const mm = cleaned.slice(0, 2).padStart(2, '0');
		const dd = cleaned.length > 2 ? cleaned.slice(2, 4).padStart(2, '0') : '';
		const yyyy = cleaned.length > 4 ? cleaned.slice(4, 8) : '';

		const monthNum = parseInt(mm);
		if (monthNum >= 1 && monthNum <= 12) {
			dobMonth = mm;
		}

		if (dd) {
			const dayNum = parseInt(dd);
			const maxDays = daysInMonth();
			if (dayNum >= 1 && dayNum <= maxDays) {
				dobDay = dd;
			}
		}

		if (yyyy.length === 4) {
			const yearNum = parseInt(yyyy);
			if (yearNum >= 1900 && yearNum <= currentYear) {
				dobYear = yyyy;
			}
		} else if (cleaned.length <= 4 && !dobYear) {
			dobYear = displayYear;
		}

		syncTextFromDropdowns();
	}

	function handleTextKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			const cleaned = dobText.replace(/[^\d]/g, '');

			if (cleaned.length >= 4) {
				const mm = cleaned.slice(0, 2).padStart(2, '0');
				const dd = cleaned.slice(2, 4).padStart(2, '0');
				const yyyy = cleaned.length >= 8 ? cleaned.slice(4, 8) : displayYear;

				const monthNum = parseInt(mm);
				const dayNum = parseInt(dd);
				const yearNum = parseInt(yyyy);

				if (monthNum >= 1 && monthNum <= 12) {
					const maxDays = new Date(yearNum, monthNum, 0).getDate();
					if (dayNum >= 1 && dayNum <= maxDays) {
						dobMonth = mm;
						dobDay = dd;
						dobYear = yyyy;
						dobError = '';
						syncTextFromDropdowns();

						const consentRadio = document.querySelector('input[name="consent_status"]') as HTMLInputElement | null;
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

	function validateAndSyncFromText(cleaned: string) {
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

	let displayYear = $derived(dobYear || String(currentYear - defaultAge));

	let dobPlaceholder = $derived(() => {
		const monthPart = dobMonth || 'MM';
		const dayPart = dobDay || 'DD';
		const yearPart = displayYear;
		return `${monthPart}/${dayPart}/${yearPart}`;
	});

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
		if (!formComplete() || !hasImage || isSubmitting) return;

		isSubmitting = true;
		submitError = '';

		try {
			const formData = new FormData();
			const file = props.selectedFile();
			const filename = props.selectedFilename();
			const path = props.selectedPath();

			if (file) {
				formData.append('file', file);
				formData.append('originalFilename', filename || file.name);
				if (file.webkitRelativePath) {
					formData.append('relativeSourcePath', file.webkitRelativePath);
				}
			} else if (path) {
				formData.append('relativeSourcePath', path);
				formData.append('originalFilename', filename);
			}

			formData.append('caseNumber', caseNumber);
			formData.append('consentStatus', consentStatus);
			if (consentStatus === 'consent') {
				formData.append('consentType', consentType);
			}
			formData.append('procedureType', procedureType);
			formData.append('surgeryDate', surgeryDate);
			formData.append('imageType', imageType);
			formData.append('angle', angle);
			formData.append('surgeon', surgeon);

			if (!selectedPatient && firstName && lastName) {
				formData.append('firstName', firstName);
				formData.append('lastName', lastName);
				if (dobYear && dobMonth && dobDay) {
					formData.append('dob', `${dobYear}-${dobMonth}-${dobDay}`);
				}
				formData.append('surgeon', surgeon);
			}

			const response = await fetch('/api/sort-image', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Failed to sort image');
			}

			props.onSorted()();

			imageType = 'pre_op';
			angle = 'front';

		} catch (error) {
			submitError = error instanceof Error ? error.message : 'Failed to sort image';
		} finally {
			isSubmitting = false;
		}
	}

	return {
		get hasImage() { return hasImage; },
		get caseNumber() { return caseNumber; },
		set caseNumber(v: string) { caseNumber = v; },
		get firstName() { return firstName; },
		set firstName(v: string) { firstName = v; },
		get lastName() { return lastName; },
		set lastName(v: string) { lastName = v; },
		get showPatientFields() { return showPatientFields; },
		get suggestions() { return suggestions; },
		get selectedPatient() { return selectedPatient; },
		get showSuggestions() { return showSuggestions; },
		set showSuggestions(v: boolean) { showSuggestions = v; },
		get ghostPatient() { return ghostPatient; },
		ghostCaseNumber,
		ghostDOB,

		get consentStatus() { return consentStatus; },
		set consentStatus(v: string) { consentStatus = v; },
		get consentType() { return consentType; },
		set consentType(v: string) { consentType = v; },

		get procedureType() { return procedureType; },
		set procedureType(v: string) { procedureType = v; },
		get surgeryDate() { return surgeryDate; },
		set surgeryDate(v: string) { surgeryDate = v; },
		get proceduresList() { return proceduresList; },
		get surgeonsList() { return surgeonsList; },
		get surgeon() { return surgeon; },
		set surgeon(v: string) { surgeon = v; },

		get imageType() { return imageType; },
		set imageType(v: string) { imageType = v; },
		get angle() { return angle; },
		set angle(v: string) { angle = v; },

		get dobMonth() { return dobMonth; },
		set dobMonth(v: string) { dobMonth = v; },
		get dobDay() { return dobDay; },
		set dobDay(v: string) { dobDay = v; },
		get dobYear() { return dobYear; },
		set dobYear(v: string) { dobYear = v; },
		get dobText() { return dobText; },
		set dobText(v: string) { dobText = v; },
		get dobError() { return dobError; },
		get yearPickerOpen() { return yearPickerOpen; },
		get defaultAge() { return defaultAge; },
		get currentYear() { return currentYear; },
		get displayYear() { return displayYear; },
		daysInMonth,
		dobPlaceholder,

		get isSubmitting() { return isSubmitting; },
		get submitError() { return submitError; },
		formComplete,
		pathSegments,
		filenameSegments,

		selectPatient,
		clearPatient,
		handleCaseNumberKeydown,
		handleCaseNumberInput,
		handleSubmit,
		resetForm,
		adjustYear,
		selectDefaultYear,
		closeYearPicker,
		handleTextInput,
		handleTextBlur,
		handleTextKeydown,
		syncTextFromDropdowns,
	};
}
