<table>
  <tr>
    <td><img src="readme/pdfserve.svg" alt="pdf-view" width="120" height="120"></td>
    <td><h1>PDFServe</h1></td>
  </tr>
</table>

This embedded script can be added to an html page (example index.html included) to render the individual pages of a pdf file as a slideshow or user-advanced presentation using PDF.js.  The script accepts URL parameters to turn on or off some features: orientation, columns, background-color, display page number, transition time (fade-in, fade-out on pages), interval (in slideshow mode, how long a slide is displayed before moving to the next image), and timer (if you want to have a small elapsed time counter in the top left of the screen).

[PDF.js Homepage](https://mozilla.github.io/pdf.js/) 

## URL Parameters
Option in bold is the default setting that will be used if nothing is given as a URL parameter. Defaults can be changed by editing the **style section** of the index (see belwo).

Example: /pdf-serve/?url=file.pdf&orientation=landscape&type=presentation&columns=1&pagenumber=yes&bg=red&transition=1000&interval=10000&timer=no
-	url: this is the name of the pdf that you want to display.
-	orientation: portrait | landscape
-	type: presentation | slideshow 
-	columns: 1 | 2 | 3 (portrait orientation only)
-	pagenumber: yes | no (make page number visible on the top right corner of each page)
-	bg: color name | (292929) hex color code (choose background-color. Do not include the # in the URL parameter).
-	transition: msec (1000)  
-	interval: msec (10000) display time of a page in slideshow mode before advancing to the next page: this is in addition to the transition time.
-	timer: yes | no (make a timer displayed in top right of the screen)

When type=presentation, navigation buttons are displayed at the bottom left of the screen.

### Where the default values are stored in the *index.html**

```
html {
  --URL: "README.pdf";
  --orientation: "landscape";
  --columns: 1;
  --type: "slideshow";
  --pagenumber: "yes";
  --bg: 292929;
  --transition: 1000;
  --interval: 10000;
  --timer: "no";
}
```