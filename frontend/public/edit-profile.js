document.addEventListener("DOMContentLoaded", function() {
    const editProfileForm = document.getElementById("edit-profile-form");
    const isLoggedIn = localStorage.getItem("userLoggedIn") === "true";
    const username = localStorage.getItem("username");
    const token = localStorage.getItem("token");

    // If no user is logged in, redirect to login page
    if (!isLoggedIn || !token) {
        window.location.href = "login.html";
        return;
    }

    // Update welcome message
    const welcomeMessage = document.getElementById("welcome-message");
    const headerUsername = document.getElementById("header-username");
    if (welcomeMessage && headerUsername) {
        headerUsername.textContent = username;
        welcomeMessage.style.display = "block";
    }

    // Fetch and pre-fill form with current user data
    fetchUserProfile();
    
    async function fetchUserProfile() {
        try {
            const response = await fetch("/api/users/profile", {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const userData = await response.json();
                console.log("Fetched user data:", userData);
                
                // Pre-fill form with fetched data
                const usernameInput = document.getElementById("username");
                const emailInput = document.getElementById("email");
                const bioInput = document.getElementById("bio");
                
                if (usernameInput) usernameInput.value = userData.username || username || "";
                if (emailInput) emailInput.value = userData.email || localStorage.getItem("email") || "";
                if (bioInput) bioInput.value = userData.bio || localStorage.getItem("bio") || "";
                
                // Update localStorage with latest data
                if (userData.email) localStorage.setItem("email", userData.email);
                if (userData.bio) localStorage.setItem("bio", userData.bio);
            } else {
                console.error("Failed to fetch user profile");
                
                // Fall back to localStorage data
                const usernameInput = document.getElementById("username");
                const emailInput = document.getElementById("email");
                const bioInput = document.getElementById("bio");
                
                if (usernameInput) usernameInput.value = username || "";
                if (emailInput) emailInput.value = localStorage.getItem("email") || "";
                if (bioInput) bioInput.value = localStorage.getItem("bio") || "";
            }
        } catch (error) {
            console.error("Error fetching user profile:", error);
            
            // Fall back to localStorage data
            const usernameInput = document.getElementById("username");
            const emailInput = document.getElementById("email");
            const bioInput = document.getElementById("bio");
            
            if (usernameInput) usernameInput.value = username || "";
            if (emailInput) emailInput.value = localStorage.getItem("email") || "";
            if (bioInput) bioInput.value = localStorage.getItem("bio") || "";
        }
    }

    editProfileForm.addEventListener("submit", async function(e) {
        e.preventDefault();

        const formData = {
            username: document.getElementById("username").value.trim(),
            email: document.getElementById("email").value.trim(),
            bio: document.getElementById("bio").value.trim(),
            currentPassword: document.getElementById("currentPassword").value,
            newPassword: document.getElementById("newPassword").value
        };

        // Validate form data
        if (!formData.username || !formData.email) {
            alert("Username and email are required!");
            return;
        }

        if (!formData.currentPassword) {
            alert("Please enter your current password to make changes!");
            return;
        }

        try {
            const response = await fetch("/api/users/profile", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (response.ok) {
                // Update local storage with new user data
                localStorage.setItem("username", formData.username);
                localStorage.setItem("email", formData.email);
                localStorage.setItem("bio", formData.bio);
                
                alert(result.message || "Profile updated successfully!");
                window.location.href = "index.html";
            } else {
                alert(result.message || "Failed to update profile. Please try again.");
            }
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("An error occurred while updating your profile. Please try again.");
        }
    });

    // Show the appropriate navigation buttons
    document.getElementById("write-post").style.display = "inline-block";
    document.getElementById("profile").style.display = "inline-block";
    document.getElementById("logout-btn").style.display = "inline-block";
    document.getElementById("login-btn").style.display = "none";
    document.getElementById("signup-btn").style.display = "none";
});

// Logout function
function logout() {
    localStorage.clear();
    window.location.href = "index.html";
} 