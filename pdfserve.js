// pdf-serve.js

document.addEventListener("DOMContentLoaded", function () {
	// Get computed CSS properties from the <html> element
	const computedStyle = getComputedStyle(document.documentElement);

	// Define a mapping of URL parameter keys to their CSS variable counterparts.
	// URL parameters expected: url, orientation, columns, type, pagenumber, bg, transition, interval, timer.
	const paramMapping = {
		url: "--URL",
		orientation: "--orientation",
		columns: "--columns",
		type: "--type",
		pagenumber: "--pagenumber",
		bg: "--bg",
		transition: "--transition",
		interval: "--interval",
		timer: "--timer",
	};

	// Parse URL parameters and merge with CSS default values.
	const urlParams = new URLSearchParams(window.location.search);
	const params = {};

	for (const key in paramMapping) {
		if (urlParams.has(key)) {
			params[key] = urlParams.get(key);
		} else {
			// Remove possible quotes from CSS value.
			params[key] = computedStyle
				.getPropertyValue(paramMapping[key])
				.trim()
				.replace(/^"(.*)"$/, "$1");
		}
	}

	// Convert numeric values.
	params.columns = parseInt(params.columns);
	params.transition = parseInt(params.transition);
	params.interval = parseInt(params.interval);

	// Normalize string parameters to lowercase where applicable.
	params.orientation = params.orientation.toLowerCase();
	params.type = params.type.toLowerCase();
	params.pagenumber = params.pagenumber.toLowerCase();
	params.timer = params.timer.toLowerCase();

	// ----------------- New Validation for Columns -----------------
	if (params.orientation === "landscape") {
		params.columns = 1;
	} else if (params.orientation === "portrait") {
		if (![1, 2, 3].includes(params.columns)) {
			params.columns = 1;
		}
	}
	// --------------------------------------------------------------

	// Process background color:
	// If it doesn't begin with '#' and is a valid hex (3 or 6 characters), prepend '#'
	if (!params.bg.startsWith("#")) {
		if (
			/^[0-9A-Fa-f]{3}$/.test(params.bg) ||
			/^[0-9A-Fa-f]{6}$/.test(params.bg)
		) {
			params.bg = "#" + params.bg;
		}
	}

	// Generate the layout based on orientation and columns
	function generateLayout(orientation, columns) {
		let layout = "";
		if (orientation === "portrait" && columns === 1) {
			layout = `
        <div class="portrait_1" id="portrait_1">
          <div class="one_portrait" id="one_portrait">
            <div id="container" class="container">
              <div id="cell_1" class="cell">
              </div>
            </div>
          </div>
          <div id="page-navigation" class="page_navigation"></div>
          <div id="timer" class="timer"></div>
        </div>
      `;
		} else if (orientation === "portrait" && columns === 2) {
			layout = `
        <div class="portrait_2" id="portrait_2">
          <div class="two_portrait" id="two_portrait">
            <div id="container" class="container">
              <div id="cell_1" class="cell">
              </div>
              <div id="cell_2" class="cell">
              </div>
            </div>
          </div>
          <div id="page-navigation" class="page_navigation"></div>
          <div id="timer" class="timer"></div>
        </div>
      `;
		} else if (orientation === "portrait" && columns === 3) {
			layout = `
        <div class="portrait_3" id="portrait_3">
          <div class="three_portrait" id="three_portrait">
            <div id="container" class="container">
              <div id="cell_1" class="cell">
              </div>
              <div id="cell_2" class="cell">
              </div>
              <div id="cell_3" class="cell">
              </div>
            </div>
          </div>
          <div id="page-navigation" class="page_navigation"></div>
          <div id="timer" class="timer"></div>
        </div>
      `;
		} else if (orientation === "landscape" && columns === 1) {
			layout = `
        <div class="landscape_1" id="landscape_1">
          <div class="one_landscape" id="one_landscape">
            <div id="container" class="container">
              <div id="cell_1" class="cell">
              </div>
            </div>
          </div>
          <div id="page-navigation" class="page_navigation"></div>
          <div id="timer" class="timer"></div>
        </div>
      `;
		}
		return layout;
	}

	// Insert the layout into the dynamic_page div.
	const dynamicPage = document.getElementById("dynamic_page");
	dynamicPage.innerHTML = generateLayout(params.orientation, params.columns);

	// Set the background color on #dynamic_page.
	dynamicPage.style.background = params.bg;

	// Set container transition style.
	const containerEl = document.getElementById("container");
	if (containerEl) {
		containerEl.style.visibility = "hidden";
	}

	// Handle navigation buttons:
	// Only in presentation mode do we add buttons; otherwise, hide the navigation div.
	const navEl = document.getElementById("page-navigation");
	if (params.type === "presentation") {
		navEl.innerHTML = `<button id="prevBtn">⎗</button>
                       <button id="nextBtn">⎘</button>`;
	} else {
		navEl.style.display = "none";
	}

	// Timer element: hide if timer is not enabled.
	const timerEl = document.getElementById("timer");
	if (params.timer !== "yes") {
		timerEl.style.display = "none";
	} else {
		// Set initial timer value to 00:00:00
		timerEl.textContent = "00:00:00";
	}

	// Create and add a loading spinner with a default spinner markup.
	const spinner = document.createElement("div");
	spinner.className = "loading_spinner";
	// Insert an SVG spinner so it's visible.
	spinner.innerHTML = `
    <svg viewBox="0 0 50 50" width="50" height="50">
      <circle cx="25" cy="25" r="20" fill="none" stroke="gray" stroke-width="5"></circle>
    </svg>
  `;
	// Inline styles to ensure the spinner is centered and visible.
	spinner.style.position = "fixed";
	spinner.style.top = "50%";
	spinner.style.left = "50%";
	spinner.style.transform = "translate(-50%, -50%)";
	spinner.style.zIndex = "9999";

	dynamicPage.appendChild(spinner);

	// Variables for PDF and pages
	const pdfUrl = params.url;
	let pdfDoc = null;
	let pdfPages = []; // Array to hold rendered canvas elements for each page.
	let currentPageIndex = 0;
	let precache = 0; // Will store total number of pages.

	// Timer functionality: start the timer when the first page is shown.
	let startTime;
	let timerInterval;
	function startTimer() {
		startTime = Date.now();
		timerInterval = setInterval(() => {
			const elapsed = Date.now() - startTime;
			const hours = Math.floor(elapsed / 3600000);
			const minutes = Math.floor((elapsed % 3600000) / 60000);
			const seconds = Math.floor((elapsed % 60000) / 1000);
			const format = (num) => (num < 10 ? "0" + num : num);
			timerEl.textContent = `${format(hours)}:${format(minutes)}:${format(
				seconds
			)}`;
		}, 1000);
	}

	function renderPage(page) {
		// Get the unscaled viewport at scale = 1.
		const unscaledViewport = page.getViewport({ scale: 1 });

		let scale;
		if (params.orientation === "portrait") {
			// Use the container’s height for portrait
			const effectiveHeight =
				containerEl.clientHeight;
			scale = effectiveHeight / unscaledViewport.height;
		} else if (params.orientation === "landscape") {
			const effectiveWidth = containerEl.clientWidth;
			const effectiveHeight = containerEl.clientHeight;
			const scaleWidth = effectiveWidth / unscaledViewport.width;
			const scaleHeight = effectiveHeight / unscaledViewport.height;
			// Use the smaller scale factor so the whole page is visible
			scale = Math.min(scaleWidth, scaleHeight);
		  }

		// Create the scaled viewport.
		const viewport = page.getViewport({ scale: scale });

		// Create and setup canvas.
		const canvas = document.createElement("canvas");
		const context = canvas.getContext("2d");
		canvas.width = viewport.width;
		canvas.height = viewport.height;

		// Render the page into the canvas.
		return page
			.render({
				canvasContext: context,
				viewport: viewport,
			})
			.promise.then(() => canvas);
	}

	// Preload all pages from the PDF.
	function preloadPages(pdf) {
		precache = pdf.numPages;
		let renderPromises = [];
		for (let i = 1; i <= pdf.numPages; i++) {
			renderPromises.push(
				pdf.getPage(i).then((page) =>
					renderPage(page).then((canvas) => {
						canvas.setAttribute("data-page-number", i);
						pdfPages[i - 1] = canvas;
					})
				)
			);
		}
		return Promise.all(renderPromises);
	}

	// Helper to format the page number depending on total page count.
	function formatPageNumber(pageNumber, totalPages) {
		if (totalPages < 10) {
			return pageNumber.toString();
		} else if (totalPages < 100) {
			return pageNumber < 10 ? "0" + pageNumber : pageNumber.toString();
		} else if (totalPages < 1000) {
			if (pageNumber < 10) return "00" + pageNumber;
			else if (pageNumber < 100) return "0" + pageNumber;
			else return pageNumber.toString();
		} else {
			return pageNumber.toString();
		}
	}

	// Updated displayPages function applying transition to each cell.
	function displayPages() {
		// Determine which cell IDs to update based on columns.
		let cellIds = [];
		if (params.columns === 1) {
			cellIds.push("cell_1");
		} else if (params.columns === 2) {
			cellIds.push("cell_1", "cell_2");
		} else if (params.columns === 3) {
			cellIds.push("cell_1", "cell_2", "cell_3");
		}

		// Fade out each cell.
		cellIds.forEach((id) => {
			let cell = document.getElementById(id);
			if (cell) {
				cell.style.transition = `opacity ${params.transition}ms`;
				cell.style.opacity = 0;
			}
		});

		// After the fade-out completes, update cell content and fade them in.
		setTimeout(() => {
			// Inside displayPages function, after the setTimeout and inside the for-loop:
			for (let i = 0; i < params.columns; i++) {
				let pageIndex = currentPageIndex + i;
				if (pageIndex >= pdfPages.length) break;
				const canvas = pdfPages[pageIndex];

				// Decide which cell to use.
				let cellId =
					params.columns === 1 ? "cell_1" : i === 0 ? "cell_1" : "cell_2";
				// --- Added check for three columns ---
				if (params.columns === 3) {
					if (i === 0) {
						cellId = "cell_1";
					} else if (i === 1) {
						cellId = "cell_2";
					} else if (i === 2) {
						cellId = "cell_3";
					}
				}
				// --- End added check ---

				let cell = document.getElementById(cellId);
				if (cell) {
					cell.innerHTML = ""; // Clear previous content.
					cell.appendChild(canvas);
					// If page numbering is enabled, create and append a new pagenumber element.
					if (params.pagenumber === "yes") {
						let pNumDiv = document.createElement("div");
						pNumDiv.className = "pagenumber";
						// Optionally assign an ID:
						pNumDiv.id = cellId + "_pagenumber";
						pNumDiv.textContent = formatPageNumber(
							pageIndex + 1,
							pdfPages.length
						);
						cell.appendChild(pNumDiv);
					}
					// Fade the cell back in.
					cell.style.opacity = 1;
				}
			}
		}, params.transition);
	}

	// Navigation button event handlers (only for presentation mode).
	if (params.type === "presentation") {
		document.getElementById("prevBtn").addEventListener("click", () => {
			currentPageIndex -= params.columns;
			if (currentPageIndex < 0) {
				currentPageIndex = Math.max(0, pdfPages.length - params.columns);
			}
			displayPages();
		});
		document.getElementById("nextBtn").addEventListener("click", () => {
			currentPageIndex += params.columns;
			if (currentPageIndex >= pdfPages.length) {
				currentPageIndex = 0; // Loop back to the beginning.
			}
			displayPages();
		});
	}

	// For slideshow mode, automatically advance the pages.
	let slideshowInterval;
	function startSlideshow() {
		slideshowInterval = setInterval(() => {
			currentPageIndex += params.columns;
			if (currentPageIndex >= pdfPages.length) {
				currentPageIndex = 0;
			}
			displayPages();
		}, params.interval + params.transition);
	}

	// Load the PDF using pdf.js.
	pdfjsLib
		.getDocument(pdfUrl)
		.promise.then((pdf) => {
			pdfDoc = pdf;
			return preloadPages(pdf);
		})
		.then(() => {
			// Remove the loading spinner now that pages are ready.
			if (spinner && spinner.parentNode) {
				spinner.parentNode.removeChild(spinner);
			}
			// Make the container visible now.
			if (containerEl) {
				containerEl.style.visibility = "visible";
			}
			// Start the timer if enabled.
			if (params.timer === "yes") {
				startTimer();
			}
			// Display the first set of pages.
			displayPages();
			// If slideshow mode, kick off automatic transitions.
			if (params.type === "slideshow") {
				startSlideshow();
			}
		})
		.catch((err) => {
			// In case of an error (e.g., PDF not found), remove spinner and show error.
			if (spinner && spinner.parentNode) {
				spinner.parentNode.removeChild(spinner);
			}
			dynamicPage.innerHTML = `<h1 class="error_message" style="text-align: center; display: flex; justify-content: center; align-items: center; height: 100vh;">The pdf you specified in the URL was not found.</h1>`;
		});
});
