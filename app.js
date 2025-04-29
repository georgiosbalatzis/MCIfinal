// Configuration
const API_KEY = '3fd2be6f0c70a2a598f084ddfb75487c'; // This is a public TMDB API key for demo purposes only
const API_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';
const POSTER_SIZE = 'w500';
const BACKDROP_SIZE = 'original';

// DOM Elements
const popularMoviesContainer = document.getElementById('popular-movies');
const nowPlayingMoviesContainer = document.getElementById('now-playing-movies');
const upcomingMoviesContainer = document.getElementById('upcoming-movies');
const topRatedMoviesContainer = document.getElementById('top-rated-movies');
const searchResultsContainer = document.getElementById('search-results');
const errorContainer = document.getElementById('error-container');
const movieDetailContainer = document.getElementById('movie-detail');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const navLinks = document.querySelectorAll('nav ul li a');

const sections = {
    'popular': document.getElementById('popular-section'),
    'now-playing': document.getElementById('now-playing-section'),
    'upcoming': document.getElementById('upcoming-section'),
    'top-rated': document.getElementById('top-rated-section'),
    'search-results': document.getElementById('search-results-section')
};

// State management
let currentPage = 1;
let totalPages = 0;
let currentCategory = 'popular';
let currentSearchQuery = '';
let isLoading = false;

// Language mappings for common languages
const languageNames = {
    'en': 'Αγγλικά',
    'es': 'Ισπανικά',
    'fr': 'Γαλλικά',
    'de': 'Γερμανικά',
    'it': 'Ιταλικά',
    'ja': 'Ιαπωνικά',
    'ko': 'Κορεατικά',
    'zh': 'Κινέζικα',
    'ru': 'Ρωσικά',
    'pt': 'Πορτογαλικά',
    'el': 'Ελληνικά'
};

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    fetchMovies('movie/popular', popularMoviesContainer);

    // Event Listeners
    searchForm.addEventListener('submit', handleSearch);

    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', handleNavigation);
    });

    // Scroll event for infinite scrolling
    window.addEventListener('scroll', handleInfiniteScroll);

    // Handle History API changes
    window.addEventListener('popstate', handlePopState);
});

// Handle Navigation
function handleNavigation(e) {
    e.preventDefault();

    // Update active state
    navLinks.forEach(link => link.classList.remove('active'));
    e.target.classList.add('active');

    // Get section name
    const sectionName = e.target.dataset.section;
    currentCategory = sectionName;
    currentPage = 1;

    // Update browser history
    const stateObj = { category: sectionName };
    history.pushState(stateObj, '', `#${sectionName}`);

    // Show corresponding section
    Object.keys(sections).forEach(key => {
        sections[key].style.display = (key === sectionName) ? 'block' : 'none';
    });

    // Load data if not already loaded
    const container = sections[sectionName].querySelector('.movie-grid');
    if (container && container.children.length === 0) {
        let endpoint = '';

        switch(sectionName) {
            case 'popular':
                endpoint = 'movie/popular';
                break;
            case 'now-playing':
                endpoint = 'movie/now_playing';
                break;
            case 'upcoming':
                endpoint = 'movie/upcoming';
                break;
            case 'top-rated':
                endpoint = 'movie/top_rated';
                break;
        }

        if (endpoint) {
            fetchMovies(endpoint, container);
        }
    }
}

// Handle History API changes
function handlePopState(e) {
    if (e.state && e.state.category) {
        // Find the corresponding nav link and click it
        const link = document.querySelector(`nav ul li a[data-section="${e.state.category}"]`);
        if (link) {
            link.click();
        }
    } else if (e.state && e.state.searchQuery) {
        // Handle back to search results
        currentSearchQuery = e.state.searchQuery;
        Object.values(sections).forEach(section => {
            section.style.display = 'none';
        });
        sections['search-results'].style.display = 'block';
        navLinks.forEach(link => link.classList.remove('active'));
        searchInput.value = currentSearchQuery;
        fetchSearchResults(currentSearchQuery);
    } else {
        // Default to popular if nothing else
        const defaultLink = document.querySelector('nav ul li a[data-section="popular"]');
        if (defaultLink) {
            defaultLink.click();
        }
    }
}

