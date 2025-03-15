document.addEventListener("DOMContentLoaded", function () {
    const editProfileForm = document.getElementById("edit-profile-form");

    // Pre-fill form fields with user data
    const user = JSON.parse(localStorage.getItem("user")) || {};
    if (user.username) document.getElementById("edit-username").value = user.username;
    if (user.bio) document.getElementById("edit-bio").value = user.bio;
    if (user.profilePic) document.getElementById("current-profile-pic").src = user.profilePic;

    // Form submission handling
    editProfileForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const newUsername = document.getElementById("edit-username").value.trim();
        const newBio = document.getElementById("edit-bio").value.trim();
        const newProfilePicInput = document.getElementById("edit-profile-pic");
        const newProfilePic = newProfilePicInput.files[0];

        // Validation: Ensure username is not empty
        if (!newUsername) {
            alert("Username cannot be empty!");
            return;
        }

        // Update user object
        user.username = newUsername;
        user.bio = newBio;

        // Handle profile picture update
        if (newProfilePic) {
            const reader = new FileReader();
            reader.onload = function (e) {
                user.profilePic = e.target.result; // Convert to Base64
                localStorage.setItem("user", JSON.stringify(user));
                window.location.href = "index.html";
            };
            reader.readAsDataURL(newProfilePic);
        } else {
            localStorage.setItem("user", JSON.stringify(user));
            window.location.href = "index.html";
        }
    });
});
