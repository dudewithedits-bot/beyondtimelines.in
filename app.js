document.addEventListener('DOMContentLoaded', () => {
    // Check if device is mobile
    const isMobile = window.innerWidth < 768;

    // Dynamic Video CDN Configuration for Vercel / Production
    const CONFIG = {
        // Change this URL to your actual CDN or hosted folder (Vercel Blob, AWS S3, Cloudinary, etc.)
        cdnBaseUrl: 'https://beyond-timelines-assets.vercel.app/videos/'
    };

    // Always use CDN / Production paths on localhost since local media assets are not checked in
    const isProduction = !['localhost', '127.0.0.1'].includes(window.location.hostname);

    // Force CDN redirect for all videos to ensure they load on localhost too
    document.querySelectorAll('video').forEach(video => {
        const currentSrc = video.getAttribute('src');
        if (currentSrc && !currentSrc.startsWith('http') && !currentSrc.startsWith('blob')) {
            // Skip redirecting the local videos on localhost since they are locally present
            const decoded = decodeURIComponent(currentSrc);
            const isLocalAPReel = decoded.includes('A&P WEDDING REEL.mp4');
            const isLocalBanner = decoded.includes('banner BHAWNA & ARCHIT WEDDING TEASER-.mp4');
            const isLocalTeaser = decoded.includes('teaser.mp4');
            if (isLocalAPReel || isLocalBanner || isLocalTeaser) {
                return; // Always load these locally (on localhost and when deployed to Vercel)
            }
            video.src = CONFIG.cdnBaseUrl + currentSrc;
        }
        const currentDataSrc = video.getAttribute('data-src');
        if (currentDataSrc && !currentDataSrc.startsWith('http') && !currentDataSrc.startsWith('blob')) {
            video.setAttribute('data-src', CONFIG.cdnBaseUrl + currentDataSrc);
        }
    });

    // Force CDN redirect for portfolio items
    document.querySelectorAll('[data-video]').forEach(item => {
        const currentVideo = item.getAttribute('data-video');
        if (currentVideo && !currentVideo.startsWith('http') && !currentVideo.startsWith('blob')) {
            item.setAttribute('data-video', CONFIG.cdnBaseUrl + currentVideo);
        }
    });

    // Also update static images to point to the production CDN
    const liveProductionUrl = 'https://bt-dx4c.vercel.app/';
    document.querySelectorAll('img, .portfolio-thumb').forEach(el => {
        if (el.tagName === 'IMG') {
            const currentSrc = el.getAttribute('src');
            if (currentSrc && !currentSrc.startsWith('http') && !currentSrc.startsWith('data:')) {
                el.src = liveProductionUrl + currentSrc;
            }
        } else {
            // Check if there is background image loaded inline or dynamically
            const bg = el.style.backgroundImage;
            if (bg && bg.includes('url(') && !bg.includes('http') && !bg.includes('data:')) {
                const path = bg.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '');
                el.style.backgroundImage = `url('${liveProductionUrl}${path}')`;
            }
        }
    });

    const canvas = document.getElementById('animation-canvas');
    const ctx = canvas.getContext('2d');
    const mobileVideo = document.getElementById('mobile-scroll-video');
    const preloader = document.getElementById('preloader');
    const loaderBar = document.querySelector('.loader-bar');
    const loaderText = document.querySelector('.loader-text');
    const scrollIndicator = document.querySelector('.scroll-indicator');

    // Total number of frames (000 to 190 inclusive = 191 frames)
    const startFrame = 0;
    const endFrame = 190;
    const totalFrames = endFrame - startFrame + 1;

    // Progressive Loading Setup: Pre-allocate images array with nulls
    const images = new Array(totalFrames).fill(null);
    let criticalLoadedCount = 0;
    const CRITICAL_FRAMES_COUNT = 15; // Fast start with first 15 frames (~1.5MB)
    let isCriticalLoadDone = false;

    // Smooth Scrolling LERP Easing variables
    let currentScrollFraction = 0;
    let targetScrollFraction = 0;
    let isLoopRunning = false;

    // Define scroll ranges for each text overlay section (from 0 to 1)
    const textPhases = [
        { id: 'text-phase-1', start: 0.05, end: 0.20 },
        { id: 'text-phase-2', start: 0.25, end: 0.40 },
        { id: 'text-phase-3', start: 0.45, end: 0.60 },
        { id: 'text-phase-4', start: 0.65, end: 0.80 },
        { id: 'text-phase-5', start: 0.85, end: 1.0 }
    ];

    // Helper to format frame filename
    function getFramePath(index) {
        const frameNum = String(startFrame + index).padStart(3, '0');
        return `SCROLL ANIMATION/teaser${frameNum}.jpg`;
    }

    // Preload critical images first, then background load the rest
    function preloadImages() {
        const activeMobile = window.innerWidth < 768;
        if (activeMobile) {
            // Skip image preloading entirely on mobile viewports
            isCriticalLoadDone = true;
            onPreloadComplete();
        } else {
            // On desktop viewports, load critical frames
            for (let i = 0; i < CRITICAL_FRAMES_COUNT; i++) {
                loadFrame(i, true);
            }
        }
    }

    function loadFrame(index, isCritical = false) {
        const img = new Image();
        img.src = getFramePath(index);
        img.onload = () => {
            images[index] = img;
            if (isCritical) {
                criticalLoadedCount++;
                const progress = Math.round((criticalLoadedCount / CRITICAL_FRAMES_COUNT) * 100);
                loaderBar.style.width = `${progress}%`;
                loaderText.textContent = `LOADING PORTFOLIO... ${progress}%`;

                if (criticalLoadedCount === CRITICAL_FRAMES_COUNT && !isCriticalLoadDone) {
                    isCriticalLoadDone = true;
                    onPreloadComplete();
                    loadRemainingFrames();
                }
            }
        };
        img.onerror = () => {
            console.error(`Failed to load critical frame: ${index}`);
            if (isCritical) {
                criticalLoadedCount++;
                if (criticalLoadedCount === CRITICAL_FRAMES_COUNT && !isCriticalLoadDone) {
                    isCriticalLoadDone = true;
                    onPreloadComplete();
                    loadRemainingFrames();
                }
            }
        };
    }

    function loadRemainingFrames() {
        let currentIndex = CRITICAL_FRAMES_COUNT;

        function loadNextChunk() {
            const chunkSize = 5;
            const end = Math.min(totalFrames, currentIndex + chunkSize);
            for (let i = currentIndex; i < end; i++) {
                const img = new Image();
                img.src = getFramePath(i);
                img.onload = ((idx, imageEl) => {
                    return () => {
                        images[idx] = imageEl;
                    };
                })(i, img);
                img.onerror = ((idx) => {
                    return () => {
                        console.warn(`Failed to load background frame: ${idx}`);
                    };
                })(i);
            }
            currentIndex = end;
            if (currentIndex < totalFrames) {
                setTimeout(loadNextChunk, 50);
            }
        }

        loadNextChunk();
    }

    // Helper to find the nearest loaded frame
    function getClosestLoadedImage(index) {
        if (images[index] && images[index].complete) {
            return images[index];
        }
        let step = 1;
        while (index - step >= 0 || index + step < totalFrames) {
            if (index - step >= 0 && images[index - step] && images[index - step].complete) {
                return images[index - step];
            }
            if (index + step < totalFrames && images[index + step] && images[index + step].complete) {
                return images[index + step];
            }
            step++;
        }
        return null;
    }

    function onPreloadComplete() {
        // Fade out preloader
        preloader.classList.add('loaded');

        // Initial setup and draw
        resizeCanvas();

        targetScrollFraction = getScrollFraction();
        currentScrollFraction = targetScrollFraction;

        // Initialize mobile video scrubbing
        const activeMobile = window.innerWidth < 768;
        if (activeMobile && mobileVideo) {
            mobileVideo.load();
            mobileVideo.pause();
            
            const setInitialTime = () => {
                if (mobileVideo.duration) {
                    mobileVideo.currentTime = currentScrollFraction * mobileVideo.duration;
                }
            };
            
            if (mobileVideo.readyState >= 1) {
                setInitialTime();
            } else {
                mobileVideo.addEventListener('loadedmetadata', setInitialTime, { once: true });
            }
        } else {
            const frameIndex = Math.min(
                totalFrames - 1,
                Math.floor(currentScrollFraction * totalFrames)
            );
            renderFrame(frameIndex);
        }

        updateNavbar();
        updateBokehPosition();
        updateAboutMeBokehPosition();
        updateHeroStickyTransition();

        // Bind scroll and resize events
        window.addEventListener('scroll', () => {
            targetScrollFraction = getScrollFraction();
            startAnimationLoop();
            updateNavbar();
            updateBokehPosition();
            updateAboutMeBokehPosition();
        }, { passive: true });

        window.addEventListener('resize', () => {
            resizeCanvas();
            targetScrollFraction = getScrollFraction();

            // Lazy load images if resizing to desktop
            if (window.innerWidth >= 768 && !isCriticalLoadDone) {
                isCriticalLoadDone = true;
                // Preload all critical frames to initialize canvas
                for (let i = 0; i < CRITICAL_FRAMES_COUNT; i++) {
                    loadFrame(i, false);
                }
                loadRemainingFrames();
            }

            startAnimationLoop();
        });
    }

    // Handle canvas resizing to adapt dynamically to viewports while maintaining aspect ratio
    function resizeCanvas() {
        // High DPI Display Support
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        ctx.scale(dpr, dpr);

        // Redraw current frame
        const frameIndex = Math.min(
            totalFrames - 1,
            Math.floor(currentScrollFraction * totalFrames)
        );
        renderFrame(frameIndex);
    }

    // Draw the image onto canvas using cover/contain-like math
    function renderFrame(index) {
        const img = getClosestLoadedImage(index);
        if (!img || !img.complete) return;

        const canvasWidth = window.innerWidth;
        const canvasHeight = window.innerHeight;

        // Clear screen
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // Center-align logic (Contain style so the entire laptop frame is visible)
        const imgWidth = img.naturalWidth || 1920;
        const imgHeight = img.naturalHeight || 1080;

        const imgRatio = imgWidth / imgHeight;
        const canvasRatio = canvasWidth / canvasHeight;

        let drawWidth, drawHeight, x, y;

        if (canvasRatio > imgRatio) {
            // Screen is wider than image aspect ratio: scale by height
            drawHeight = canvasHeight;
            drawWidth = canvasHeight * imgRatio;
            x = (canvasWidth - drawWidth) / 2;
            y = 0;
        } else {
            // Screen is taller than image aspect ratio (portrait viewports / mobile)
            if (isMobile) {
                // Zoom in slightly on mobile to make the black space shorter
                drawWidth = canvasWidth * 1.6;
                drawHeight = drawWidth / imgRatio;
                x = (canvasWidth - drawWidth) / 2;
                y = (canvasHeight - drawHeight) / 2;
            } else {
                // Standard contain scaling
                drawWidth = canvasWidth;
                drawHeight = canvasWidth / imgRatio;
                x = 0;
                y = (canvasHeight - drawHeight) / 2;
            }
        }

        ctx.drawImage(img, x, y, drawWidth, drawHeight);
    }

    // Calculate how far down the scroll container the user is (0 to 1)
    function getScrollFraction() {
        const scrollContainer = document.getElementById('scroll-container');
        const scrollHeight = scrollContainer.scrollHeight - window.innerHeight;
        const scrollTop = window.scrollY;
        return Math.max(0, Math.min(1, scrollTop / (scrollHeight || 1)));
    }

    // Eased animation loop control
    function startAnimationLoop() {
        if (!isLoopRunning) {
            isLoopRunning = true;
            requestAnimationFrame(animationTick);
        }
    }

    function animationTick() {
        const diff = targetScrollFraction - currentScrollFraction;
        const ease = 0.15; // Smooth scroll responsiveness factor

        if (Math.abs(diff) < 0.0001) {
            currentScrollFraction = targetScrollFraction;
            isLoopRunning = false;
        } else {
            currentScrollFraction += diff * ease;
        }

        // 1. Render active animation (Video scrubbing on mobile, canvas images on desktop)
        const activeMobile = window.innerWidth < 768;
        if (activeMobile && mobileVideo) {
            if (mobileVideo.duration) {
                const targetTime = currentScrollFraction * mobileVideo.duration;
                if (Math.abs(mobileVideo.currentTime - targetTime) > 0.03) {
                    mobileVideo.currentTime = targetTime;
                }
            }
        } else {
            const frameIndex = Math.min(
                totalFrames - 1,
                Math.floor(currentScrollFraction * totalFrames)
            );
            renderFrame(frameIndex);
        }

        // 2. Control visibility of Text overlays
        updateTextOverlays(currentScrollFraction);

        // 3. Update sticky-to-fixed hero transitions
        updateHeroStickyTransition();

        // 4. Hide scroll down indicator after scrolling down a bit
        if (window.scrollY > 50) {
            scrollIndicator.classList.add('hidden');
        } else {
            scrollIndicator.classList.remove('hidden');
        }

        if (isLoopRunning) {
            requestAnimationFrame(animationTick);
        }
    }

    // Active state manager for overlays
    function updateTextOverlays(scrollFraction) {
        let phase5Active = false;

        textPhases.forEach(phase => {
            const el = document.getElementById(phase.id);
            if (!el) return;

            if (scrollFraction >= phase.start && scrollFraction <= phase.end) {
                el.classList.add('active');
                if (phase.id === 'text-phase-5') {
                    phase5Active = true;
                }
            } else {
                el.classList.remove('active');
            }
        });

        const stickyContainer = document.querySelector('.sticky-container');
        if (stickyContainer) {
            if (phase5Active) {
                stickyContainer.classList.add('phase-5-active');
            } else {
                stickyContainer.classList.remove('phase-5-active');
            }
        }
    }

    function updateHeroStickyTransition() {
        const stickyContainer = document.querySelector('.sticky-container');
        const aboutSection = document.getElementById('about');
        const textPhase5 = document.getElementById('text-phase-5');
        const canvas = document.getElementById('animation-canvas');
        if (!stickyContainer || !aboutSection) return;

        const aboutRect = aboutSection.getBoundingClientRect();
        const viewportHeight = window.innerHeight;

        // Check if `#about` section has started entering the viewport
        if (aboutRect.top < viewportHeight && aboutRect.bottom > 0) {
            stickyContainer.style.visibility = 'visible';
            stickyContainer.style.opacity = '1';
            stickyContainer.style.pointerEvents = 'none';

            // Calculate percentage entered (0 to 1)
            const percentEntered = Math.max(0, Math.min(1, (viewportHeight - aboutRect.top) / viewportHeight));

            if (percentEntered >= 0.70) {
                // Canvas/Video outro triggers at 70% scrolled up
                if (canvas) {
                    canvas.classList.add('no-blur');
                    const fadeProgress = (percentEntered - 0.7) / 0.3; // 0 to 1
                    canvas.style.opacity = String(1 - fadeProgress);
                }
                if (mobileVideo) {
                    mobileVideo.classList.add('no-blur');
                    const fadeProgress = (percentEntered - 0.7) / 0.3; // 0 to 1
                    mobileVideo.style.opacity = String(1 - fadeProgress);
                }
            } else {
                if (canvas) {
                    canvas.classList.remove('no-blur');
                    canvas.style.opacity = '1';
                }
                if (mobileVideo) {
                    mobileVideo.classList.remove('no-blur');
                    mobileVideo.style.opacity = '1';
                }
            }

            // Push up text Phase 5 when hit by the top of #about section
            if (textPhase5) {
                const textHeight = textPhase5.offsetHeight;
                const naturalBottom = (viewportHeight + textHeight) / 2;

                if (aboutRect.top < naturalBottom) {
                    const translateY = aboutRect.top - naturalBottom;
                    textPhase5.classList.add('scrolling-push');
                    textPhase5.style.setProperty('--push-y', `${translateY}px`);
                } else {
                    textPhase5.classList.remove('scrolling-push');
                    textPhase5.style.removeProperty('--push-y');
                }
            }
        } else if (aboutRect.bottom <= 0) {
            // Completely scrolled past, hide completely
            stickyContainer.style.visibility = 'hidden';
            stickyContainer.style.opacity = '0';
            if (canvas) canvas.style.opacity = '0';
            if (mobileVideo) mobileVideo.style.opacity = '0';
            if (textPhase5) {
                textPhase5.classList.remove('scrolling-push');
                textPhase5.style.removeProperty('--push-y');
            }
        } else {
            // Still in the animation sequence
            stickyContainer.style.visibility = 'visible';
            stickyContainer.style.opacity = '1';

            if (canvas) {
                canvas.style.opacity = '1';
                canvas.classList.remove('no-blur');
            }
            if (mobileVideo) {
                mobileVideo.style.opacity = '1';
                mobileVideo.classList.remove('no-blur');
            }
            if (textPhase5) {
                textPhase5.classList.remove('scrolling-push');
                textPhase5.classList.remove('slide-up-outro');
                textPhase5.style.removeProperty('--push-y');
            }
        }
    }

    // Dynamic Navbar Scroll Handler
    const nav = document.getElementById('nav');
    const scrollContainer = document.getElementById('scroll-container');

    function updateNavbar() {
        let scrollThreshold;
        if (isMobile) {
            scrollThreshold = 50;
        } else {
            scrollThreshold = scrollContainer.scrollHeight - window.innerHeight - 50;
        }
        if (window.scrollY > scrollThreshold) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    }

    // Interactive Scroll-Linked & Mouse-Tracking Bokeh Lights
    const aboutSection = document.getElementById('about');
    const aboutContent = document.querySelector('.about-content');
    const bokeh1 = document.querySelector('.bokeh-1');
    const bokeh2 = document.querySelector('.bokeh-2');
    const bokeh3 = document.querySelector('.bokeh-3');
    let isMouseOverAbout = false;

    function updateBokehPosition() {
        if (isMouseOverAbout) return; // Ignore scroll-based positioning if mouse hover is active
        if (!aboutSection || !bokeh1 || !bokeh2 || !bokeh3) return;

        const rect = aboutSection.getBoundingClientRect();
        const viewportHeight = window.innerHeight;

        // When #about is visible in the viewport, translate bokeh lights based on scroll progress
        if (rect.top < viewportHeight && rect.bottom > 0) {
            const enterPoint = rect.top - viewportHeight;
            const scrollDistance = rect.height + viewportHeight;
            const progress = Math.max(0, Math.min(1, -enterPoint / (scrollDistance || 1)));

            // Map scroll progress to custom horizontal and vertical coordinates
            const b1X = progress * 160 - 60;   // Moves from -60px to 100px
            const b1Y = progress * 100 - 50;   // Moves from -50px to 50px

            const b2X = (1 - progress) * -140 + 40; // Moves in opposite direction
            const b2Y = progress * -90 - 20;

            const b3X = progress * -180 + 30;  // Moves dynamically
            const b3Y = (1 - progress) * 140 - 70;

            bokeh1.style.transform = `translate(${b1X}px, ${b1Y}px)`;
            bokeh2.style.transform = `translate(${b2X}px, ${b2Y}px)`;
            bokeh3.style.transform = `translate(${b3X}px, ${b3Y}px)`;
        }
    }

    if (aboutContent && bokeh1 && bokeh2 && bokeh3) {
        aboutContent.addEventListener('mousemove', (e) => {
            isMouseOverAbout = true;
            const rect = aboutContent.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Centering offset calculation for each light size (feathered offsets for visual depth)
            const target1X = x - 150;
            const target1Y = y - 150;

            const target2X = x - 130 + 60;
            const target2Y = y - 130 - 60;

            const target3X = x - 160 - 80;
            const target3Y = y - 160 + 80;

            bokeh1.style.transform = `translate(${target1X}px, ${target1Y}px)`;
            bokeh2.style.transform = `translate(${target2X}px, ${target2Y}px)`;
            bokeh3.style.transform = `translate(${target3X}px, ${target3Y}px)`;
        });

        aboutContent.addEventListener('mouseleave', () => {
            isMouseOverAbout = false;
            updateBokehPosition(); // Slide back to scroll position smoothly
        });
    }

    const aboutMeSection = document.getElementById('about-me');
    const aboutMeContent = document.querySelector('.about-me-content');
    const bokehMe1 = document.querySelector('.bokeh-me-1');
    const bokehMe2 = document.querySelector('.bokeh-me-2');
    const bokehMe3 = document.querySelector('.bokeh-me-3');
    let isMouseOverAboutMe = false;

    function updateAboutMeBokehPosition() {
        if (isMouseOverAboutMe) return; // Ignore scroll-based positioning if mouse hover is active
        if (!aboutMeSection || !bokehMe1 || !bokehMe2 || !bokehMe3) return;

        const rect = aboutMeSection.getBoundingClientRect();
        const viewportHeight = window.innerHeight;

        // When #about-me is visible in the viewport, translate bokeh lights based on scroll progress
        if (rect.top < viewportHeight && rect.bottom > 0) {
            const enterPoint = rect.top - viewportHeight;
            const scrollDistance = rect.height + viewportHeight;
            const progress = Math.max(0, Math.min(1, -enterPoint / (scrollDistance || 1)));

            // Map scroll progress to custom horizontal and vertical coordinates
            const b1X = progress * 160 - 60;
            const b1Y = progress * 100 - 50;

            const b2X = (1 - progress) * -140 + 40;
            const b2Y = progress * -90 - 20;

            const b3X = progress * -180 + 30;
            const b3Y = (1 - progress) * 140 - 70;

            bokehMe1.style.transform = `translate(${b1X}px, ${b1Y}px)`;
            bokehMe2.style.transform = `translate(${b2X}px, ${b2Y}px)`;
            bokehMe3.style.transform = `translate(${b3X}px, ${b3Y}px)`;
        }
    }

    if (aboutMeContent && bokehMe1 && bokehMe2 && bokehMe3) {
        aboutMeContent.addEventListener('mousemove', (e) => {
            isMouseOverAboutMe = true;
            const rect = aboutMeContent.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const target1X = x - 150;
            const target1Y = y - 150;

            const target2X = x - 130 + 60;
            const target2Y = y - 130 - 60;

            const target3X = x - 160 - 80;
            const target3Y = y - 160 + 80;

            bokehMe1.style.transform = `translate(${target1X}px, ${target1Y}px)`;
            bokehMe2.style.transform = `translate(${target2X}px, ${target2Y}px)`;
            bokehMe3.style.transform = `translate(${target3X}px, ${target3Y}px)`;
        });

        aboutMeContent.addEventListener('mouseleave', () => {
            isMouseOverAboutMe = false;
            updateAboutMeBokehPosition(); // Slide back to scroll position smoothly
        });
    }

    // Scroll reveal observer for .fade-up items
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add('visible');
                observer.unobserve(e.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

    // Portfolio Filtering and Cinematic Banner Logic
    const bottomFilterBtns = document.querySelectorAll('.overlay-buttons-container .overlay-filter-btn');
    const portfolioItems = document.querySelectorAll('.portfolio-item');

    // Function to filter grid items with smooth slide-and-fade transition
    function filterPortfolio(category) {
        // Find currently visible items
        const visibleItems = Array.from(portfolioItems).filter(item => !item.classList.contains('hidden'));

        // Fade and slide out active items
        visibleItems.forEach(item => {
            item.style.opacity = '0';
            item.style.transform = 'translateY(15px)';
        });

        // After exit transition completes (300ms)
        setTimeout(() => {
            portfolioItems.forEach(item => {
                const itemCategory = item.getAttribute('data-category');
                if (itemCategory === category) {
                    item.classList.remove('hidden');
                    // Force a reflow
                    void item.offsetWidth;
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0)';
                } else {
                    item.classList.add('hidden');
                    item.style.opacity = '0';
                    item.style.transform = 'translateY(15px)';
                }
            });
        }, 300);
    }

    // Bind click events to the bottom filter buttons
    bottomFilterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.classList.contains('active')) return;

            bottomFilterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filterValue = btn.getAttribute('data-filter');
            filterPortfolio(filterValue);
        });
    });

    // Video Lightbox Modal Control
    const videoModal = document.getElementById('video-modal');
    const modalVideo = document.getElementById('modal-video');
    const modalIframe = document.getElementById('modal-iframe');
    const modalClose = document.querySelector('.video-modal-close');
    const modalOverlay = document.querySelector('.video-modal-overlay');

    portfolioItems.forEach(item => {
        item.addEventListener('click', () => {
            const videoSrc = item.getAttribute('data-video');
            if (videoSrc) {
                if (videoSrc.includes('vimeo.com') || videoSrc.includes('youtube.com') || videoSrc.includes('youtu.be')) {
                    modalVideo.style.display = 'none';
                    if (modalIframe) {
                        modalIframe.style.display = 'block';
                        let embedUrl = videoSrc;
                        if (embedUrl.includes('vimeo.com')) {
                            // Convert watch/share URLs to player embed URLs
                            if (!embedUrl.includes('player.vimeo.com')) {
                                try {
                                    const urlObj = new URL(embedUrl);
                                    const pathSegments = urlObj.pathname.split('/').filter(s => s.length > 0);
                                    if (pathSegments.length > 0) {
                                        const videoId = pathSegments[0];
                                        const hash = pathSegments[1] || '';
                                        embedUrl = `https://player.vimeo.com/video/${videoId}`;
                                        if (hash) {
                                            embedUrl += `?h=${hash}`;
                                        }
                                    }
                                } catch (e) {
                                    console.error("Failed to parse Vimeo URL:", e);
                                }
                            }
                            if (!embedUrl.includes('autoplay=')) {
                                embedUrl += (embedUrl.includes('?') ? '&' : '?') + 'autoplay=1';
                            }
                        } else if (embedUrl.includes('youtube.com') || embedUrl.includes('youtu.be')) {
                            if (!embedUrl.includes('youtube.com/embed/')) {
                                try {
                                    let videoId = '';
                                    if (embedUrl.includes('youtu.be')) {
                                        const urlObj = new URL(embedUrl);
                                        videoId = urlObj.pathname.substring(1);
                                    } else {
                                        const urlObj = new URL(embedUrl);
                                        videoId = urlObj.searchParams.get('v');
                                    }
                                    if (videoId) {
                                        embedUrl = `https://www.youtube.com/embed/${videoId}`;
                                    }
                                } catch (e) {
                                    console.error("Failed to parse YouTube URL:", e);
                                }
                            }
                            if (!embedUrl.includes('autoplay=')) {
                                embedUrl += (embedUrl.includes('?') ? '&' : '?') + 'autoplay=1';
                            }
                        }
                        modalIframe.src = embedUrl;
                    }
                } else {
                    if (modalIframe) modalIframe.style.display = 'none';
                    modalVideo.style.display = 'block';
                    modalVideo.src = videoSrc;
                    modalVideo.play().catch(err => {
                        console.log("Auto-play blocked, wait for user interaction: ", err);
                    });
                }
                videoModal.classList.add('active');
            }
        });
    });

    function closeModal() {
        if (!videoModal) return;
        videoModal.classList.remove('active');
        setTimeout(() => {
            if (modalVideo) {
                modalVideo.pause();
                modalVideo.src = '';
            }
            if (modalIframe) {
                modalIframe.src = '';
            }
        }, 400);
    }

    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modalOverlay) modalOverlay.addEventListener('click', closeModal);

    // Support ESC key to close modal
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && videoModal && videoModal.classList.contains('active')) {
            closeModal();
        }
    });

    // Mobile Menu Toggle Control
    const menuToggle = document.getElementById('menu-toggle');
    const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
    const mobileLinks = document.querySelectorAll('.mobile-nav-links a');

    if (menuToggle && mobileMenuOverlay) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            mobileMenuOverlay.classList.toggle('active');
            document.body.classList.toggle('no-scroll');
        });

        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                mobileMenuOverlay.classList.remove('active');
                document.body.classList.remove('no-scroll');
            });
        });
    }

    // Initialize
    preloadImages();
});
