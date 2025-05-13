document.addEventListener("DOMContentLoaded", function () {
    const searchForm = document.querySelector(".search-form");
    const searchInput = document.querySelector(".search-input");

    if (searchForm) {
        searchForm.addEventListener("submit", async function (event) {
            event.preventDefault();
            await performSearch();
        });
    }

    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener("input", function() {
            const postsContainer = document.getElementById('posts-container');
            if (postsContainer) {
                postsContainer.innerHTML = '<div class="loading">Searching...</div>';
            }
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(performSearch, 300);
        });
    }
});

async function performSearch() {
    const postsContainer = document.getElementById('posts-container');
    try {
        const searchInput = document.querySelector(".search-input");
        if (!searchInput) return;

        const query = searchInput.value.trim();
        
        // Show loading indicator
        postsContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Searching...</div>';
        
        // If empty query, show all posts or clear results based on context
        if (!query) {
            if (typeof window.loadPosts === 'function') {
                window.loadPosts();
            } else {
                postsContainer.innerHTML = '<div class="info-message">Enter search terms to find posts</div>';
            }
            return;
        }
        
        const response = await fetch(`/api/posts/search?query=${encodeURIComponent(query)}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Search failed: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Render search results directly
        renderSearchResults(data, query);

    } catch (error) {
        console.error('Error searching posts:', error);
        if (postsContainer) {
            postsContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Failed to search posts: ${error.message}</p>
                </div>`;
        }
    }
}

// Function to render search results safely
function renderSearchResults(data, query) {
    const postsContainer = document.getElementById('posts-container');
    if (!postsContainer) return;
    
    postsContainer.innerHTML = '';
    
    // Handle different response formats
    let posts = [];
    if (Array.isArray(data)) {
        posts = data;
    } else if (data && data.posts && Array.isArray(data.posts)) {
        posts = data.posts;
    } else if (data && typeof data === 'object') {
        // Try to convert object to array if possible
        posts = [data];
    } else {
        console.error('Invalid search response format:', data);
        postsContainer.innerHTML = '<div class="error-message">Error: Invalid search response format</div>';
        return;
    }
    
    if (!posts || posts.length === 0) {
        postsContainer.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <p>No posts found matching "${query || ''}"</p>
            </div>`;
        return;
    }
    
    // Use for loop instead of forEach to avoid issues
    for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        if (!post) continue; // Skip if post is undefined
        
        const postCard = document.createElement('div');
        postCard.className = 'post-card';
        
        // Format date safely
        let formattedDate = 'Unknown date';
        try {
            if (post.createdAt) {
                const date = new Date(post.createdAt);
                formattedDate = date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }
        } catch (e) {
            console.error('Date formatting error:', e);
        }
        
        // Truncate content safely
        let truncatedContent = 'No content available';
        try {
            if (post.content && typeof post.content === 'string') {
                truncatedContent = post.content.length > 200 
                    ? post.content.substring(0, 200) + '...' 
                    : post.content;
            }
        } catch (e) {
            console.error('Content processing error:', e);
        }
        
        // Get author name safely
        let authorName = 'Anonymous';
        try {
            if (post.userId && post.userId.username) {
                authorName = post.userId.username;
            } else if (post.author) {
                authorName = post.author;
            }
        } catch (e) {
            console.error('Author processing error:', e);
        }
        
        postCard.innerHTML = `
            <div class="post-header">
                <h2 class="post-title">${post.title || 'Untitled Post'}</h2>
                <span class="post-category">${post.category || 'Uncategorized'}</span>
            </div>
            <div class="post-content">
                ${truncatedContent}
            </div>
            <div class="post-footer">
                <div class="post-meta">
                    <span><i class="far fa-calendar"></i> ${formattedDate}</span>
                    <span><i class="far fa-user"></i> ${authorName}</span>
                </div>
                <button onclick="window.location.href='/post.html?id=${post._id}'" class="read-more-btn">
                    <i class="fas fa-eye"></i> Read More
                </button>
            </div>
        `;
        postsContainer.appendChild(postCard);
    }
}
