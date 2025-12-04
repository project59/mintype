export function getWorkspaceRandomImage() {
    const Urls = [
        'https://images.unsplash.com/photo-1456926631375-92c8ce872def?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1740',
        'https://images.unsplash.com/photo-1589656966895-2f33e7653819?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1740',
        'https://images.unsplash.com/photo-1690207925008-2ab494a360e6?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1740',
        'https://images.unsplash.com/photo-1738028449238-fa5ae8c33bce?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1740',
        'https://images.unsplash.com/photo-1670248012895-1cd8139bf32c?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1932',
        'https://images.unsplash.com/photo-1698298836213-f721f3f40e0a?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1932'
    ]

    // Return one of these URLs at random
    const randomIndex = Math.floor(Math.random() * Urls.length);
    return Urls[randomIndex];
}

export function getRandomTrashedMessage()
{
    const messages = [
        "Moved to the trash.",
        "Didn't like that page anyway. Trashed.",
        "It's been trashed.",
        "Deleted.",
    ];

    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex];
}