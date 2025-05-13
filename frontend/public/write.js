document.addEventListener("DOMContentLoaded", function() {
    // Check authentication first
    const isLoggedIn = localStorage.getItem("userLoggedIn") === "true";
    const username = localStorage.getItem("username");
    const token = localStorage.getItem("userToken");

    // If no user is logged in, redirect to login page
    if (!isLoggedIn || !token) {
        window.location.href = "login.html";
        return;
    }

    // Function to safely get and update element display
    function updateElementDisplay(id, display) {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = display;
        }
    }

    // Update UI based on authentication
    if (isLoggedIn && username) {
        // Update welcome message
        const headerUsername = document.getElementById("header-username");
        if (headerUsername) {
            headerUsername.textContent = username;
            updateElementDisplay("welcome-message", "block");
        }

        // Show authenticated user buttons
        updateElementDisplay("write-post", "inline-block");
        updateElementDisplay("profile", "inline-block");
        updateElementDisplay("logout-btn", "inline-block");

        // Hide non-authenticated user buttons
        updateElementDisplay("login-btn", "none");
        updateElementDisplay("signup-btn", "none");
    }

    // Handle form submission
    const writePostForm = document.getElementById("write-post-form");
    if (writePostForm) {
        writePostForm.addEventListener("submit", async function(e) {
            e.preventDefault();

            // Safely get form inputs
            const titleInput = document.getElementById("title");
            const contentInput = document.getElementById("content");
            const categoryInput = document.getElementById("category");

            if (!titleInput || !contentInput || !categoryInput) {
                alert("Error: Form elements not found!");
                return;
            }

            const formData = {
                title: titleInput.value.trim(),
                content: contentInput.value.trim(),
                category: categoryInput.value
            };

            // Validate form data
            if (!formData.title || !formData.content || !formData.category) {
                alert("Please fill in all required fields!");
                return;
            }

            try {
                const response = await fetch("/posts", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify(formData)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || "Failed to publish post");
                }

                const result = await response.json();
                alert("Post published successfully!");
                window.location.href = "index.html";
            } catch (error) {
                console.error("Error publishing post:", error);
                alert(error.message || "An error occurred while publishing your post. Please try again.");
            }
        });
    }
});

// Logout function
function logout() {
    localStorage.clear();
    window.location.href = "index.html";
} 