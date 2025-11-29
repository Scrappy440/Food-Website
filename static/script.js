//REWRITTEN for autocomplete
//no more addIngredient, addFoods now

//Goal: now that food is in backend python, send to front end with js
// food-search input and /autocomplete for fetch request 

//was addIngredient
function addFood() {
    const foodsList = document.querySelector('.foods-list');
    const newFood = document.createElement('div');
    newFood.className = 'food-item';
    newFood.innerHTML = `
        <div class="food-item-header">
            <input type="text" name="ingredient_name[]" class="food-name-input" placeholder="Food name" required>
            <button type="button" class="remove-food-btn" onclick="this.closest('.food-item').remove(); updateTotals();">×</button>
        </div>
        <div class="nutrition-inputs">
            <div class="nutrition-input-group">
                <label>Serving</label>
                <input type="text" name="quantity[]" placeholder="1 cup">
            </div>
            <div class="nutrition-input-group">
                <label>Calories</label>
                <input type="number" name="calories[]" placeholder="0" min="0" onchange="updateTotals()">
            </div>
            <div class="nutrition-input-group">
                <label>Protein (g)</label>
                <input type="number" name="protein[]" placeholder="0" min="0" step="0.1" onchange="updateTotals()">
            </div>
            <div class="nutrition-input-group">
                <label>Carbs (g)</label>
                <input type="number" name="carbs[]" placeholder="0" min="0" step="0.1" onchange="updateTotals()">
            </div>
            <div class="nutrition-input-group">
                <label>Fat (g)</label>
                <input type="number" name="fat[]" placeholder="0" min="0" step="0.1" onchange="updateTotals()">
            </div>
        </div>
    `;
    foodsList.appendChild(newFood);
}

function updateTotals() {
    let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;
    
    document.querySelectorAll('input[name="calories[]"]').forEach(input => {
        totalCalories += parseFloat(input.value) || 0;
    });
    document.querySelectorAll('input[name="protein[]"]').forEach(input => {
        totalProtein += parseFloat(input.value) || 0;
    });
    document.querySelectorAll('input[name="carbs[]"]').forEach(input => {
        totalCarbs += parseFloat(input.value) || 0;
    });
    document.querySelectorAll('input[name="fat[]"]').forEach(input => {
        totalFat += parseFloat(input.value) || 0;
    });

    document.getElementById('total-calories').textContent = Math.round(totalCalories);
    document.getElementById('total-protein').textContent = totalProtein.toFixed(1) + 'g';
    document.getElementById('total-carbs').textContent = totalCarbs.toFixed(1) + 'g';
    document.getElementById('total-fat').textContent = totalFat.toFixed(1) + 'g';
}

//Autocomplete for Meal logging 
document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("food-search");
    const resultsDiv = document.getElementById("autocomplete-results");

    if (searchInput && resultsDiv) {
        async function searchFoods(query) {
            const res = await fetch(`/autocomplete?query=${encodeURIComponent(query)}`);
            return res.json();
        }

        async function getFoodDetails(id) {
            if (typeof id === 'string' && id.startsWith('usda:')) {
                const fdc = id.split(':')[1];
                const res = await fetch(`/food/usda/${fdc}`);
                return res.json();
            }
            const res = await fetch(`/food/${id}`);
            return res.json();
        }

        searchInput.addEventListener("input", async () => {
            const query = searchInput.value.trim();
            resultsDiv.innerHTML = "";
            if (query.length < 2) return;

            const foods = await searchFoods(query);
            if (!foods.length) {
                resultsDiv.innerHTML = `<div class="no-results">No results found</div>`;
                return;
            }

            foods.forEach(f => {
                const div = document.createElement("div");
                div.className = "suggestion";
                div.textContent = f.brand ? `${f.name} (${f.brand})` : f.name;

                div.onclick = async () => {
                    searchInput.value = f.name;
                    resultsDiv.innerHTML = "";

                    const data = await getFoodDetails(f.id);
                    if (data.error) return alert("Food not found.");

                    const firstFood = document.querySelector(".food-item");
                    if (firstFood) {
                        firstFood.querySelector(".food-name-input").value = data.name;
                        // Set quantity to 1 (meaning 1 serving), not the serving size in grams
                        firstFood.querySelector("input[name='quantity[]']").value = "1";
                        firstFood.querySelector("input[name='calories[]']").value = data.kcal ?? 0;
                        firstFood.querySelector("input[name='protein[]']").value = data.protein_g ?? 0;
                        firstFood.querySelector("input[name='carbs[]']").value = data.carbs_g ?? 0;
                        firstFood.querySelector("input[name='fat[]']").value = data.fat_g ?? 0;
                        updateTotals();
                    }
                };

                resultsDiv.appendChild(div);
            });
        });

        document.addEventListener("click", e => {
            if (!resultsDiv.contains(e.target) && e.target !== searchInput) {
                resultsDiv.innerHTML = "";
            }
        });
    }
});
//FOR Quick ADD: also display the right time above to mark different days for "diary" 

