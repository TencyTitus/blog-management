console.log('Frontend script loaded');

document.addEventListener('DOMContentLoaded', function() {
    const isLoggedIn = localStorage.getItem("userLoggedIn") === "true";

    if (isLoggedIn) {
        document.getElementById("write-post").style.display = "block";
        document.getElementById("profile").style.display = "flex";
        document.getElementById("logout-btn").style.display = "block";
        document.getElementById("login-btn").style.display = "none";
        document.getElementById("signup-btn").style.display = "none";

        document.getElementById("user-pic").src = localStorage.getItem("userPic") || "images/default-user.png";
        document.getElementById("username").innerText = localStorage.getItem("username") || "User";
    }
});

function toggleMenu() {
    const navLinks = document.querySelector('.nav-links');
    navLinks.classList.toggle('active');
}

function logout() {
    localStorage.removeItem("userLoggedIn");
    localStorage.removeItem("username");
    localStorage.removeItem("userPic");
    location.reload();
}
