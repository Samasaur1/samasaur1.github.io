//https://trackjs.com/blog/site-search-with-javascript-part-2/
// also just shamelessly stolen from their site

(function (ready) {
    if (document.readyState === "complete") {
        ready();
    }
    else {
        document.addEventListener("DOMContentLoaded", ready);
    }
})(
function configSearchHiliting() {
        function HiliteController(searchTerm, article) {
            this.searchTerm = searchTerm;
            this.article = article;
            this.hilites = [];
            this.currentHilite = null;
            this.idx = 0;

            this.updateHiliteControl = function() {
                if (this.currentHilite) {
                    this.currentHilite.classList.remove("search-highlight-current");
                }
                this.currentHilite = this.hilites[this.idx];
                if (this.currentHilite) {
                    this.currentHilite.classList.add("search-highlight-current");
                    this.currentIdxEl.textContent = this.idx + 1;
                    minimumScroll(this.currentHilite);
                }
            }

            this.next = function() {
                this.idx = this.idx >= this.hilites.length ? this.idx = 0 : this.idx + 1;
                this.updateHiliteControl();
            }

            this.prev = function() {
                this.idx = this.idx === 0 ? this.hilites.length - 1 : this.idx - 1;
                this.updateHiliteControl();
            }

            window.findAndReplaceDOMText && findAndReplaceDOMText(article, {
                find: new RegExp(searchTerm, "ig"),
                wrap: "span",
                wrapClass: "search-highlight"
            });
            this.hilites = article.querySelectorAll(".search-highlight");

            this.controlEl = document.querySelector(".search-highlight-search");
            this.searchTermEl = this.controlEl.querySelector(".term");
            this.currentIdxEl = this.controlEl.querySelector(".current");
            this.totalIdxEl = this.controlEl.querySelector(".total");

            this.searchTermEl.textContent = this.searchTerm;
            this.totalIdxEl.textContent = this.hilites.length;
            this.controlEl.style.visibility = "visible";

            this.updateHiliteControl();
        }

        function getQueryVariable(variable) {
            var query = window.location.search.substring(1);
            var vars = query.split("&");

            for (var i = 0; i < vars.length; i++) {
                var pair = vars[i].split("=");
                if (pair[0] === variable) {
                    return decodeURIComponent(pair[1].replace(/\+/g, "%20"));
                }
            }
        }

        document.addEventListener("click", function(evt) {
            if (!evt.target.matches(".search-highlight-search button") || !window.hiliteController) { return };
            if (evt.target.matches(".close")) {
                delete window.hiliteController;
                window.location = location.pathname;
            }
            else if (evt.target.matches(".prev")) {
                window.hiliteController.prev();
            }
            else if (evt.target.matches(".next")) {
                window.hiliteController.next();
            }
        })
        window.addEventListener("keydown", function(e){
          if (e.keyCode === 27) { //escape
            removeHighlightSearch();
          }
        });

        // need to keep scroll height.
        // https://stackoverflow.com/questions/17642872/refresh-page-and-keep-scroll-position
        // https://stackoverflow.com/a/42977427/8387516
        function removeHighlightSearch() {
          if (!window.hiliteController) { return; }
            var page_y = document.documentElement.scrollTop;
            window.location.href = window.location.href.split('?')[0] + '?page_y=' + page_y;
        }
        let page_y = getQueryVariable("page_y");
        if (page_y) {
          document.documentElement.scrollTop = page_y;
        }

        // https://stackoverflow.com/questions/123999/how-can-i-tell-if-a-dom-element-is-visible-in-the-current-viewport
        function isElementInViewport (el) {
            let rect = el.getBoundingClientRect();

            return (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                rect.right <= (window.innerWidth || document.documentElement.clientWidth)
            );
        }

        function minimumScroll (el) {
          let rect = el.getBoundingClientRect();
          console.log(rect);
          let SCROLL_PADDING = 10;

          if (rect.top < SCROLL_PADDING) {
            el.scrollIntoView(true);
            document.documentElement.scrollTop -= SCROLL_PADDING;
            return;
          }

          if (rect.bottom + SCROLL_PADDING > (window.innerHeight || document.documentElement.clientHeight)) {
            el.scrollIntoView(false);
            document.documentElement.scrollTop += SCROLL_PADDING;
            return;
          }

          // // let yOffset = document.documentElement.scrollTop;
          // if (isElementInViewport(this.currentHilite)) { return; }
          // this.currentHilite.scrollIntoView && this.currentHilite.scrollIntoView(false);
          // // if (document.documentElement.scrollTop < yOffset) {
          // //   document.documentElement.scrollTop = yOffset;
          // // }
        }

        function initSearchHiliting() {
            var searchTerm = getQueryVariable("q");
            var article = document.querySelector("#content-main");
            if (!searchTerm || !article) { return; }
            if (location.pathname === "/search.html") { return; }
            window.hiliteController = window.hiliteController || new HiliteController(searchTerm, article);
        }

        initSearchHiliting();
        document.addEventListener("pjax:complete", initSearchHiliting);
    }
);