// Handle Search
function handleSearch(e) {
    e.preventDefault();
    const query = searchInput.value.trim();

    if (query) {
        currentSearchQuery = query;
        currentPage = 1;

        // Update browser history
        const stateObj = { searchQuery: query };
        history.pushState(stateObj, '', `#search=${encodeURIComponent(query)}`);

        // Hide all other sections
        Object.values(sections).forEach(section => {
            section.style.display = 'none';
        });

        // Show search results section
        sections['search-results'].style.display = 'block';

        // Clear active state from nav links
        navLinks.forEach(link => link.classList.remove('active'));

        // Fetch search results
        searchResultsContainer.innerHTML = '<div class="loading"><div class="loader"></div></div>';
        fetchSearchResults(query);
    }
}

// Fetch Movies
async function fetchMovies(endpoint, container, page = 1, append = false) {
    if (isLoading) return;

    try {
        isLoading = true;

        if (!append) {
            container.innerHTML = '<div class="loading"><div class="loader"></div></div>';
        } else {
            // Add loading indicator at the bottom when appending
            const loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'loading';
            loadingIndicator.innerHTML = '<div class="loader"></div>';
            loadingIndicator.id = 'loading-more';
            container.appendChild(loadingIndicator);
        }

        const response = await fetch(`${API_BASE_URL}/${endpoint}?api_key=${API_KEY}&language=el-GR&page=${page}`);

        if (!response.ok) {
            throw new Error('Σφάλμα δικτύου.');
        }

        const data = await response.json();
        totalPages = data.total_pages;

        // Remove loading indicator if appending
        if (append) {
            const loadingIndicator = document.getElementById('loading-more');
            if (loadingIndicator) {
                loadingIndicator.remove();
            }
        }

        if (data.results.length === 0 && !append) {
            container.innerHTML = '<div class="no-results">Δεν βρέθηκαν ταινίες.</div>';
            return;
        }

        displayMovies(data.results, container, append);
        currentPage = page;

    } catch (error) {
        console.error('Error fetching movies:', error);
        showError('Παρουσιάστηκε σφάλμα κατά τη φόρτωση των ταινιών. Δοκιμάστε ξανά αργότερα.');
        if (!append) {
            container.innerHTML = '';
        } else {
            const loadingIndicator = document.getElementById('loading-more');
            if (loadingIndicator) {
                loadingIndicator.remove();
            }
        }
    } finally {
        isLoading = false;
    }
}

// Fetch Search Results
async function fetchSearchResults(query, page = 1, append = false) {
    if (isLoading) return;

    try {
        isLoading = true;

        if (!append) {
            searchResultsContainer.innerHTML = '<div class="loading"><div class="loader"></div></div>';
        } else {
            // Add loading indicator at the bottom when appending
            const loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'loading';
            loadingIndicator.innerHTML = '<div class="loader"></div>';
            loadingIndicator.id = 'loading-more';
            searchResultsContainer.appendChild(loadingIndicator);
        }

        const response = await fetch(`${API_BASE_URL}/search/movie?api_key=${API_KEY}&language=el-GR&query=${encodeURIComponent(query)}&include_adult=false&page=${page}`);

        if (!response.ok) {
            throw new Error('Σφάλμα δικτύου.');
        }

        const data = await response.json();
        totalPages = data.total_pages;

        // Remove loading indicator if appending
        if (append) {
            const loadingIndicator = document.getElementById('loading-more');
            if (loadingIndicator) {
                loadingIndicator.remove();
            }
        }

        if (data.results.length === 0 && !append) {
            searchResultsContainer.innerHTML = '<div class="no-results">Δεν βρέθηκαν αποτελέσματα για την αναζήτησή σας.</div>';
            return;
        }

        displayMovies(data.results, searchResultsContainer, append);
        currentPage = page;

    } catch (error) {
        console.error('Error fetching search results:', error);
        showError('Παρουσιάστηκε σφάλμα κατά την αναζήτηση. Δοκιμάστε ξανά αργότερα.');
        if (!append) {
            searchResultsContainer.innerHTML = '';
        } else {
            const loadingIndicator = document.getElementById('loading-more');
            if (loadingIndicator) {
                loadingIndicator.remove();
            }
        }
    } finally {
        isLoading = false;
    }
}

