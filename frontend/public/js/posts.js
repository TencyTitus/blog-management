document.addEventListener("DOMContentLoaded", function() {
    const blogContainer = document.querySelector(".blog-container");

    // Example blog data (Replace with actual backend API call)
    const blogs = [
        { title: "How to Start Blogging", desc: "Beginner tips for starting a successful blog.", img: "images/blog1.jpg", link: "/post1" },
        { title: "SEO for Bloggers", desc: "Increase your reach with effective SEO techniques.", img: "images/blog2.jpg", link: "/post2" },
        { title: "Monetizing Your Blog", desc: "Earn money through blogging with these strategies.", img: "images/blog3.jpg", link: "/post3" }
    ];

    blogs.forEach(blog => {
        const blogCard = document.createElement("div");
        blogCard.classList.add("blog-card");

        blogCard.innerHTML = `
            <img src="${blog.img}" alt="${blog.title}">
            <div class="content">
                <h2>${blog.title}</h2>
                <p>${blog.desc}</p>
                <a href="${blog.link}">Read More</a>
            </div>
        `;

        blogContainer.appendChild(blogCard);
    });
});
