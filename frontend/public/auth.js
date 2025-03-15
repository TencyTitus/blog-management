document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");
    const user = JSON.parse(localStorage.getItem("user")); // Get user data

    function updateUI(user) {
        if (!user) return;

        // Get elements safely
        const loginBtn = document.getElementById("login-btn");
        const signupBtn = document.getElementById("signup-btn");
        const logoutBtn = document.getElementById("logout-btn");
        const writePost = document.getElementById("write-post");
        const profile = document.getElementById("profile");
        const userPic = document.getElementById("user-pic");
        const username = document.getElementById("username");

        // Hide login/signup buttons, show logout & profile only if they exist
        if (loginBtn) loginBtn.style.display = "none";
        if (signupBtn) signupBtn.style.display = "none";
        if (logoutBtn) logoutBtn.style.display = "inline";
        if (writePost) writePost.style.display = "inline";
        if (profile) profile.style.display = "inline";

        // Update profile picture and username
        if (userPic) userPic.src = user.profilePic || "default-avatar.png";
        if (username) username.textContent = user.username;
    }

    if (user) {
        updateUI(user);
    }

    // Login event listener
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const formData = new FormData(loginForm);
            const loginData = Object.fromEntries(formData);
            
            const response = await fetch("/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(loginData)
            });

            const result = await response.json();
            alert(result.message);

            if (result.success) {
                localStorage.setItem("user", JSON.stringify(result.user));
                updateUI(result.user);
            }
        });
    }       

    // Signup event listener
    if (signupForm) {
        signupForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const formData = new FormData(signupForm);
            const response = await fetch("/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(Object.fromEntries(formData))
            });

            const result = await response.json();
            alert(result.message);

            if (result.success) {
                window.location.href = "login.html"; // Redirect to login page
            }
        });
    }

    // Logout function
    window.logout = function () {
        localStorage.removeItem("user");
        window.location.reload();
    };

    // Ensure UI updates on page load
    document.addEventListener("DOMContentLoaded", () => {
        const user = JSON.parse(localStorage.getItem("user"));
        if (user) updateUI(user);
    });
});
