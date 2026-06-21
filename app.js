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
            if (!isLocalAPReel && !isLocalBanner && !isLocalTeaser) {
                video.src = CONFIG.cdnBaseUrl + currentSrc;
            }
        }
        const currentDataSrc = video.getAttribute('data-src');
        if (currentDataSrc && !currentDataSrc.startsWith('http') && !currentDataSrc.startsWith('blob')) {
            const decoded = decodeURIComponent(currentDataSrc);
            const isLocalAPReel = decoded.includes('A&P WEDDING REEL.mp4');
            const isLocalBanner = decoded.includes('banner BHAWNA & ARCHIT WEDDING TEASER-.mp4');
            const isLocalTeaser = decoded.includes('teaser.mp4');
            if (!isLocalAPReel && !isLocalBanner && !isLocalTeaser) {
                video.setAttribute('data-src', CONFIG.cdnBaseUrl + currentDataSrc);
            }
        }
    });

    // IntersectionObserver to lazy load and play videos when visible
    const lazyVideoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target;
            if (entry.isIntersecting) {
                const dataSrc = video.getAttribute('data-src');
                if (dataSrc) {
                    video.src = dataSrc;
                    video.removeAttribute('data-src');
                }
                video.play().catch(err => {
                    console.log("Lazy video play failed:", err);
                });
            } else {
                if (video.src) {
                    video.pause();
                }
            }
        });
    }, { rootMargin: '100px' });

    document.querySelectorAll('video[data-src]').forEach(video => {
        lazyVideoObserver.observe(video);
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
    const preloader = document.getElementById('preloader');
    const loaderBar = document.querySelector('.loader-bar');
    const loaderText = document.querySelector('.loader-text');
    const scrollIndicator = document.querySelector('.scroll-indicator');

    // Desktop Image Sequence Config (191 frames)
    const totalFramesDesktop = 191;
    const imagesDesktop = new Array(totalFramesDesktop).fill(null);
    const criticalFramesDesktop = 15;
    let isDesktopCriticalDone = false;
    let desktopCriticalCount = 0;

    // Mobile Image Sequence Config (116 frames)
    const totalFramesMobile = 116;
    const imagesMobile = new Array(totalFramesMobile).fill(null);
    const criticalFramesMobile = 15;
    let isMobileCriticalDone = false;
    let mobileCriticalCount = 0;

    // Smooth Scrolling LERP Easing variables
    let currentScrollFraction = 0;
    let targetScrollFraction = 0;
    let isLoopRunning = false;

    // Cached layout geometry to avoid forced reflows (layout thrashing)
    let cachedScrollHeight = 0;
    let cachedAboutTop = 0;
    let cachedAboutHeight = 0;
    let cachedAboutMeTop = 0;
    let cachedAboutMeHeight = 0;
    let cachedTextPhase5Height = 0;
    let cachedAboutContentLeft = 0;
    let cachedAboutContentTop = 0;
    let cachedAboutMeContentLeft = 0;
    let cachedAboutMeContentTop = 0;

    function cacheGeometries() {
        const scrollContainer = document.getElementById('scroll-container');
        const aboutSection = document.getElementById('about');
        const aboutMeSection = document.getElementById('about-me');
        const textPhase5 = document.getElementById('text-phase-5');
        const aboutContent = document.querySelector('.about-content');
        const aboutMeContent = document.querySelector('.about-me-content');

        if (scrollContainer) {
            cachedScrollHeight = scrollContainer.scrollHeight;
        }
        if (aboutSection) {
            cachedAboutTop = aboutSection.offsetTop;
            cachedAboutHeight = aboutSection.offsetHeight;
        }
        if (aboutMeSection) {
            cachedAboutMeTop = aboutMeSection.offsetTop;
            cachedAboutMeHeight = aboutMeSection.offsetHeight;
        }
        if (textPhase5) {
            cachedTextPhase5Height = textPhase5.offsetHeight;
        }
        if (aboutContent) {
            const r = aboutContent.getBoundingClientRect();
            cachedAboutContentLeft = r.left + window.scrollX;
            cachedAboutContentTop = r.top + window.scrollY;
        }
        if (aboutMeContent) {
            const r = aboutMeContent.getBoundingClientRect();
            cachedAboutMeContentLeft = r.left + window.scrollX;
            cachedAboutMeContentTop = r.top + window.scrollY;
        }
    }

    // Define scroll ranges for each text overlay section (from 0 to 1)
    const textPhases = [
        { id: 'text-phase-1', start: 0.05, end: 0.20 },
        { id: 'text-phase-2', start: 0.25, end: 0.40 },
        { id: 'text-phase-3', start: 0.45, end: 0.60 },
        { id: 'text-phase-4', start: 0.65, end: 0.80 },
        { id: 'text-phase-5', start: 0.85, end: 1.0 }
    ];

    // Helper to format frame filename based on device viewport width
    function getFramePath(index, isMobileViewport) {
        if (isMobileViewport) {
            const frameNum = String(index + 1).padStart(3, '0'); // ezgif-frame-001.jpg to ezgif-frame-229.jpg
            return `MOBILE ANIMATION/ezgif-frame-${frameNum}.jpg`;
        } else {
            const frameNum = String(index).padStart(3, '0'); // teaser000.jpg to teaser190.jpg
            return `SCROLL ANIMATION/teaser${frameNum}.jpg`;
        }
    }

    // Preload critical images first, depending on initial viewport size
    function preloadImages() {
        const activeMobile = window.innerWidth < 768;
        if (activeMobile) {
            for (let i = 0; i < criticalFramesMobile; i++) {
                loadFrame(i, true, true);
            }
        } else {
            for (let i = 0; i < criticalFramesDesktop; i++) {
                loadFrame(i, false, true);
            }
        }
    }

    function loadFrame(index, isMobileViewport, isCritical = false) {
        const imagesArray = isMobileViewport ? imagesMobile : imagesDesktop;
        const criticalCountMax = isMobileViewport ? criticalFramesMobile : criticalFramesDesktop;
        
        if (imagesArray[index] && imagesArray[index].complete) return;

        const img = new Image();
        img.src = getFramePath(index, isMobileViewport);
        img.onload = () => {
            imagesArray[index] = img;
            if (isCritical) {
                if (isMobileViewport) {
                    mobileCriticalCount++;
                    const progress = Math.round((mobileCriticalCount / criticalFramesMobile) * 100);
                    loaderBar.style.width = `${progress}%`;
                    loaderText.textContent = `LOADING PORTFOLIO... ${progress}%`;
                    if (mobileCriticalCount === criticalFramesMobile && !isMobileCriticalDone) {
                        isMobileCriticalDone = true;
                        onPreloadComplete();
                        loadRemainingFrames(true);
                    }
                } else {
                    desktopCriticalCount++;
                    const progress = Math.round((desktopCriticalCount / criticalFramesDesktop) * 100);
                    loaderBar.style.width = `${progress}%`;
                    loaderText.textContent = `LOADING PORTFOLIO... ${progress}%`;
                    if (desktopCriticalCount === criticalFramesDesktop && !isDesktopCriticalDone) {
                        isDesktopCriticalDone = true;
                        onPreloadComplete();
                        loadRemainingFrames(false);
                    }
                }
            }
        };
        img.onerror = () => {
            console.error(`Failed to load frame: index ${index}, mobile: ${isMobileViewport}`);
            if (isCritical) {
                if (isMobileViewport) {
                    mobileCriticalCount++;
                    if (mobileCriticalCount === criticalFramesMobile && !isMobileCriticalDone) {
                        isMobileCriticalDone = true;
                        onPreloadComplete();
                        loadRemainingFrames(true);
                    }
                } else {
                    desktopCriticalCount++;
                    if (desktopCriticalCount === criticalFramesDesktop && !isDesktopCriticalDone) {
                        isDesktopCriticalDone = true;
                        onPreloadComplete();
                        loadRemainingFrames(false);
                    }
                }
            }
        };
    }

    function loadRemainingFrames(isMobileViewport) {
        const total = isMobileViewport ? totalFramesMobile : totalFramesDesktop;
        const criticalCount = isMobileViewport ? criticalFramesMobile : criticalFramesDesktop;
        const imagesArray = isMobileViewport ? imagesMobile : imagesDesktop;
        
        let currentIndex = criticalCount;

        function loadNextChunk() {
            const chunkSize = 5;
            const end = Math.min(total, currentIndex + chunkSize);
            for (let i = currentIndex; i < end; i++) {
                const img = new Image();
                img.src = getFramePath(i, isMobileViewport);
                img.onload = ((idx, imageEl) => {
                    return () => {
                        imagesArray[idx] = imageEl;
                    };
                })(i, img);
                img.onerror = ((idx) => {
                    return () => {
                        console.warn(`Failed to load background frame: ${idx}`);
                    };
                })(i);
            }
            currentIndex = end;
            if (currentIndex < total) {
                setTimeout(loadNextChunk, 50);
            }
        }

        loadNextChunk();
    }

    // Helper to find the nearest loaded frame
    function getClosestLoadedImage(index, isMobileViewport) {
        const imagesArray = isMobileViewport ? imagesMobile : imagesDesktop;
        const total = isMobileViewport ? totalFramesMobile : totalFramesDesktop;
        
        if (imagesArray[index] && imagesArray[index].complete) {
            return imagesArray[index];
        }
        let step = 1;
        while (index - step >= 0 || index + step < total) {
            if (index - step >= 0 && imagesArray[index - step] && imagesArray[index - step].complete) {
                return imagesArray[index - step];
            }
            if (index + step < total && imagesArray[index + step] && imagesArray[index + step].complete) {
                return imagesArray[index + step];
            }
            step++;
        }
        return null;
    }

    function onPreloadComplete() {
        // Fade out preloader
        preloader.classList.add('loaded');

        // Initial setup and draw
        cacheGeometries();
        resizeCanvas();

        targetScrollFraction = getScrollFraction();
        currentScrollFraction = targetScrollFraction;

        const activeMobile = window.innerWidth < 768;
        const total = activeMobile ? totalFramesMobile : totalFramesDesktop;
        const frameIndex = Math.min(
            total - 1,
            Math.floor(currentScrollFraction * total)
        );
        renderFrame(frameIndex);

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
            cacheGeometries();
            resizeCanvas();
            targetScrollFraction = getScrollFraction();

            // Lazy preload images if resizing across thresholds
            const activeMobile = window.innerWidth < 768;
            if (activeMobile) {
                if (!isMobileCriticalDone) {
                    isMobileCriticalDone = true;
                    // Trigger preload for mobile frames
                    for (let i = 0; i < criticalFramesMobile; i++) {
                        loadFrame(i, true, false);
                    }
                    loadRemainingFrames(true);
                }
            } else {
                if (!isDesktopCriticalDone) {
                    isDesktopCriticalDone = true;
                    // Trigger preload for desktop frames
                    for (let i = 0; i < criticalFramesDesktop; i++) {
                        loadFrame(i, false, false);
                    }
                    loadRemainingFrames(false);
                }
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
        const activeMobile = window.innerWidth < 768;
        const total = activeMobile ? totalFramesMobile : totalFramesDesktop;
        const frameIndex = Math.min(
            total - 1,
            Math.floor(currentScrollFraction * total)
        );
        renderFrame(frameIndex);
    }

    // Draw the image onto canvas using cover/contain-like math
    function renderFrame(index) {
        const activeMobile = window.innerWidth < 768;
        const img = getClosestLoadedImage(index, activeMobile);
        if (!img || !img.complete) return;

        const canvasWidth = window.innerWidth;
        const canvasHeight = window.innerHeight;

        // Clear screen
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // Center-align logic (Contain style so the entire laptop frame is visible)
        const imgWidth = img.naturalWidth || (activeMobile ? 640 : 1920);
        const imgHeight = img.naturalHeight || (activeMobile ? 1138 : 1080);

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
            // Screen is taller than image aspect ratio
            drawWidth = canvasWidth;
            drawHeight = canvasWidth / imgRatio;
            x = 0;
            y = (canvasHeight - drawHeight) / 2;
        }

        ctx.drawImage(img, x, y, drawWidth, drawHeight);
    }

    // Calculate how far down the scroll container the user is (0 to 1)
    function getScrollFraction() {
        const scrollHeight = (cachedScrollHeight || 1) - window.innerHeight;
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

        // 1. Render active animation frame
        const activeMobile = window.innerWidth < 768;
        const total = activeMobile ? totalFramesMobile : totalFramesDesktop;
        const frameIndex = Math.min(
            total - 1,
            Math.floor(currentScrollFraction * total)
        );
        renderFrame(frameIndex);

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
        const textPhase5 = document.getElementById('text-phase-5');
        const canvas = document.getElementById('animation-canvas');
        if (!stickyContainer) return;

        const viewportHeight = window.innerHeight;
        const scrollY = window.scrollY;

        const aboutRectTop = cachedAboutTop - scrollY;
        const aboutRectBottom = aboutRectTop + cachedAboutHeight;

        // Check if `#about` section has started entering the viewport
        if (aboutRectTop < viewportHeight && aboutRectBottom > 0) {
            stickyContainer.style.visibility = 'visible';
            stickyContainer.style.opacity = '1';
            stickyContainer.style.pointerEvents = 'none';

            // Calculate percentage entered (0 to 1)
            const percentEntered = Math.max(0, Math.min(1, (viewportHeight - aboutRectTop) / viewportHeight));

            if (percentEntered >= 0.70) {
                // Canvas outro triggers at 70% scrolled up
                if (canvas) {
                    canvas.classList.add('no-blur');
                    const fadeProgress = (percentEntered - 0.7) / 0.3; // 0 to 1
                    canvas.style.opacity = String(1 - fadeProgress);
                }
            } else {
                if (canvas) {
                    canvas.classList.remove('no-blur');
                    canvas.style.opacity = '1';
                }
            }

            // Push up text Phase 5 when hit by the top of #about section
            if (textPhase5) {
                const textHeight = cachedTextPhase5Height;
                const naturalBottom = (viewportHeight + textHeight) / 2;

                if (aboutRectTop < naturalBottom) {
                    const translateY = aboutRectTop - naturalBottom;
                    textPhase5.classList.add('scrolling-push');
                    textPhase5.style.setProperty('--push-y', `${translateY}px`);
                } else {
                    textPhase5.classList.remove('scrolling-push');
                    textPhase5.style.removeProperty('--push-y');
                }
            }
        } else if (aboutRectBottom <= 0) {
            // Completely scrolled past, hide completely
            stickyContainer.style.visibility = 'hidden';
            stickyContainer.style.opacity = '0';
            if (canvas) canvas.style.opacity = '0';
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
            if (textPhase5) {
                textPhase5.classList.remove('scrolling-push');
                textPhase5.classList.remove('slide-up-outro');
                textPhase5.style.removeProperty('--push-y');
            }
        }
    }

    // Dynamic Navbar Scroll Handler
    const nav = document.getElementById('nav');

    function updateNavbar() {
        let scrollThreshold;
        if (isMobile) {
            scrollThreshold = 50;
        } else {
            scrollThreshold = cachedScrollHeight - window.innerHeight - 50;
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

        const viewportHeight = window.innerHeight;
        const scrollY = window.scrollY;

        const aboutRectTop = cachedAboutTop - scrollY;
        const aboutRectBottom = aboutRectTop + cachedAboutHeight;

        // When #about is visible in the viewport, translate bokeh lights based on scroll progress
        if (aboutRectTop < viewportHeight && aboutRectBottom > 0) {
            const enterPoint = aboutRectTop - viewportHeight;
            const scrollDistance = cachedAboutHeight + viewportHeight;
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
            const viewportLeft = cachedAboutContentLeft - window.scrollX;
            const viewportTop = cachedAboutContentTop - window.scrollY;
            const x = e.clientX - viewportLeft;
            const y = e.clientY - viewportTop;

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

        const viewportHeight = window.innerHeight;
        const scrollY = window.scrollY;

        const aboutMeRectTop = cachedAboutMeTop - scrollY;
        const aboutMeRectBottom = aboutMeRectTop + cachedAboutMeHeight;

        // When #about-me is visible in the viewport, translate bokeh lights based on scroll progress
        if (aboutMeRectTop < viewportHeight && aboutMeRectBottom > 0) {
            const enterPoint = aboutMeRectTop - viewportHeight;
            const scrollDistance = cachedAboutMeHeight + viewportHeight;
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
            const viewportLeft = cachedAboutMeContentLeft - window.scrollX;
            const viewportTop = cachedAboutMeContentTop - window.scrollY;
            const x = e.clientX - viewportLeft;
            const y = e.clientY - viewportTop;

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
