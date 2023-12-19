---
layout: post
title: 'Previewing Pending Comments'
date: 2023-12-19 09:00 -0800
tags:
- the blog
- jekyll
- javascript
---
When I originally [added comments to the blog]({% post_url 2023-07-28-adding-comments-to-the-blog %}), commenters didn't see any indicator that comments went through. This was understandably confusing, so I decided to show a message saying that the new comment was pending. I've gone through a couple versions, and I'm reasonably happy with what I ended up with.

### version one: "comment pending"

In [the initial version](https://github.com/Samasaur1/samasaur1.github.io/commit/82f2eaafe9115ce73ef8d700401696621f2b3b39), I simply added a hidden div that said "Your comment is now pending!" in the list of comments, and set the redirect URL to show that message:

```diff
commit 82f2eaafe9115ce73ef8d700401696621f2b3b39
Author: Sam <30577766+Samasaur1@users.noreply.github.com>
Date:   Wed Nov 15 12:46:56 2023 -0800

    Add 'comment pending' (see #44)

diff --git a/_includes/comment-new.html b/_includes/comment-new.html
index 1f53103..23dd4c2 100644
--- a/_includes/comment-new.html
+++ b/_includes/comment-new.html
@@ -1,7 +1,7 @@
 <h3>Respond to this</h3>
 <form action="/fake" method="post" id="commentform" class="form-horizontal">
   <fieldset id="commentfields">
-    <input name="redirect" type="hidden" value="{{ site.url }}{{ page.url }}#post-comments">
+    <input name="redirect" type="hidden" value="{{ site.url }}{{ page.url }}#comment-pending">
     <input name="post_id" type="hidden" value="{{ slug }}">
     <input name="comment-site" type="hidden" value="{{ site.url }}">
     <textarea style="width: 100%;" name="message" id="message" placeholder="Continue the discussion." search-slash-ignore></textarea>
diff --git a/_includes/comments.html b/_includes/comments.html
index f94fd66..5293162 100644
--- a/_includes/comments.html
+++ b/_includes/comments.html
@@ -17,6 +17,9 @@
{% raw %}       {% include comment.html %}{% endraw %}
     </li>
{% raw %}   {% endfor %}{% endraw %}
+    <div class="hidden" id="comment-pending">
+      <li>Your comment is now pending!</li>
+    </div>
   </ol>
 </div>
{% raw %} {% endif %}{% endraw %}
diff --git a/_sass/main.scss b/_sass/main.scss
index a4ead8b..a779a70 100644
--- a/_sass/main.scss
+++ b/_sass/main.scss
@@ -173,3 +173,10 @@ body {
 del {
   text-decoration-thickness: 10%;
 }
+
+.hidden {
+  display: none;
+}
+.hidden:target {
+  display: inherit;
+}
```

If you'd like to see this in action (and you have Nix installed), you can do that too:
```bash
cd $(mktemp -d)
git clone https://github.com/Samasaur1/samasaur1.github.io
cd samasaur1.github.io
git checkout 82f2eaa
nix develop github:Samasaur1/samasaur1.github.io -c jekyll serve -DH0.0.0.0 -P4001
```
and then open <http://localhost:4001/blog/jdks-on-nix-darwin#comment-pending> in your browser. You'll see the one real comment on that page, and then:
> 2\. Your comment is now pending!

### version two: better previews

That message was easy-to-miss, and also kinda ugly. I wanted the pending comment message to actually look like a comment, so in [the second version](https://github.com/Samasaur1/samasaur1.github.io/commit/80808e9b503229b0b3b931dd7031cadc44f9fba0), I had the page read from the URL query parameters (if they existed), and actually build a real comment:

```diff
commit 80808e9b503229b0b3b931dd7031cadc44f9fba0
Author: Sam <30577766+Samasaur1@users.noreply.github.com>
Date:   Wed Nov 15 13:32:15 2023 -0800

    Improve pending comment placeholder (see #44)

diff --git a/_includes/comments.html b/_includes/comments.html
index 5293162..8004b37 100644
--- a/_includes/comments.html
+++ b/_includes/comments.html
@@ -22,6 +22,27 @@
     </div>
   </ol>
 </div>
+<script>
+qp = new URLSearchParams(window.location.search);
+name = qp.get("name") ?? "You";
+body = qp.get("body") ?? "Your comment is now pending!";
+gravatar = qp.get("gravatar") ?? "gravatar";
+// I'm choosing not to support URLs
+document.getElementById("comment-pending").innerHTML = `
+  <li>
+    <img alt="Gravatar for ${name}" src="https://secure.gravatar.com/avatar/${gravatar}?s=64&d=retro&r=pg" srcset="https://secure.gravatar.com/avatar/${gravatar}?s=128&d=retro&r=pg 2x" class="avatar avatar-64 photo" height="64" width="64">
+    <blockquote id="comment id">
+      <!--- TODO: Convert comment to markdown --->
+      <div class="comment-body">${body}</div>
+      <cite>
+        ${name}
+        &ndash;
+        <span class="text-muted">Just now (pending)</span>
+      </cite>
+    </blockquote>
+  </li>
+`;
+</script>
{% raw %} {% endif %}
 {% if page.commenting == 'open' %}
 {% include comment-new.html %}{% endraw %}
```

You can try this version with a similar series of commands:
```bash
cd $(mktemp -d)
git clone https://github.com/Samasaur1/samasaur1.github.io
cd samasaur1.github.io
git checkout 80808e9
nix develop github:Samasaur1/samasaur1.github.io -c jekyll serve -DH0.0.0.0 -P4001
```
and then try going to <http://localhost:4001/blog/jdks-on-nix-darwin#comment-pending> and <http://localhost:4001/blog/jdks-on-nix-darwin?name=Sam&body=Test%20comment#comment-pending>. You can also pass a `gravatar` query param, but you need to know the hash of your email address: try <http://localhost:4001/blog/jdks-on-nix-darwin?name=Sam&body=Test%20comment&gravatar=10782c838ade6315653a456b5f055390#comment-pending>.

That last example will look pretty much exactly like a real comment, except instead of a date it will say *Just now (pending)* --- however, none of that information is actually passed as part of the redirect URL as of yet.

### version three: actual comment data

[Next](https://github.com/Samasaur1/samasaur1.github.io/commit/2dcada8721d825292cbfbb4e5b4f6dc0c813aaea), I actually updated the redirect link before submitting the comment, which ensured that the actual data was presented:

```diff
commit 2dcada8721d825292cbfbb4e5b4f6dc0c813aaea
Author: Sam <30577766+Samasaur1@users.noreply.github.com>
Date:   Thu Nov 16 13:26:36 2023 -0800

    Fully preview pending comments

diff --git a/_includes/comment-new.html b/_includes/comment-new.html
index 23dd4c2..49bb224 100644
--- a/_includes/comment-new.html
+++ b/_includes/comment-new.html
@@ -1,7 +1,7 @@
 <h3>Respond to this</h3>
 <form action="/fake" method="post" id="commentform" class="form-horizontal">
   <fieldset id="commentfields">
-    <input name="redirect" type="hidden" value="{{ site.url }}{{ page.url }}#comment-pending">
+    <input name="redirect" type="hidden" value="{{ site.url }}{{ page.url }}#comment-pending" id="redirect-link">
     <input name="post_id" type="hidden" value="{{ slug }}">
     <input name="comment-site" type="hidden" value="{{ site.url }}">
     <textarea style="width: 100%;" name="message" id="message" placeholder="Continue the discussion." search-slash-ignore></textarea>
@@ -36,6 +36,8 @@
         return
       }
 
+      document.getElementById("redirect-link").value = `{{ site.url }}{{ page.url }}?name=${document.getElementById("name").value}&body=${document.getElementById("message").value}&gravatar=${md5(document.getElementById("email").value)}#comment-pending`;
+
       var form = document.getElementById('commentform')
       form.action = '{{ site.comments.receiver }}'
       button.innerText = 'Posting...'
diff --git a/_includes/comments.html b/_includes/comments.html
index 8004b37..c3be0e8 100644
--- a/_includes/comments.html
+++ b/_includes/comments.html
@@ -22,6 +22,7 @@
     </div>
   </ol>
 </div>
+<script src="/assets/js/md5.js"></script>
 <script>
 qp = new URLSearchParams(window.location.search);
 name = qp.get("name") ?? "You";
@@ -35,7 +36,7 @@ document.getElementById("comment-pending").innerHTML = `
       <!--- TODO: Convert comment to markdown --->
       <div class="comment-body">${body}</div>
       <cite>
-        ${name}
+        ${name} <span class="badge badge-info" style="font-style: normal;">You</span>
         &ndash;
         <span class="text-muted">Just now (pending)</span>
       </cite>
```

I also added a JavaScript MD5 function that I found online (at `/assets/js/md5.js`), but I've cut it out of the diff here because it isn't interesting to look at.

The only *visible* change from this commit is the <span class="badge badge-info" style="font-style: normal;">You</span> badge that appears on the pending comment; otherwise, the only difference is that the fields actually show the information from your comment, rather than placeholders.

#### oops! you can only comment on posts that already have comments on them

At this point, I thought it was working: comments looked great. However, one of my friends reported to me that you could only actually *leave* comments on posts that already had comments on them. When attempting to do so, you get this error in the console:
```
Uncaught ReferenceError: md5 is not defined
    setupForm http://localhost:4001/blog/forwarding-dark-mode-over-ssh:307
    onclick http://localhost:4001/blog/forwarding-dark-mode-over-ssh:1
```

The reason for this error was that the MD5 function I added was only included in pages that already had comments. Take a look at `_includes/comments.html`:
```liquid
{% raw %}{% capture default_slug %}{{ page.slug | default: (page.title | slugify) }}{% endcapture %}
{% capture slug %}{{ (page.slug | fallback: default_slug) | downcase | replace: '.', '-' | replace: '_' : '-' }}{% endcapture %}
{% assign comments_map = site.data.comments[slug] %}
{% assign comments = site.emptyArray %}
{% for comment in comments_map %}
  {% assign comments = comments | push: comment[1] %}
{% endfor %}
{% assign comment_count = comments | size %}
{% if comment_count > 0 %}
  {% assign author = site.data.authors[page.author] %}
<div id="comments">
  <h3>{% if comment_count == 1 %}One response{% else %}{{ comment_count }} responses{% endif %}</h3>
  <ol>
  {% assign sorted_comments = comments | sort: 'date' %}
  {% for comment in sorted_comments %}
    <li{% if comment.url %}{% if comment.url == site.url %} class="byauthor" {% endif %}{% endif %}>
      {% include comment.html %}
    </li>
  {% endfor %}
    <div class="hidden" id="comment-pending">
      <li>Your comment is now pending!</li>
    </div>
  </ol>
</div>
<script src="/assets/js/md5.js"></script>
<script>
qp = new URLSearchParams(window.location.search);
name = qp.get("name") ?? "You";
body = qp.get("body") ?? "Your comment is now pending!";
gravatar = qp.get("gravatar") ?? "gravatar";
// I'm choosing not to support URLs
document.getElementById("comment-pending").innerHTML = `
  <li>
    <img alt="Gravatar for ${name}" src="https://secure.gravatar.com/avatar/${gravatar}?s=64&d=retro&r=pg" srcset="https://secure.gravatar.com/avatar/${gravatar}?s=128&d=retro&r=pg 2x" class="avatar avatar-64 photo" height="64" width="64">
    <blockquote id="comment id">
      <!--- TODO: Convert comment to markdown --->
      <div class="comment-body">${body}</div>
      <cite>
        ${name} <span class="badge badge-info" style="font-style: normal;">You</span>
        &ndash;
        <span class="text-muted">Just now (pending)</span>
      </cite>
    </blockquote>
  </li>
`;
</script>
{% endif %}
{% if page.commenting == 'open' %}
{% include comment-new.html %}
{% endif %}{% endraw %}
```

Notice how the line:
```html
<script src="/assets/js/md5.js"></script>
```

is included *inside* the {% raw %}`{% if comment_count > 0 %}`{% endraw %} check, so it is only loaded when comments exist, even though it is used when creating comments.

I could have only loaded `/assets/js/md5.js` inside {% raw %}`{% if page.commenting == 'open' %}`{% endraw %}, but I figured that wasn't worth it, so I simply included it outside the conditional.

#### one final note

Because this preview is based off of the query parameters in the URL, you can safely reload the page without resubmitting the comment. However, if you navigate away from the page and then back to the same blog post, the comment will be gone.
