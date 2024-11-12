

function getLastTwentyRedditPosts() {
    let newsContainerElement = document.getElementById('news-container');
let redditApiUrl = 'https://www.reddit.com/r/xiannetwork.json';
    fetch(redditApiUrl)
        .then(response => response.json())
        .then(data => {
            const posts = data.data.children;
            for (let i = 0; i < data.data.children.length; i++) {
                const post = posts[i].data;
                if (post.author === 'lorythril') {
                const postElement = createPostElement(post);
                newsContainerElement.appendChild(postElement);
                }
            }
        });
}
function processText(text) {
    // Markdown like [text](url) to <a href="url" target="_blank">text</a>
    text = text.replace(/\[(.*?)\]\((https?:\/\/[^\s]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // Plain URLs to <a href="URL" target="_blank">URL</a>, only if not inside an existing anchor tag
    text = text.replace(/(?<!["'])(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
    
    // Preserve line breaks
    text = text.replace(/\n/g, '<br>');

    return text;
}

function createPostElement(post) {
    const postElement = document.createElement('div');
    let postTextUnprocessed = post.selftext.slice(0,400);
    let postText = processText(postTextUnprocessed);
    postElement.className = 'card mb-3';  // Bootstrap card with margin-bottom
    postElement.style.backgroundColor = 'unset';  // Remove the default card background color
    postElement.innerHTML = `
        <div class="card-body" style="padding-left: 0; padding-right: 0;">
            <a href="https://www.reddit.com${post.permalink}" target="_blank" class="text-decoration-none">
                <h5 class="card-title">${post.title}</h5>
            </a>
            <p class="card-text"><small class="text-muted">${new Date(post.created_utc * 1000).toLocaleString()}</small></p>
            <p class="card-text">${postText}...</p>
            <a href="https://www.reddit.com${post.permalink}" target="_blank" class="btn btn-primary btn-sm">Read more on Reddit</a>
        </div>
    `;
    return postElement;
}


getLastTwentyRedditPosts();