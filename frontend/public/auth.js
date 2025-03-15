document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");
    const user = JSON.parse(localStorage.getItem("user")); // Get user data

    // Handle UI updates after login
    function updateUI(user) {
        if (user) {
            document.getElementById("login-btn").style.display = "none";
            document.getElementById("signup-btn").style.display = "none";
            document.getElementById("logout-btn").style.display = "inline";
            document.getElementById("write-post").style.display = "inline";
            document.getElementById("profile").style.display = "inline";

            document.getElementById("user-pic").src = user.profilePic || "default-avatar.png";
            document.getElementById("username").textContent = user.username;
        }
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
                localStorage.setItem("user", JSON.stringify(result.user));
                updateUI(result.user);
            }
        });
    }

    // Logout function
    window.logout = function () {
        localStorage.removeItem("user");
        window.location.reload();
    };
});
