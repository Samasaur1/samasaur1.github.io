---
layout: post
tags:
  - the blog
---
As I said in [issue #8](https://github.com/Samasaur1/samasaur1.github.io/issues/8), I wanted to be able to use <kbd>⌘F</kbd> / <kbd>⌃F</kbd> to search on the page. However, at the time of writing, it selects the search field. This means that I needed to change the search field to have a different keyboard shortcut, so I decided to use <kbd>/</kbd> (as does GitHub).

In that GitHub issue, I showed the current code:
```html
<script type="text/javascript">
   window.addEventListener("keydown", function(e){
     if ((e.ctrlKey || e.metaKey) && e.keyCode === 70) { //⌘F or ⌃F (find on page)
       e.preventDefault();
       document.getElementById("search-field").focus();
     }
   });
 </script>
 ```
and the JavaScript that I thought I would need to replace it with:
```js
window.addEventListener("keydown", function(e) {
  if (e.keyCode === 191) {
    e.preventDefault();
    document.getElementById("search-field").focus();
  }
});
```
I started by doing that, which works fine for selecting, but leaves us with a problem — if the search field is already selected, by any method of selection, and you press <kbd>/</kbd>, you don't actually type it, as it just reselects the field.

First I tried removing the event listener when the field was selected, but I couldn't get that to work at ALL. So then I tried to change it to this:
```js
window.addEventListener("keydown", function(e) {
  // console.log(e.keyCode);
  if (e.keyCode === 191) {// use the / key
    if (document.getElementById("search-field").selected) {
      //console.log("Selected")
    } else {
      e.preventDefault();
      document.getElementById("search-field").focus();
    }
  }
});
```
since `<input>` fields _should_ have a `selected` property, but it didn't work, so I went with this:
```js
window.addEventListener("keydown", function(e) {
  // console.log(e.keyCode);
  if (e.keyCode === 191) {// use the / key
    if (document.activeElement === document.getElementById("search-field")) {
      //console.log("Selected")
    } else {
      e.preventDefault();
      document.getElementById("search-field").focus();
    }
  }
});
```
***
This just left the <kbd>/</kbd> "tool-tip" hint. I copied the `/` icon from GitHub (it's just an SVG), and tried to put in right after the search field. This did not work. After messing around with `position` CSS fields, and `margin-left`, and a whole mess of stuff, I eventually went with this:
```html
<div style="position: relative; width: 0; height: 0;">
  <svg id="searchSlash" xmlns="http://www.w3.org/2000/svg" width="22" height="20" aria-hidden="true" class="mr-1 header-search-key-slash" style="position: absolute; left: -35px; top: -9px;"><path fill="none" stroke="#979A9C" opacity=".4" d="M3.5.5h12c1.7 0 3 1.3 3 3v13c0 1.7-1.3 3-3 3h-12c-1.7 0-3-1.3-3-3v-13c0-1.7 1.3-3 3-3z"></path><path fill="#979A9C" d="M11.8 6L8 15.1h-.9L10.8 6h1z"></path></svg>
</div>
```
right after the `<input>` field. Essentially, this is a nonexistent div that goes right after the search field, with an absolutely-positioned SVG (so that it doesn't interrupt any other elements) that has been painstakingly adjusted to be in the right position. Would it be in the right position all the time? No. It's probably just for my laptop. ¯\\\_(ツ)\_/¯

Now, the last thing to do was to hide and show this slash when the input field is selected or not selected. I tried adding an `onselect` attribute to the `<input>` field that called a JavaScript function I defined next to the `window.addEventListener` line, but that didn't work. Eventually I went with this monstrosity:
```html
<input class="form-control mr-sm-2" type="search" placeholder="Search" aria-label="Search" id="search-field" name="q" onfocus="document.getElementById('searchSlash').style.display = 'none';" onblur="document.getElementById('searchSlash').style.display = '';">
```
I mean, it works?
