document.addEventListener("DOMContentLoaded", function () {
    const searchForm = document.querySelector(".search-form");

    searchForm.addEventListener("submit", async function (event) {
        event.preventDefault(); // Prevent page reload

        const query = searchForm.querySelector("input[name='query']").value.trim();
        if (!query) return;

        const response = await fetch(`/search?query=${encodeURIComponent(query)}`);
        const searchResults = await response.json();

        displaySearchResults(searchResults);
    });
});

function displaySearchResults(results) {
    const contentDiv = document.querySelector(".content");
    contentDiv.innerHTML = "<h2>Search Results</h2>";

    if (results.length === 0) {
        contentDiv.innerHTML += "<p>No matching posts found.</p>";
        return;
    }

    results.forEach(post => {
        const postElement = document.createElement("div");
        postElement.classList.add("post");
        postElement.innerHTML = `<h3>${post.title}</h3><p>${post.content}</p>`;
        contentDiv.appendChild(postElement);
    });
}
