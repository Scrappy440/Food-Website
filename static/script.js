function validateForm() {
    const email = document.forms["login"]["email"].value;
    const password = document.forms["login"]["password"].value;
    if (email == "" || password == "") {
        alert("Both fields must be filled out");
        return false;
    }
    window.location.href = "home.html";
    return false; // Prevent default form submission
}