// Display Movies
function displayMovies(movies, container, append = false) {
    if (!append) {
        container.innerHTML = '';
    }

    movies.forEach((movie, index) => {
        if (!movie.poster_path) return; // Skip movies without posters

        const card = document.createElement('div');
        card.className = 'movie-card slide-up';
        card.style.animationDelay = `${index * 0.05}s`;

        const posterPath = movie.poster_path
            ? `${IMAGE_BASE_URL}/${POSTER_SIZE}${movie.poster_path}`
            : 'https://via.placeholder.com/200x300?text=No+Poster'; // Default placeholder if no poster

        const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A';

        card.innerHTML = `
            <img class="movie-poster" src="${posterPath}" alt="${movie.title}">
            <div class="movie-info">
                <h3 class="movie-title">${movie.title}</h3>
                <div class="movie-meta">
                    <span>${releaseYear}</span>
                    <span class="movie-rating">★ ${movie.vote_average.toFixed(1)}</span>
                </div>
            </div>
        `;

        // Add data attributes for filtering and sorting
        card.dataset.id = movie.id;
        card.dataset.rating = movie.vote_average;
        card.dataset.year = releaseYear;

        card.addEventListener('click', () => fetchMovieDetails(movie.id));
        container.appendChild(card);
    });
}

// Handle Infinite Scroll
function handleInfiniteScroll() {
    if (isLoading || currentPage >= totalPages) return;

    const scrollPosition = window.innerHeight + window.scrollY;
    const bodyHeight = document.body.offsetHeight;

    // If scrolled to near bottom
    if (scrollPosition >= bodyHeight - 500) {
        // Determine which endpoint to use based on current visible section
        let container, endpoint;

        if (sections['search-results'].style.display === 'block') {
            container = searchResultsContainer;
            fetchSearchResults(currentSearchQuery, currentPage + 1, true);
        } else {
            switch(currentCategory) {
                case 'popular':
                    container = popularMoviesContainer;
                    endpoint = 'movie/popular';
                    break;
                case 'now-playing':
                    container = nowPlayingMoviesContainer;
                    endpoint = 'movie/now_playing';
                    break;
                case 'upcoming':
                    container = upcomingMoviesContainer;
                    endpoint = 'movie/upcoming';
                    break;
                case 'top-rated':
                    container = topRatedMoviesContainer;
                    endpoint = 'movie/top_rated';
                    break;
            }

            if (container && endpoint) {
                fetchMovies(endpoint, container, currentPage + 1, true);
            }
        }
    }
}

// Fetch Movie Details
async function fetchMovieDetails(movieId) {
    try {
        movieDetailContainer.innerHTML = '<div class="loading"><div class="loader"></div></div>';
        movieDetailContainer.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent scrolling

        const response = await fetch(`${API_BASE_URL}/movie/${movieId}?api_key=${API_KEY}&language=el-GR&append_to_response=credits,videos,recommendations`);

        if (!response.ok) {
            throw new Error('Σφάλμα δικτύου.');
        }

        const movie = await response.json();
        displayMovieDetails(movie);

    } catch (error) {
        console.error('Error fetching movie details:', error);
        showError('Παρουσιάστηκε σφάλμα κατά τη φόρτωση των λεπτομερειών της ταινίας. Δοκιμάστε ξανά αργότερα.');
        closeMovieDetails();
    }
}

