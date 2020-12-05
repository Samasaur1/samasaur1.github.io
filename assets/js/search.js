// https://davidwalsh.name/adding-search-to-your-site-with-javascript
var searchIndex = lunr(function() {
    this.ref("id");
    this.field("title", { boost: 10 });
    this.field("content");
    for (var key in window.pages) {
        this.add({
            "id": key,
            "title": pages[key].title,
            "content": pages[key].content
        });
    }
});


var searchTerm = getQueryVariable("q");
var results = searchIndex.search(searchTerm);
var resultPages = results.map(function (match) {
  return pages[match.ref];
});


function formatContent(content, searchTerm) {
    var termIdx = content.toLowerCase().indexOf(searchTerm.toLowerCase());
    if (termIdx >= 0) {
        var startIdx = Math.max(0, termIdx - 140);
        var endIdx = Math.min(content.length, termIdx + searchTerm.length + 140);
        var trimmedContent = (startIdx === 0) ? "" : "&hellip;";
        trimmedContent += content.substring(startIdx, endIdx);
        trimmedContent += (endIdx >= content.length) ? "" : "&hellip;"

        var highlightedContent = trimmedContent.replace(new RegExp(searchTerm, "ig"), function matcher(match) {
            return "<strong>" + match + "</strong>";
        });

        return highlightedContent;
        //TODO: https://getbootstrap.com/docs/4.5/components/breadcrumb/
    }
    else {
        var emptyTrimmedString = content.substr(0, 280);
        emptyTrimmedString += (content.length < 280) ? "" : "&hellip;";
        return emptyTrimmedString;
    }
}


resultsString = "";
resultPages.forEach(function (r) {
    resultsString += "<li>";
    resultsString +=   "<a class='result' href='" + r.url + "?q=" + searchTerm + "'><h3>" + r.title + "</h3></a>";
    resultsString +=   "<div class='snippet'>" + formatContent(r.content, searchTerm) + "</div>";
    resultsString += "</li>"
});
document.querySelector("#search-results").innerHTML = resultsString;
