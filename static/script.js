function addIngredient() {
    const container = document.getElementById('ingredients-container');
    const newCard = document.createElement('div');
    newCard.className = 'ingredient-card';
    newCard.innerHTML = `
        <button type="button" onclick="this.parentElement.remove(); updateNutritionSummary();" class="remove-btn">×</button>
        <div class="ingredient-grid">
            <div class="form-group">
                <label>Food Item</label>
                <input type="text" name="ingredient_name[]" placeholder="e.g., Chicken Breast" required>
            </div>
            <div class="form-group">
                <label>Quantity</label>
                <input type="text" name="quantity[]" placeholder="e.g., 200g">
            </div>
            <div class="form-group">
                <label>Calories</label>
                <input type="number" name="calories[]" placeholder="165" min="0" onchange="updateNutritionSummary()">
            </div>
            <div class="form-group">
                <label>Protein (g)</label>
                <input type="number" name="protein[]" placeholder="31" min="0" step="0.1" onchange="updateNutritionSummary()">
            </div>
            <div class="form-group">
                <label>Carbs (g)</label>
                <input type="number" name="carbs[]" placeholder="0" min="0" step="0.1" onchange="updateNutritionSummary()">
            </div>
            <div class="form-group">
                <label>Fat (g)</label>
                <input type="number" name="fat[]" placeholder="3.6" min="0" step="0.1" onchange="updateNutritionSummary()">
            </div>
        </div>
    `;
    container.appendChild(newCard);
}

// Update nutrition summary totals
function updateNutritionSummary() {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    
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

// Quick Add Form
function toggleQuickAdd() {
    const form = document.getElementById('quick-add-form');
    if (form.style.display === 'none') {
        form.style.display = 'block';
    } else {
        form.style.display = 'none';
    }
}

// Add new food item
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

// Update nutrition totals
function updateTotals() {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    
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

// Set current date/time on page load
document.addEventListener('DOMContentLoaded', function() {
    const dateInput = document.getElementById('meal-date');
    if (dateInput) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        dateInput.value = now.toISOString().slice(0, 16);
    }
    
    // Add onchange listeners to all nutrition inputs
    document.querySelectorAll('input[name="calories[]"], input[name="protein[]"], input[name="carbs[]"], input[name="fat[]"]').forEach(input => {
        input.addEventListener('input', updateNutritionSummary);
    });
    
    // Display current date
    const dateDisplay = document.getElementById('current-date');
    if (dateDisplay) {
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateDisplay.textContent = today.toLocaleDateString('en-US', options);
    }
    
    // Set meal date hidden field
    const mealDateInput = document.getElementById('meal-date');
    if (mealDateInput) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        mealDateInput.value = now.toISOString().slice(0, 16);
    }
    
    // Meal type selector
    document.querySelectorAll('.meal-type-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.meal-type-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.getElementById('selected-meal-type').value = this.dataset.meal;
        });
    });
});