// Display Movie Details
function displayMovieDetails(movie) {
    const backdropPath = movie.backdrop_path
        ? `${IMAGE_BASE_URL}/${BACKDROP_SIZE}${movie.backdrop_path}`
        : (movie.poster_path ? `${IMAGE_BASE_URL}/${BACKDROP_SIZE}${movie.poster_path}` : 'https://via.placeholder.com/1000x400?text=No+Backdrop');

    const posterPath = movie.poster_path
        ? `${IMAGE_BASE_URL}/${POSTER_SIZE}${movie.poster_path}`
        : 'https://via.placeholder.com/300x450?text=No+Poster';

    // Format Release Date
    const releaseDate = movie.release_date
        ? new Date(movie.release_date).toLocaleDateString('el-GR', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'Άγνωστη ημερομηνία';

    // Format Runtime
    const hours = Math.floor(movie.runtime / 60);
    const minutes = movie.runtime % 60;
    const runtime = movie.runtime ? `${hours}ώ ${minutes}λ` : 'Άγνωστη διάρκεια';

    // Get directors
    const directors = movie.credits?.crew
        .filter(person => person.job === 'Director')
        .map(director => director.name)
        .join(', ') || 'Άγνωστος';

    // Get writers (Screenplay, Writer, Story)
    const writers = movie.credits?.crew
        .filter(person => ['Screenplay', 'Writer', 'Story'].includes(person.job))
        .map(writer => writer.name)
        .filter((name, index, self) => self.indexOf(name) === index) // Remove duplicates
        .join(', ') || 'Άγνωστοι';

    // Format language
    let language = movie.original_language;
    language = languageNames[language] || language;

    // Create detail HTML
    movieDetailContainer.innerHTML = `
        <div class="detail-container fade-in">
            <div class="detail-header">
                <img class="backdrop" src="${backdropPath}" alt="${movie.title}">
                <div class="detail-overlay">
                    <h1 class="detail-title">${movie.title}</h1>
                    ${movie.tagline ? `<p class="detail-tagline">${movie.tagline}</p>` : ''}
                    <div class="detail-meta">
                        <span>${releaseDate}</span>
                        <span>★ ${movie.vote_average.toFixed(1)}</span>
                        <span>${runtime}</span>
                    </div>
                </div>
                <button class="close-button" onclick="closeMovieDetails()">✕</button>
            </div>
            
            <div class="detail-content">
                <img class="detail-poster" src="${posterPath}" alt="${movie.title}">
                
                <div class="detail-info">
                    <div class="detail-tabs">
                        <button class="tab-button active" data-tab="overview">Περίληψη</button>
                        <button class="tab-button" data-tab="details">Λεπτομέρειες</button>
                        <button class="tab-button" data-tab="cast">Συντελεστές</button>
                    </div>
                    
                    <div id="overview-tab" class="tab-content active">
                        <p class="detail-overview">${movie.overview || 'Δεν υπάρχει διαθέσιμη περίληψη.'}</p>
                        
                        <div class="detail-section">
                            <h3>Είδη</h3>
                            <div class="genre-list">
                                ${movie.genres.map(genre => `<span class="genre-tag">${genre.name}</span>`).join('') || 'Άγνωστο'}
                            </div>
                        </div>
                    </div>
                    
                    <div id="details-tab" class="tab-content">
                        <div class="detail-section">
                            <h3>Πληροφορίες</h3>
                            <p><strong>Αρχική Γλώσσα:</strong> ${language}</p>
                            <p><strong>Προϋπολογισμός:</strong> ${movie.budget ? `$${movie.budget.toLocaleString()}` : 'Άγνωστος'}</p>
                            <p><strong>Έσοδα:</strong> ${movie.revenue ? `$${movie.revenue.toLocaleString()}` : 'Άγνωστα'}</p>
                            <p><strong>Κατάσταση:</strong> ${getStatusTranslation(movie.status)}</p>
                            <p><strong>Αρχικός Τίτλος:</strong> ${movie.original_title}</p>
                            <p><strong>Βαθμολογία:</strong> ${movie.vote_average.toFixed(1)} (${movie.vote_count} ψήφοι)</p>
                            <p><strong>Δημοτικότητα:</strong> ${movie.popularity.toFixed(1)}</p>
                            ${movie.homepage ? `<p><strong>Ιστοσελίδα:</strong> <a href="${movie.homepage}" target="_blank" rel="noopener noreferrer">Επίσκεψη ιστοσελίδας</a></p>` : ''}
                        </div>

                        <div class="detail-section">
                            <h3>Εταιρείες Παραγωγής</h3>
                            <p>${movie.production_companies.map(company => company.name).join(', ') || 'Άγνωστες'}</p>
                        </div>
                        
                        <div class="detail-section">
                            <h3>Χώρες Παραγωγής</h3>
                            <p>${movie.production_countries.map(country => country.name).join(', ') || 'Άγνωστες'}</p>
                        </div>
                    </div>
                    
                    <div id="cast-tab" class="tab-content">
                        <div class="detail-section">
                            <h3>Σκηνοθεσία</h3>
                            <p>${directors}</p>
                        </div>
                        
                        <div class="detail-section">
                            <h3>Σενάριο</h3>
                            <p>${writers}</p>
                        </div>
                        
                        <div class="detail-section">
                            <h3>Πρωταγωνιστές</h3>
                            <div class="cast-list">
                                ${movie.credits?.cast.slice(0, 10).map(actor =>
        `<div class="cast-item">
                                        <strong>${actor.name}</strong> ως ${actor.character || 'Άγνωστος ρόλος'}
                                    </div>`
    ).join('') || 'Μη διαθέσιμοι'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add tab functionality
    const tabButtons = movieDetailContainer.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            movieDetailContainer.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            document.getElementById(`${button.dataset.tab}-tab`).classList.add('active');
        });
    });
}

// Get status translation
function getStatusTranslation(status) {
    const statusMap = {
        'Released': 'Κυκλοφόρησε',
        'Post Production': 'Μετά την Παραγωγή',
        'In Production': 'Σε Παραγωγή',
        'Planned': 'Προγραμματισμένη',
        'Canceled': 'Ακυρώθηκε',
        'Rumored': 'Φημολογείται'
    };

    return statusMap[status] || status;
}

// Close Movie Details
function closeMovieDetails() {
    movieDetailContainer.style.display = 'none';
    document.body.style.overflow = 'auto'; // Enable scrolling
}

// Show Error Message
function showError(message) {
    errorContainer.innerHTML = `<div class="error">${message}</div>`;

    // Clear after 5 seconds
    setTimeout(() => {
        errorContainer.innerHTML = '';
    }, 5000);
}

// Utility function to format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR' }).format(amount);
}

// Check URL hash on page load
function checkUrlHash() {
    const hash = window.location.hash;
    if (hash.startsWith('#search=')) {
        const query = decodeURIComponent(hash.replace('#search=', ''));
        searchInput.value = query;
        currentSearchQuery = query;

        // Hide all sections
        Object.values(sections).forEach(section => {
            section.style.display = 'none';
        });

        // Show search results section
        sections['search-results'].style.display = 'block';

        // Clear active state from nav links
        navLinks.forEach(link => link.classList.remove('active'));

        // Fetch search results
        fetchSearchResults(query);
    } else if (hash.startsWith('#')) {
        const category = hash.replace('#', '');
        const link = document.querySelector(`nav ul li a[data-section="${category}"]`);
        if (link) {
            link.click();
        }
    }
}

// Check URL hash on load
checkUrlHash();

// Make closeMovieDetails globally available
window.closeMovieDetails = closeMovieDetails;