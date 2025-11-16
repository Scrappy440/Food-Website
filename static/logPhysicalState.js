
/* Entries array to store all feelings
let entries = [];
let selectedFeelings = [];

// DOM Elements
const feelingForm = document.getElementById('feelingForm');
const timeInput = document.getElementById('time-input');
const selectedFeelingsContainer = document.getElementById('selectedFeelings');
const feelingOptions = document.querySelectorAll('.feeling-option');
const entriesGrid = document.getElementById('entriesGrid');
const emptyState = document.getElementById('emptyState');
const entryCount = document.getElementById('entryCount');
const clearAllBtn = document.getElementById('clearAllBtn');

// Load entries from localStorage on page load
window.addEventListener('DOMContentLoaded', () => {
    loadEntriesFromStorage();
    updateDisplay();
    loadDraft();
});

// Handle feeling option clicks
feelingOptions.forEach(option => {
    option.addEventListener('click', () => {
        const feeling = option.dataset.feeling;
        
        if (selectedFeelings.includes(feeling)) {
            // Remove if already selected
            selectedFeelings = selectedFeelings.filter(f => f !== feeling);
            option.classList.remove('selected');
        } else {
            // Add if not selected
            selectedFeelings.push(feeling);
            option.classList.add('selected');
        }
        
        updateSelectedFeelingsDisplay();
        saveDraft();
    });
});

// Update selected feelings display
function updateSelectedFeelingsDisplay() {
    selectedFeelingsContainer.innerHTML = '';
    
    if (selectedFeelings.length === 0) {
        const emptyMsg = document.createElement('span');
        emptyMsg.className = 'empty-message';
        emptyMsg.textContent = 'Click feelings below to add them';
        selectedFeelingsContainer.appendChild(emptyMsg);
        selectedFeelingsContainer.classList.remove('has-selections');
    } else {
        selectedFeelingsContainer.classList.add('has-selections');
        
        selectedFeelings.forEach(feeling => {
            const bubble = document.createElement('div');
            bubble.className = 'selected-feeling-bubble';
            bubble.innerHTML = `
                <span>${feeling}</span>
                <button type="button" class="remove-feeling" data-feeling="${feeling}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            // Add remove handler
            bubble.querySelector('.remove-feeling').addEventListener('click', (e) => {
                e.stopPropagation();
                removeFeeling(feeling);
            });
            
            selectedFeelingsContainer.appendChild(bubble);
        });
    }
}

// Remove feeling
function removeFeeling(feeling) {
    selectedFeelings = selectedFeelings.filter(f => f !== feeling);
    
    // Update button state
    feelingOptions.forEach(option => {
        if (option.dataset.feeling === feeling) {
            option.classList.remove('selected');
        }
    });
    
    updateSelectedFeelingsDisplay();
    saveDraft();
}

// Form submission
feelingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const time = timeInput.value;

    if (!time) {
        showAlert('Please select a time', 'error');
        return;
    }

    if (selectedFeelings.length === 0) {
        showAlert('Please select at least one feeling', 'error');
        return;
    }

    // Convert 24-hour time to 12-hour format for display
    const displayTime = formatTimeTo12Hour(time);

    // Create new entry
    const entry = {
        id: Date.now(),
        time: time,
        displayTime: displayTime,
        feelings: [...selectedFeelings],
        timestamp: new Date().toISOString()
    };

    // Add to entries array
    entries.push(entry);

    // Sort entries by time
    sortEntriesByTime();

    // Save to localStorage
    saveEntriesToStorage();

    // Update display
    updateDisplay();

    // Show success message
    showSuccessMessage();

    // Reset form
    feelingForm.reset();
    
    // Clear selections
    selectedFeelings = [];
    feelingOptions.forEach(option => option.classList.remove('selected'));
    updateSelectedFeelingsDisplay();
    
    // Clear draft
    localStorage.removeItem('feelingDraft');
    
    // Set time to current time
    setCurrentTime();
});

// Format time to 12-hour format
function formatTimeTo12Hour(time24) {
    const [hours24, minutes] = time24.split(':');
    let hours = parseInt(hours24);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
}

// Sort entries by time
function sortEntriesByTime() {
    entries.sort((a, b) => a.time.localeCompare(b.time));
}

// Update display
function updateDisplay() {
    // Update count
    entryCount.textContent = `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`;
    
    // Update clear button state
    clearAllBtn.disabled = entries.length === 0;

    // Clear current entries
    const currentCards = entriesGrid.querySelectorAll('.entry-card');
    currentCards.forEach(card => card.remove());

    // Show/hide empty state
    if (entries.length === 0) {
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        
        // Render entries
        entries.forEach(entry => {
            const entryCard = createEntryCard(entry);
            entriesGrid.appendChild(entryCard);
        });
    }
}

// Create entry card element
function createEntryCard(entry) {
    const card = document.createElement('div');
    card.className = 'entry-card';
    card.dataset.id = entry.id;

    const content = document.createElement('div');
    content.className = 'entry-content';

    // Time badge
    const timeDiv = document.createElement('div');
    timeDiv.className = 'entry-time';
    timeDiv.innerHTML = `
        <span class="time">${entry.displayTime}</span>
        <span class="label">Time</span>
    `;

    // Feeling info
    const feelingDiv = document.createElement('div');
    feelingDiv.className = 'entry-feeling';

    // Create badges for each feeling
    entry.feelings.forEach(feeling => {
        const feelingBadge = document.createElement('div');
        feelingBadge.className = 'feeling-badge';
        feelingBadge.innerHTML = `
            <i class="fas fa-heart"></i>
            ${feeling}
        `;
        feelingDiv.appendChild(feelingBadge);
    });

    content.appendChild(timeDiv);
    content.appendChild(feelingDiv);

    // Actions
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'entry-actions';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
    deleteBtn.onclick = () => deleteEntry(entry.id);

    actionsDiv.appendChild(deleteBtn);

    card.appendChild(content);
    card.appendChild(actionsDiv);

    return card;
}

// Delete entry
function deleteEntry(id) {
    if (confirm('Delete this entry?')) {
        entries = entries.filter(entry => entry.id !== id);
        saveEntriesToStorage();
        updateDisplay();
        showAlert('Entry deleted successfully', 'success');
    }
}

// Clear all entries
clearAllBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to delete all entries? This cannot be undone.')) {
        entries = [];
        saveEntriesToStorage();
        updateDisplay();
        showAlert('All entries cleared', 'success');
    }
});

// Save to localStorage
function saveEntriesToStorage() {
    localStorage.setItem('feelingEntries', JSON.stringify(entries));
}

// Load from localStorage
function loadEntriesFromStorage() {
    const stored = localStorage.getItem('feelingEntries');
    if (stored) {
        entries = JSON.parse(stored);
    }
}

// Show success message
function showSuccessMessage() {
    const flash = document.createElement('div');
    flash.className = 'success-flash';
    flash.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>Entry added successfully!</span>
    `;
    
    document.body.appendChild(flash);

    setTimeout(() => {
        flash.style.animation = 'slideInRight 0.3s ease-out reverse';
        setTimeout(() => {
            flash.remove();
        }, 300);
    }, 2000);
}

// Show alert message
function showAlert(message, type) {
    const flash = document.createElement('div');
    flash.className = 'success-flash';
    flash.style.background = type === 'error' ? '#f8d7da' : '#d4edda';
    flash.style.color = type === 'error' ? '#721c24' : '#155724';
    flash.style.borderColor = type === 'error' ? '#f5c6cb' : '#c3e6cb';
    
    flash.innerHTML = `
        <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(flash);

    setTimeout(() => {
        flash.style.animation = 'slideInRight 0.3s ease-out reverse';
        setTimeout(() => {
            flash.remove();
        }, 300);
    }, 2000);
}

// Set current time
function setCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    timeInput.value = `${hours}:${minutes}`;
}

// Auto-save draft to localStorage
let draftTimeout;
function saveDraft() {
    clearTimeout(draftTimeout);
    draftTimeout = setTimeout(() => {
        const draft = {
            time: timeInput.value,
            feelings: selectedFeelings
        };
        localStorage.setItem('feelingDraft', JSON.stringify(draft));
    }, 500);
}

timeInput.addEventListener('input', saveDraft);

// Load draft on page load
function loadDraft() {
    const draft = localStorage.getItem('feelingDraft');
    if (draft) {
        const { time, feelings } = JSON.parse(draft);
        if (time) timeInput.value = time;
        if (feelings && Array.isArray(feelings)) {
            selectedFeelings = feelings;
            
            // Update button states
            feelingOptions.forEach(option => {
                if (feelings.includes(option.dataset.feeling)) {
                    option.classList.add('selected');
                }
            });
            
            updateSelectedFeelingsDisplay();
        }
    } else {
        setCurrentTime();
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (document.activeElement.tagName !== 'TEXTAREA') {
            feelingForm.requestSubmit();
        }
    }
});
*/