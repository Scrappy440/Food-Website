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
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to compare dates only
    
    // Check if there's a date parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const dateParam = urlParams.get('date');
    
    let currentDate;
    if (dateParam) {
        currentDate = new Date(dateParam + 'T00:00:00');
    } else {
        currentDate = new Date();
    }
    currentDate.setHours(0, 0, 0, 0);
    
    const dateInput = document.getElementById('meal-date');
    const dateDisplay = document.getElementById('current-date');
    const prevDateBtn = document.getElementById('prev-date-btn');
    const nextDateBtn = document.getElementById('next-date-btn');
    
    if (dateInput && dateDisplay) {
        // Initialize with the current date
        updateDateDisplay();
        
        // Previous date button
        if (prevDateBtn) {
            prevDateBtn.addEventListener('click', function() {
                currentDate.setDate(currentDate.getDate() - 1);
                navigateToDate();
            });
        }
        
        // Next date button
        if (nextDateBtn) {
            nextDateBtn.addEventListener('click', function() {
                // Move forward one day
                currentDate.setDate(currentDate.getDate() + 1);
                navigateToDate();
            });
        }
    }
    
    function navigateToDate() {
        const dateStr = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
        window.location.href = `/logmeal?date=${dateStr}`;
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

    const feelingForm = document.getElementById('feelingForm');
    const entriesGrid = document.getElementById('entriesGrid');
    const emptyState = document.getElementById('emptyState');
    const entryCount = document.getElementById('entryCount');
    const clearAllBtn = document.getElementById('clearAllBtn');

    // Load entries from server
    async function loadEntriesFromServer() {
        try {
            const response = await fetch('/api/get_feelings_today');
            const data = await response.json();
            
            if (data.success) {
                entries = data.entries.map(e => ({
                    id: e.id,
                    time: new Date(e.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                    displayTime: new Date(e.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                    mood: e.mood ?? 0,
                    energy: e.energy ?? 0,
                    bloating: e.bloating ?? 0,
                    nausea: e.nausea ?? 0,
                    meal_title: e.meal_title,
                    timestamp: e.time
                }));
                updateDisplay();
            }
        } catch (error) {
            console.error('Error loading entries:', error);
        }
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
            <span class="label">${entry.meal_title || 'Meal'}</span>
        `;

        const feelingDiv = document.createElement('div');
        feelingDiv.className = 'entry-feeling';
        feelingDiv.innerHTML = `
            <span class="feeling-badge">Mood: ${entry.mood}</span>
            <span class="feeling-badge">Energy: ${entry.energy}</span>
            <span class="feeling-badge">Bloating: ${entry.bloating}</span>
            <span class="feeling-badge">Nausea: ${entry.nausea}</span>
        `;

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
    async function deleteEntry(id) {
        if (confirm('Delete this entry?')) {
            try {
                const response = await fetch(`/api/delete_feeling/${id}`, {
                    method: 'POST'
                });
                const data = await response.json();
                
                if (data.success) {
                    await loadEntriesFromServer();
                    showAlert('Entry deleted successfully', 'success');
                }
            } catch (error) {
                console.error('Error deleting entry:', error);
                showAlert('Error deleting entry', 'error');
            }
        }
    }

    // Clear all
    clearAllBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete all entries? This cannot be undone.')) {
            try {
                const response = await fetch('/api/clear_all_feelings', {
                    method: 'POST'
                });
                const data = await response.json();
                
                if (data.success) {
                    await loadEntriesFromServer();
                    showAlert('All entries cleared', 'success');
                }
            } catch (error) {
                console.error('Error clearing entries:', error);
                showAlert('Error clearing entries', 'error');
            }
        }
    });

    // Form submission
    feelingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(feelingForm);
        
        try {
            const response = await fetch('/log_physical_state', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                feelingForm.reset();
                await loadEntriesFromServer();
                showAlert('Entry added successfully!', 'success');
            } else {
                showAlert('Error adding entry', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('Error adding entry', 'error');
        }
    });

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

    // Load entries on page load
    loadEntriesFromServer();
}