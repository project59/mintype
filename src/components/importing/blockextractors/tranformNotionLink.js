export function transformNotionPageLinks(htmlString, rootId) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString;

    // Find all anchor elements with href ending in .html
    const pageLinks = tempDiv.querySelectorAll('a[href$=".html"]');

    pageLinks.forEach(linkElement => {
        const href = linkElement.getAttribute('href');
        const linkText = linkElement.textContent;

        // Extract the ID from the href
        // Looking for pattern like "1802e7e9c13b8008bd1afede10f1c78f.html"
        const match = href.match(/([a-f0-9]{32})\.html$/i);
        if (match) {
            const pageId = match[1];

            // Update the href attribute
            linkElement.href = `${import.meta.env.VITE_FRONTEND_URL}/workspace/${rootId}/${pageId}`;
            // Link text stays the same
        }
    });

    return tempDiv.innerHTML;
}