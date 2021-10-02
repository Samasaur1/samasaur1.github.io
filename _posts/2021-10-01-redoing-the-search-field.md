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

I tried to change it to this:
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