function toggleQuickAdd() {
    const form = document.getElementById('quick-add-form');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

document.addEventListener('DOMContentLoaded', function() {
    // Date navigation for meal logging
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to compare dates only
    
    const dateInput = document.getElementById('meal-date');
    const dateDisplay = document.getElementById('current-date');
    const prevDateBtn = document.getElementById('prev-date-btn');
    const nextDateBtn = document.getElementById('next-date-btn');
    
    if (dateInput && dateDisplay) {
        // Initialize with today's date
        updateDateDisplay();
        
        // Previous date button
        if (prevDateBtn) {
            prevDateBtn.addEventListener('click', function() {
                currentDate.setDate(currentDate.getDate() - 1);
                updateDateDisplay();
            });
        }
        
        // Next date button
        if (nextDateBtn) {
            nextDateBtn.addEventListener('click', function() {
                // Move forward one day
                currentDate.setDate(currentDate.getDate() + 1);
                updateDateDisplay();
            });
        }
    }
    
    function updateDateDisplay() {
        // Update display text
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateDisplay.textContent = currentDate.toLocaleDateString('en-US', options);
        
        // Update hidden input
        const dateForInput = new Date(currentDate);
        dateForInput.setMinutes(dateForInput.getMinutes() - dateForInput.getTimezoneOffset());
        dateInput.value = dateForInput.toISOString().slice(0, 16);
        
        // Enable/disable next button based on whether we're at today
        if (nextDateBtn) {
            nextDateBtn.disabled = currentDate.getTime() >= today.getTime();
        }
    }

    document.querySelectorAll('.meal-type-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.meal-type-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.getElementById('selected-meal-type').value = this.dataset.meal;
        });
    });
});

// ===== LOG PHYSICAL STATE FUNCTIONALITY =====
// Only run if we're on the physical state page
if (document.getElementById('feelingForm')) {
    let entries = [];
    let selectedFeelings = [];

    const feelingForm = document.getElementById('feelingForm');
    const timeInput = document.getElementById('time-input');
    const selectedFeelingsContainer = document.getElementById('selectedFeelings');
    const feelingOptions = document.querySelectorAll('.feeling-option');
    const entriesGrid = document.getElementById('entriesGrid');
    const emptyState = document.getElementById('emptyState');
    const entryCount = document.getElementById('entryCount');
    const clearAllBtn = document.getElementById('clearAllBtn');

    // Initialize
    loadEntriesFromStorage();
    updateDisplay();
    loadDraft();

    // Handle feeling option clicks
    feelingOptions.forEach(option => {
        option.addEventListener('click', () => {
            const feeling = option.dataset.feeling;
            
            if (selectedFeelings.includes(feeling)) {
                selectedFeelings = selectedFeelings.filter(f => f !== feeling);
                option.classList.remove('selected');
            } else {
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

        const displayTime = formatTimeTo12Hour(time);

        const entry = {
            id: Date.now(),
            time: time,
            displayTime: displayTime,
            feelings: [...selectedFeelings],
            timestamp: new Date().toISOString()
        };

        entries.push(entry);
        sortEntriesByTime();
        saveEntriesToStorage();
        updateDisplay();
        showSuccessMessage();

        feelingForm.reset();
        selectedFeelings = [];
        feelingOptions.forEach(option => option.classList.remove('selected'));
        updateSelectedFeelingsDisplay();
        localStorage.removeItem('feelingDraft');
        setCurrentTime();
    });

    // Format time to 12-hour
    function formatTimeTo12Hour(time24) {
        const [hours24, minutes] = time24.split(':');
        let hours = parseInt(hours24);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return `${hours}:${minutes} ${ampm}`;
    }

    // Sort entries
    function sortEntriesByTime() {
        entries.sort((a, b) => a.time.localeCompare(b.time));
    }

    // Update display
    function updateDisplay() {
        entryCount.textContent = `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`;
        clearAllBtn.disabled = entries.length === 0;

        const currentCards = entriesGrid.querySelectorAll('.entry-card');
        currentCards.forEach(card => card.remove());

        if (entries.length === 0) {
            emptyState.style.display = 'block';
        } else {
            emptyState.style.display = 'none';
            entries.forEach(entry => {
                const entryCard = createEntryCard(entry);
                entriesGrid.appendChild(entryCard);
            });
        }
    }

    // Create entry card
    function createEntryCard(entry) {
        const card = document.createElement('div');
        card.className = 'entry-card';
        card.dataset.id = entry.id;

        const content = document.createElement('div');
        content.className = 'entry-content';

        const timeDiv = document.createElement('div');
        timeDiv.className = 'entry-time';
        timeDiv.innerHTML = `
            <span class="time">${entry.displayTime}</span>
            <span class="label">Time</span>
        `;

        const feelingDiv = document.createElement('div');
        feelingDiv.className = 'entry-feeling';

        entry.feelings.forEach(feeling => {
            const feelingBadge = document.createElement('div');
            feelingBadge.className = 'feeling-badge';
            feelingBadge.innerHTML = `${feeling}`;
            feelingDiv.appendChild(feelingBadge);
        });

        content.appendChild(timeDiv);
        content.appendChild(feelingDiv);

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

    // Clear all
    clearAllBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete all entries? This cannot be undone.')) {
            entries = [];
            saveEntriesToStorage();
            updateDisplay();
            showAlert('All entries cleared', 'success');
        }
    });

    // Storage functions
    function saveEntriesToStorage() {
        localStorage.setItem('feelingEntries', JSON.stringify(entries));
    }

    function loadEntriesFromStorage() {
        const stored = localStorage.getItem('feelingEntries');
        if (stored) {
            entries = JSON.parse(stored);
        }
    }

    // Show success
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
            setTimeout(() => flash.remove(), 300);
        }, 2000);
    }

    // Show alert
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
            setTimeout(() => flash.remove(), 300);
        }, 2000);
    }

    // Set current time
    function setCurrentTime() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        timeInput.value = `${hours}:${minutes}`;
    }

    // Draft saving
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

    // Load draft
    function loadDraft() {
        const draft = localStorage.getItem('feelingDraft');
        if (draft) {
            const { time, feelings } = JSON.parse(draft);
            if (time) timeInput.value = time;
            if (feelings && Array.isArray(feelings)) {
                selectedFeelings = feelings;
                
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
}
