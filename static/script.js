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
                        firstFood.querySelector("input[name='quantity[]']").value =
                            data.serving_size_g ? `${data.serving_size_g} g` : "";
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
    const dateInput = document.getElementById('meal-date');
    if (dateInput) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        dateInput.value = now.toISOString().slice(0, 16);
    }

    const dateDisplay = document.getElementById('current-date');
    if (dateDisplay) {
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateDisplay.textContent = today.toLocaleDateString('en-US', options);
    }

    document.querySelectorAll('.meal-type-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.meal-type-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.getElementById('selected-meal-type').value = this.dataset.meal;
        });
    });
});
