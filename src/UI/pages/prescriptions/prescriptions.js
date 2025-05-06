document.addEventListener('DOMContentLoaded', function() {
    // Modal Window Management
    const createPrescriptionBtn = document.getElementById('createPrescriptionBtn');
    const createPrescriptionModal = document.getElementById('createPrescriptionModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelPrescriptionBtn = document.getElementById('cancelPrescriptionBtn');
    const savePrescriptionBtn = document.getElementById('savePrescriptionBtn');

    // Medication Management
    const addMedicationBtn = document.getElementById('addMedicationBtn');
    const medicationList = document.getElementById('medicationList');

    // Search and Filter Elements
    const searchPrescriptionsBtn = document.getElementById('searchPrescriptionsBtn');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const exportResultsBtn = document.getElementById('exportResultsBtn');
    const printResultsBtn = document.getElementById('printResultsBtn');

    // Modal Interaction Handlers
    function openModal() {
        createPrescriptionModal.style.display = 'flex';
        // Reset form when opening
        document.getElementById('prescriptionForm').reset();
        // Reset medication list to single default item
        resetMedicationList();
    }

    function closeModal() {
        createPrescriptionModal.style.display = 'none';
    }

    // Reset medication list to initial state
    function resetMedicationList() {
        medicationList.innerHTML = `
            <div class="medication-item">
                <input type="text" class="form-control medication-name" placeholder="Название препарата">
                <input type="text" class="form-control medication-dosage" placeholder="Дозировка">
                <input type="text" class="form-control medication-schedule" placeholder="Режим приема">
                <button type="button" class="remove-medication-btn">×</button>
            </div>
        `;
    }

    // Event Listeners for Modal Navigation
    createPrescriptionBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    cancelPrescriptionBtn.addEventListener('click', closeModal);

    // Close modal when clicking outside
    createPrescriptionModal.addEventListener('click', function(e) {
        if (e.target === createPrescriptionModal) {
            closeModal();
        }
    });

    // Medication List Management
    addMedicationBtn.addEventListener('click', function() {
        const medicationItem = document.createElement('div');
        medicationItem.classList.add('medication-item');
        medicationItem.innerHTML = `
            <input type="text" class="form-control medication-name" placeholder="Название препарата">
            <input type="text" class="form-control medication-dosage" placeholder="Дозировка">
            <input type="text" class="form-control medication-schedule" placeholder="Режим приема">
            <button type="button" class="remove-medication-btn">×</button>
        `;

        // Add remove functionality to new item
        const removeBtn = medicationItem.querySelector('.remove-medication-btn');
        removeBtn.addEventListener('click', function() {
            if (medicationList.children.length > 1) {
                medicationItem.remove();
            } else {
                alert('Должен быть хотя бы один препарат');
            }
        });

        medicationList.appendChild(medicationItem);
    });

    // Prescription Saving Logic
    savePrescriptionBtn.addEventListener('click', function() {
        const form = document.getElementById('prescriptionForm');

        if (form.checkValidity()) {
            // Collect form data
            const formData = {
                patient: document.getElementById('patientSearch').value,
                doctor: document.getElementById('prescriptionDoctor').value,
                diagnosis: document.getElementById('prescriptionDiagnosis').value,
                treatment: document.getElementById('prescriptionTreatment').value,
                status: document.getElementById('prescriptionStatus').value,
                recommendations: document.getElementById('prescriptionRecommendations').value,
                medications: []
            };

            // Collect medication data
            const medicationItems = document.querySelectorAll('.medication-item');
            medicationItems.forEach(item => {
                const medication = {
                    name: item.querySelector('.medication-name').value,
                    dosage: item.querySelector('.medication-dosage').value,
                    schedule: item.querySelector('.medication-schedule').value
                };

                // Only add medication if at least name is filled
                if (medication.name.trim()) {
                    formData.medications.push(medication);
                }
            });

            // Validate required fields
            if (!formData.patient || !formData.doctor || !formData.diagnosis) {
                alert('Пожалуйста, заполните обязательные поля');
                return;
            }

            // Simulate server save (replace with actual AJAX call)
            try {
                savePrescription(formData);
                closeModal();
                refreshPrescriptionsList();
            } catch (error) {
                console.error('Ошибка сохранения назначения:', error);
                alert('Не удалось сохранить назначение. Попробуйте позже.');
            }
        } else {
            // Trigger form validation
            form.reportValidity();
        }
    });

    // Prescription Search Functionality
    searchPrescriptionsBtn.addEventListener('click', function() {
        const searchParams = {
            patientName: document.getElementById('patientName').value,
            dateFrom: document.getElementById('dateFrom').value,
            dateTo: document.getElementById('dateTo').value,
            doctor: document.getElementById('doctor').value
        };

        performPrescriptionSearch(searchParams);
    });

    // Clear Search Functionality
    clearSearchBtn.addEventListener('click', function() {
        // Reset all search inputs
        document.getElementById('patientName').value = '';
        document.getElementById('dateFrom').value = '';
        document.getElementById('dateTo').value = '';
        document.getElementById('doctor').value = '';

        // Reset to default view
        resetPrescriptionsList();
    });

    // Export Results Functionality
    exportResultsBtn.addEventListener('click', function() {
        exportPrescriptions();
    });

    // Print Results Functionality
    printResultsBtn.addEventListener('click', function() {
        window.print();
    });

    // Table Action Handlers
    function setupTableActions() {
        const viewButtons = document.querySelectorAll('.view-btn');
        const editButtons = document.querySelectorAll('.edit-btn');

        viewButtons.forEach(button => {
            button.addEventListener('click', function() {
                const prescriptionId = this.dataset.id;
                viewPrescription(prescriptionId);
            });
        });

        editButtons.forEach(button => {
            button.addEventListener('click', function() {
                const prescriptionId = this.dataset.id;
                editPrescription(prescriptionId);
            });
        });
    }

    // Utility Functions (Placeholder implementations)
    function savePrescription(prescriptionData) {
        // TODO: Implement actual server-side save
        console.log('Сохранение назначения:', prescriptionData);
        // Simulate successful save
        alert('Назначение успешно сохранено');
    }

    function performPrescriptionSearch(searchParams) {
        // TODO: Implement actual search API call
        console.log('Поиск назначений:', searchParams);
        // Simulate search results update
        updatePrescriptionsList(searchParams);
    }

    function updatePrescriptionsList(searchParams) {
        // TODO: Filter and update table based on search parameters
        // This would typically involve an AJAX call to fetch filtered results
        console.log('Обновление списка назначений');
    }

    function resetPrescriptionsList() {
        // TODO: Reset to original list of prescriptions
        console.log('Сброс списка назначений');
    }

    function refreshPrescriptionsList() {
        // TODO: Reload prescriptions list from server
        console.log('Обновление списка назначений');
    }

    function viewPrescription(id) {
        // TODO: Open modal/navigate to detailed prescription view
        console.log('Просмотр назначения:', id);
    }

    function editPrescription(id) {
        // TODO: Populate modal with existing prescription data
        console.log('Редактирование назначения:', id);
        openModal();
    }

    function exportPrescriptions() {
        // TODO: Implement export functionality (CSV, PDF, etc.)
        console.log('Экспорт назначений');
        alert('Функция экспорта пока не реализована');
    }

    // Initialize table actions on page load
    setupTableActions();
});