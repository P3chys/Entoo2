/**
 * Switch between tabs
 */
export function switchTab(event, subjectId, tabName) {
    // Prevent event propagation
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    // Get all tab buttons and contents for this subject
    const clickedButton = event.target.closest('.tab-btn');
    if (!clickedButton) {
        console.error('Tab button not found');
        return;
    }

    const tabContainer = clickedButton.closest('.tab-container');
    if (!tabContainer) {
        console.error('Tab container not found');
        return;
    }

    const tabButtons = tabContainer.querySelectorAll('.tab-btn');
    const tabContents = tabContainer.querySelectorAll('.tab-content');

    // Remove active class from all tabs
    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));

    // Add active class to clicked button
    clickedButton.classList.add('active');

    // Show corresponding content
    const targetContent = document.getElementById(`tab-${subjectId}-${tabName}`);

    if (targetContent) {
        targetContent.classList.add('active');
    } else {
        console.error('Tab content not found for:', `tab-${subjectId}-${tabName}`);
    }
}
