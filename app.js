const { useState, useEffect } = React;

function App() {
    const [quotes, setQuotes] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isFading, setIsFading] = useState(false);

    const [imagePosition, setImagePosition] = useState('right');
    const [zoomedImage, setZoomedImage] = useState(null);

    const [backgrounds, setBackgrounds] = useState(["sun rise 2.jpg"]);
    const [bgIndex, setBgIndex] = useState(0);

    const [viewedHistory, setViewedHistory] = useState([]);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    const [isAdminOpen, setIsAdminOpen] = useState(false);
    const [rememberAdminToken, setRememberAdminToken] = useState(() => localStorage.getItem('daily_quote_remember_admin_token') === '1');
    const [adminToken, setAdminToken] = useState(() => {
        if (localStorage.getItem('daily_quote_remember_admin_token') === '1') {
            return localStorage.getItem('daily_quote_admin_token') || '';
        }
        return sessionStorage.getItem('daily_quote_admin_token') || '';
    });
    const [adminUsername, setAdminUsername] = useState(() => localStorage.getItem('daily_quote_admin_username') || 'admin');
    const [adminPassword, setAdminPassword] = useState('');
    const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => Boolean(
        localStorage.getItem('daily_quote_admin_token') || sessionStorage.getItem('daily_quote_admin_token')
    ));
    const [loggingIn, setLoggingIn] = useState(false);
    const [selectedImageFile, setSelectedImageFile] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [adminMessage, setAdminMessage] = useState('');

    const getTodayKey = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getImageSrc = (image) => {
        if (!image) return '';
        if (image.startsWith('http') || image.startsWith('images/') || image.startsWith('/')) {
            return image;
        }
        return `images/${image}`;
    };

    useEffect(() => {
        // Fetch backgrounds list
        fetch('backgrounds.json')
            .then(res => res.json())
            .then(data => {
                if (data && data.length > 0) {
                    setBackgrounds(data);
                }
            })
            .catch(err => {
                console.log("No backgrounds.json found, using default.", err);
            });

        const loadQuotes = async () => {
            const liveResponse = await fetch('/.netlify/functions/quotes');
            if (liveResponse.ok) {
                return liveResponse.json();
            }

            const localResponse = await fetch('quotes.json');
            if (!localResponse.ok) {
                throw new Error('Unable to load quotes.');
            }
            return localResponse.json();
        };

        // Fetch saved quotes from Netlify Blobs, then fall back to the local JSON file.
        loadQuotes()
            .then(data => {
                setQuotes(data);
                
                const today = getTodayKey();
                const storageKey = `quote_history_${today}`;
                
                // Clear old history if day changed
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('quote_history_') && key !== storageKey) {
                        localStorage.removeItem(key);
                    }
                }

                // Load today's history
                let history = [];
                const savedHistory = localStorage.getItem(storageKey);
                if (savedHistory) {
                    history = JSON.parse(savedHistory);
                    setViewedHistory(history);
                }
                
                // Find today's quote based on local time
                const todayQuoteIndex = data.findIndex(q => q.date === today);
                
                let initialIndex = 0;
                if (todayQuoteIndex !== -1) {
                    initialIndex = todayQuoteIndex;
                } else if (history.length > 0) {
                    initialIndex = history[history.length - 1]; // Restore last viewed
                } else {
                    initialIndex = Math.floor(Math.random() * data.length);
                }
                
                setCurrentIndex(initialIndex);
                
                if (history.length === 0 || history[history.length - 1] !== initialIndex) {
                    const newHistory = [...history, initialIndex];
                    setViewedHistory(newHistory);
                    localStorage.setItem(storageKey, JSON.stringify(newHistory));
                }

                setLoading(false);
            })
            .catch(err => {
                console.error("Error loading quotes:", err);
                setLoading(false);
            });
    }, []);

    const changeQuote = (newIndex) => {
        if (isFading) return; // Prevent spam clicking
        setIsFading(true);
        setTimeout(() => {
            setCurrentIndex(newIndex);
            
            setViewedHistory(prev => {
                if (prev.length === 0 || prev[prev.length - 1] !== newIndex) {
                    const newHistory = [...prev, newIndex];
                    const today = getTodayKey();
                    localStorage.setItem(`quote_history_${today}`, JSON.stringify(newHistory));
                    return newHistory;
                }
                return prev;
            });

            setIsFading(false);
        }, 600); // Wait for the fade out transition (600ms matching CSS)
    };

    const handlePrev = () => {
        const newIndex = currentIndex === 0 ? quotes.length - 1 : currentIndex - 1;
        changeQuote(newIndex);
    };

    const handleNext = () => {
        const newIndex = currentIndex === quotes.length - 1 ? 0 : currentIndex + 1;
        changeQuote(newIndex);
    };

    const handleRandom = () => {
        if (quotes.length <= 1) return;
        
        let available = [];
        for (let i = 0; i < quotes.length; i++) {
            if (!viewedHistory.includes(i)) {
                available.push(i);
            }
        }
        
        if (available.length === 0) {
            // All quotes seen today, allow any except current
            for (let i = 0; i < quotes.length; i++) {
                if (i !== currentIndex) available.push(i);
            }
        }
        
        const newIndex = available[Math.floor(Math.random() * available.length)];
        changeQuote(newIndex);
    };

    const handlePrevBg = () => {
        if (backgrounds.length <= 1) return;
        setBgIndex(prev => (prev === 0 ? backgrounds.length - 1 : prev - 1));
    };

    const handleNextBg = () => {
        if (backgrounds.length <= 1) return;
        setBgIndex(prev => (prev === backgrounds.length - 1 ? 0 : prev + 1));
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Disable shortcuts if modals are open
            if (isHistoryOpen || isAdminOpen || zoomedImage) return;

            if (e.key === 'ArrowLeft') {
                handlePrev();
            } else if (e.key === 'ArrowRight') {
                handleNext();
            } else if (e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault(); // Prevent default page scroll
                handleRandom();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handlePrev, handleNext, handleRandom, isHistoryOpen, isAdminOpen, zoomedImage]);

    const prepareImageForUpload = (file) => {
        const maxDimension = 1600;
        const maxBytes = 5.5 * 1024 * 1024;

        if (!file || !file.type.startsWith('image/') || file.type === 'image/gif') {
            return Promise.resolve(file);
        }

        return new Promise((resolve) => {
            const img = new Image();
            const objectUrl = URL.createObjectURL(file);

            img.onload = () => {
                URL.revokeObjectURL(objectUrl);

                if (file.size <= maxBytes && img.width <= maxDimension && img.height <= maxDimension) {
                    resolve(file);
                    return;
                }

                const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);

                const context = canvas.getContext('2d');
                context.drawImage(img, 0, 0, canvas.width, canvas.height);

                canvas.toBlob((blob) => {
                    if (!blob) {
                        resolve(file);
                        return;
                    }

                    const safeName = file.name.replace(/\.[^.]+$/, '') || 'quote-image';
                    resolve(new File([blob], `${safeName}.jpg`, { type: 'image/jpeg' }));
                }, 'image/jpeg', 0.86);
            };

            img.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                resolve(file);
            };

            img.src = objectUrl;
        });
    };

    const saveAdminToken = (value, remember = rememberAdminToken) => {
        if (remember) {
            if (value) {
                localStorage.setItem('daily_quote_admin_token', value);
            } else {
                localStorage.removeItem('daily_quote_admin_token');
            }
        } else {
            if (value) {
                sessionStorage.setItem('daily_quote_admin_token', value);
            } else {
                sessionStorage.removeItem('daily_quote_admin_token');
            }
        }
    };

    const handleRememberAdminTokenChange = (checked) => {
        setRememberAdminToken(checked);

        if (checked) {
            localStorage.setItem('daily_quote_remember_admin_token', '1');
            if (adminToken) {
                localStorage.setItem('daily_quote_admin_token', adminToken);
                sessionStorage.removeItem('daily_quote_admin_token');
            }
        } else {
            localStorage.removeItem('daily_quote_remember_admin_token');
            localStorage.removeItem('daily_quote_admin_token');
            if (adminToken) {
                sessionStorage.setItem('daily_quote_admin_token', adminToken);
            }
        }
    };

    const handleAdminLogin = async (event) => {
        event.preventDefault();

        if (!adminUsername.trim() || !adminPassword) {
            setAdminMessage('Enter your username and password.');
            return;
        }

        setLoggingIn(true);
        setAdminMessage('Logging in...');

        try {
            const response = await fetch('/.netlify/functions/login', {
                method: 'POST',
                headers: {
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    username: adminUsername.trim(),
                    password: adminPassword
                })
            });

            const responseText = await response.text();
            const result = responseText ? JSON.parse(responseText) : null;

            if (!response.ok) {
                if (!result) {
                    throw new Error(`Login failed with status ${response.status}.`);
                }
                throw new Error(result.error || 'Login failed.');
            }

            const token = result?.token || adminPassword;
            const username = result?.username || adminUsername.trim();

            setAdminToken(token);
            saveAdminToken(token);
            localStorage.setItem('daily_quote_admin_username', username);
            setAdminUsername(username);
            setAdminPassword('');
            setIsAdminLoggedIn(true);
            setAdminMessage('Logged in. Choose an image to upload.');
        } catch (err) {
            if (adminPassword) {
                const username = adminUsername.trim() || 'admin';
                setAdminToken(adminPassword);
                saveAdminToken(adminPassword);
                localStorage.setItem('daily_quote_admin_username', username);
                setAdminUsername(username);
                setAdminPassword('');
                setIsAdminLoggedIn(true);
                setAdminMessage('Logged in using password as upload token. Choose an image to upload.');
            } else {
                setAdminMessage(err.message || 'Login failed.');
            }
        } finally {
            setLoggingIn(false);
        }
    };

    const handleAdminLogout = () => {
        setAdminToken('');
        setAdminPassword('');
        setIsAdminLoggedIn(false);
        setSelectedImageFile(null);
        setAdminMessage('Logged out.');
        localStorage.removeItem('daily_quote_admin_token');
        sessionStorage.removeItem('daily_quote_admin_token');
    };

    const handleImageUpload = async (event) => {
        event.preventDefault();

        if (!isAdminLoggedIn || !adminToken.trim()) {
            setAdminMessage('Log in before uploading an image.');
            return;
        }

        if (!selectedImageFile) {
            setAdminMessage('Choose an image to upload.');
            return;
        }

        setUploadingImage(true);
        setAdminMessage('Uploading image...');

        try {
            const image = await prepareImageForUpload(selectedImageFile);
            const formData = new FormData();
            formData.append('quoteIndex', String(currentIndex));
            formData.append('quotes', JSON.stringify(quotes));
            formData.append('image', image);

            const response = await fetch('/.netlify/functions/save-quote-image', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${adminToken.trim()}`
                },
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Upload failed.');
            }

            setQuotes(result.quotes);
            setSelectedImageFile(null);
            setAdminMessage('Image saved for this quote.');
        } catch (err) {
            setAdminMessage(err.message || 'Upload failed.');
        } finally {
            setUploadingImage(false);
        }
    };

    if (loading) {
        return <div className="app-container"><div className="quote-text">Loading...</div></div>;
    }

    if (quotes.length === 0) {
        return <div className="app-container"><div className="quote-text">No quotes available.</div></div>;
    }

    const currentQuote = quotes[currentIndex];

    return (
        <div className="app-container">
            <div 
                className={`bg-layer`}
                style={{
                    backgroundImage: `
                        linear-gradient(to top, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0) 30%),
                        radial-gradient(circle at 30% 35%, rgba(255, 240, 180, 0.4) 0%, rgba(255, 220, 150, 0) 50%),
                        url('backgrounds/${backgrounds[bgIndex]}')
                    `
                }}
            >
                <div className="sun-rays"></div>
            </div>
            <div className="overlay"></div>

            {backgrounds.length > 1 && (
                <>
                    <button className="bg-arrow bg-arrow-left" onClick={handlePrevBg} aria-label="Previous background">
                        &#10094;
                    </button>
                    <button className="bg-arrow bg-arrow-right" onClick={handleNextBg} aria-label="Next background">
                        &#10095;
                    </button>
                </>
            )}
            
            <div className={`content-wrapper ${isFading ? 'fading' : ''} layout-${imagePosition}`}>
                <div className="quote-box">
                    <h1 className="quote-text">"{currentQuote.quote}"</h1>
                    <p className="quote-author">{currentQuote.author}</p>
                </div>
                {currentQuote.image && imagePosition !== 'hidden' && (
                    <div className="quote-image-box">
                        <img 
                            src={getImageSrc(currentQuote.image)} 
                            alt="Quote visual" 
                            className="quote-image clickable" 
                            onClick={() => setZoomedImage(currentQuote.image)}
                        />
                    </div>
                )}
            </div>

            {currentQuote.image && (
                <div className="image-position-controls">
                    <button onClick={() => setImagePosition('top')} className={imagePosition === 'top' ? 'active' : ''}>Top</button>
                    <button onClick={() => setImagePosition('left')} className={imagePosition === 'left' ? 'active' : ''}>Left</button>
                    <button onClick={() => setImagePosition('right')} className={imagePosition === 'right' ? 'active' : ''}>Right</button>
                    <button onClick={() => setImagePosition('hidden')} className={imagePosition === 'hidden' ? 'active' : ''}>Hide</button>
                </div>
            )}

            <div className="controls">
                <button onClick={handlePrev} aria-label="Previous quote">Prev</button>
                <button onClick={handleRandom} aria-label="Random quote">Random</button>
                <button onClick={handleNext} aria-label="Next quote">Next</button>
                <button onClick={() => setIsHistoryOpen(true)} aria-label="View history">History</button>
                <button onClick={() => setIsAdminOpen(true)} aria-label="Upload images">Upload images</button>
            </div>

            {isAdminOpen && (
                <div className="admin-modal-overlay" onClick={() => setIsAdminOpen(false)}>
                    <form className="admin-modal-content" onSubmit={isAdminLoggedIn ? handleImageUpload : handleAdminLogin} onClick={e => e.stopPropagation()}>
                        <div className="admin-header">
                            <h2>{isAdminLoggedIn ? 'Quote Image' : 'Login'}</h2>
                            <button type="button" className="admin-close" onClick={() => setIsAdminOpen(false)}>&times;</button>
                        </div>

                        {!isAdminLoggedIn && (
                            <>
                                <label className="admin-field">
                                    <span>Username</span>
                                    <input
                                        type="text"
                                        value={adminUsername}
                                        onChange={e => setAdminUsername(e.target.value)}
                                        placeholder="admin"
                                        autoComplete="username"
                                    />
                                </label>

                                <label className="admin-field">
                                    <span>Password</span>
                                    <input
                                        type="password"
                                        value={adminPassword}
                                        onChange={e => setAdminPassword(e.target.value)}
                                        placeholder="Your admin password"
                                        autoComplete="current-password"
                                    />
                                </label>
                            </>
                        )}

                        {isAdminLoggedIn && (
                            <>
                                <div className="admin-session">
                                    <span>Logged in as {adminUsername}</span>
                                    <button type="button" onClick={handleAdminLogout}>Log out</button>
                                </div>

                                <label className="admin-field">
                                    <span>Quote</span>
                                    <select value={currentIndex} onChange={e => changeQuote(Number(e.target.value))}>
                                        {quotes.map((quote, index) => (
                                            <option key={index} value={index}>
                                                {index + 1}. {quote.quote.substring(0, 70)}{quote.quote.length > 70 ? '...' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </>
                        )}

                        <label className="admin-remember">
                            <input
                                type="checkbox"
                                checked={rememberAdminToken}
                                onChange={e => handleRememberAdminTokenChange(e.target.checked)}
                            />
                            <span>Remember on this device</span>
                        </label>

                        {isAdminLoggedIn && (
                            <>
                                <label className="admin-file-picker">
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp,image/gif"
                                        onChange={e => {
                                            setSelectedImageFile(e.target.files[0] || null);
                                            setAdminMessage('');
                                        }}
                                    />
                                    <span>{selectedImageFile ? selectedImageFile.name : 'Choose image'}</span>
                                </label>

                                {currentQuote.image && (
                                    <div className="admin-current-image">
                                        <img src={getImageSrc(currentQuote.image)} alt="Current quote visual" />
                                    </div>
                                )}
                            </>
                        )}

                        {adminMessage && <p className="admin-message">{adminMessage}</p>}

                        <div className="admin-actions">
                            <button type="button" onClick={() => setIsAdminOpen(false)}>Cancel</button>
                            <button type="submit" disabled={uploadingImage || loggingIn}>
                                {isAdminLoggedIn
                                    ? (uploadingImage ? 'Saving...' : 'Save Image')
                                    : (loggingIn ? 'Logging in...' : 'Login')}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* History Modal */}
            {isHistoryOpen && (
                <div className="history-modal-overlay" onClick={() => setIsHistoryOpen(false)}>
                    <div className="history-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="history-header">
                            <h2>Today's History</h2>
                            <button className="history-close" onClick={() => setIsHistoryOpen(false)}>&times;</button>
                        </div>
                        <div className="history-list">
                            {viewedHistory.length > 0 ? (
                                viewedHistory.slice().reverse().map((idx, i) => {
                                    const q = quotes[idx];
                                    if (!q) return null;
                                    return (
                                        <div key={i} className="history-item" onClick={() => { changeQuote(idx); setIsHistoryOpen(false); }}>
                                            <p className="history-quote-text">"{q.quote.substring(0, 80)}{q.quote.length > 80 ? '...' : ''}"</p>
                                            <p className="history-author">- {q.author}</p>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="history-empty">No quotes viewed yet today.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Lightbox Modal */}
            {zoomedImage && (
                <div className="lightbox-overlay" onClick={() => setZoomedImage(null)}>
                    <button className="lightbox-close" onClick={() => setZoomedImage(null)} aria-label="Close zoomed image">&times;</button>
                    <img 
                        src={getImageSrc(zoomedImage)} 
                        alt="Zoomed Quote visual" 
                        className="lightbox-image" 
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
