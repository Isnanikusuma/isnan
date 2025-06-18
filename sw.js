// Service Worker untuk Story App
// File: sw.js

const CACHE_NAME = 'story-app-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/app.js',
    '/styles.css',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    '/icons/badge-72x72.png',
    // Tambahkan asset lain yang ingin di-cache
    'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.7.1/dist/leaflet.js'
];

// Install event - Cache resources
self.addEventListener('install', (event) => {
    console.log('Service Worker: Install event');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching files');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('Service Worker: All files cached');
                // Force activation of new service worker
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('Service Worker: Cache failed', error);
            })
    );
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activate event');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker: Claiming clients');
            return self.clients.claim();
        })
    );
});

// Fetch event - Serve cached content when offline
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Skip API requests from caching
    if (event.request.url.includes('story-api.dicoding.dev')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch from network
                if (response) {
                    console.log('Service Worker: Serving from cache', event.request.url);
                    return response;
                }

                console.log('Service Worker: Fetching from network', event.request.url);
                return fetch(event.request).then((response) => {
                    // Don't cache if response is not valid
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Clone response to cache
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                });
            })
            .catch((error) => {
                console.error('Service Worker: Fetch failed', error);
                
                // Return offline page for navigation requests
                if (event.request.destination === 'document') {
                    return caches.match('/index.html');
                }
            })
    );
});

// Push event - Handle incoming push notifications
self.addEventListener('push', (event) => {
    console.log('Service Worker: Push event received');

    let notificationData = {
        title: 'Story App',
        body: 'Anda memiliki notifikasi baru',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'story-notification',
        requireInteraction: false,
        data: {
            url: '/',
            timestamp: Date.now()
        },
        actions: [
            {
                action: 'view',
                title: 'Lihat',
                icon: '/icons/action-view.png'
            },
            {
                action: 'dismiss',
                title: 'Tutup',
                icon: '/icons/action-dismiss.png'
            }
        ]
    };

    // Parse notification data if available
    if (event.data) {
        try {
            const payloadData = event.data.json();
            notificationData = { ...notificationData, ...payloadData };
        } catch (error) {
            console.error('Service Worker: Error parsing push data', error);
            notificationData.body = event.data.text() || notificationData.body;
        }
    }

    // Show notification
    event.waitUntil(
        self.registration.showNotification(notificationData.title, notificationData)
            .then(() => {
                console.log('Service Worker: Notification shown');
            })
            .catch((error) => {
                console.error('Service Worker: Error showing notification', error);
            })
    );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
    console.log('Service Worker: Notification click event');

    const notification = event.notification;
    const action = event.action;
    
    notification.close();

    if (action === 'dismiss') {
        // Do nothing, just close the notification
        return;
    }

    // Handle notification click
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                const urlToOpen = notification.data?.url || '/';
                
                // Check if app is already open
                for (const client of clientList) {
                    if (client.url.includes(urlToOpen) && 'focus' in client) {
                        return client.focus();
                    }
                }
                
                // Open new window if app is not open
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
            .catch((error) => {
                console.error('Service Worker: Error handling notification click', error);
            })
    );
});

// Background sync event (for future offline functionality)
self.addEventListener('sync', (event) => {
    console.log('Service Worker: Background sync event', event.tag);
    
    if (event.tag === 'story-sync') {
        event.waitUntil(
            syncStories()
                .then(() => {
                    console.log('Service Worker: Stories synced successfully');
                })
                .catch((error) => {
                    console.error('Service Worker: Story sync failed', error);
                })
        );
    }
});

// Sync stories function (for offline functionality)
async function syncStories() {
    try {
        // Get pending stories from IndexedDB
        const pendingStories = await getPendingStories();
        
        if (pendingStories.length === 0) {
            return;
        }

        // Try to sync each pending story
        for (const story of pendingStories) {
            try {
                await syncSingleStory(story);
                await removePendingStory(story.id);
            } catch (error) {
                console.error('Service Worker: Failed to sync story', story.id, error);
            }
        }
    } catch (error) {
        console.error('Service Worker: Sync stories failed', error);
    }
}

// Helper functions for offline story sync
async function getPendingStories() {
    // Implementation would use IndexedDB to store pending stories
    // For now, return empty array
    return [];
}

async function syncSingleStory(story) {
    // Implementation would send story to API
    // For now, just log
    console.log('Service Worker: Syncing story', story);
}

async function removePendingStory(storyId) {
    // Implementation would remove story from IndexedDB
    // For now, just log
    console.log('Service Worker: Removing pending story', storyId);
}

// Message event - Handle messages from main thread
self.addEventListener('message', (event) => {
    console.log('Service Worker: Message received', event.data);
    
    if (event.data && event.data.type) {
        switch (event.data.type) {
            case 'SKIP_WAITING':
                self.skipWaiting();
                break;
                
            case 'GET_VERSION':
                event.ports[0].postMessage({
                    type: 'VERSION',
                    version: CACHE_NAME
                });
                break;
                
            case 'CLEAR_CACHE':
                caches.delete(CACHE_NAME).then(() => {
                    event.ports[0].postMessage({
                        type: 'CACHE_CLEARED',
                        success: true
                    });
                });
                break;
                
            default:
                console.log('Service Worker: Unknown message type', event.data.type);
        }
    }
});

// Handle errors
self.addEventListener('error', (event) => {
    console.error('Service Worker: Error event', event.error);
});

// Handle unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
    console.error('Service Worker: Unhandled promise rejection', event.reason);
    event.preventDefault();
});

// Periodic background sync (experimental)
self.addEventListener('periodicsync', (event) => {
    console.log('Service Worker: Periodic sync event', event.tag);
    
    if (event.tag === 'story-periodic-sync') {
        event.waitUntil(
            syncStories()
                .then(() => {
                    console.log('Service Worker: Periodic sync completed');
                })
                .catch((error) => {
                    console.error('Service Worker: Periodic sync failed', error);
                })
        );
    }
});

console.log('Service Worker: Script loaded');