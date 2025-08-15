document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('donation-form');
    const donorTypeRadios = document.querySelectorAll('input[name="donor-type"]');
    const organizationFields = document.getElementById('organization-fields');
    const orgRequiredInputs = organizationFields.querySelectorAll('input');

    // Show/hide organization fields based on donor type
    donorTypeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'organization') {
                organizationFields.style.display = 'block';
                orgRequiredInputs.forEach(input => input.required = true);
            } else {
                organizationFields.style.display = 'none';
                orgRequiredInputs.forEach(input => input.required = false);
            }
        });
    });

    form.addEventListener('submit', function(event) {
        event.preventDefault();

        // Basic validation
        const requiredFields = form.querySelectorAll('[required]');
        let allValid = true;

        requiredFields.forEach(field => {
            let fieldIsValid = true;
            // Check if the field is visible before validating
            if (field.offsetParent === null) {
                return; // Don't validate hidden fields
            }

            if (field.type === 'checkbox') {
                if (!field.checked) {
                    fieldIsValid = false;
                }
            } else {
                if (field.value.trim() === '') {
                    fieldIsValid = false;
                }
            }

            if (!fieldIsValid) {
                allValid = false;
                // Add some visual feedback for the user
                field.style.borderColor = 'red';
                // Also check the label for checkboxes/radios
                const label = document.querySelector(`label[for='${field.id}']`);
                if (label) {
                    label.style.color = 'red';
                }
            } else {
                field.style.borderColor = '#ccc'; // Reset border color
                const label = document.querySelector(`label[for='${field.id}']`);
                if (label) {
                    label.style.color = '#333';
                }
            }
        });

        if (!allValid) {
            alert('Please fill out all required fields, marked in red.');
            return;
        }

        // Collect form data (can be sent to a server here)
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        console.log(data); // For debugging

        alert('Thank you for your comprehensive donation offer! UNHCR will review the details and be in touch.');
        form.reset();
        // Reset UI elements to their initial state
        organizationFields.style.display = 'none';
        orgRequiredInputs.forEach(input => input.required = false);
        requiredFields.forEach(field => {
            field.style.borderColor = '#ccc';
            const label = document.querySelector(`label[for='${field.id}']`);
            if (label) {
                label.style.color = '#333';
            }
        });
    });
});