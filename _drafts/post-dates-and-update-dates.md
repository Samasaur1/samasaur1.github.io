---
layout: post
title: 'Post Dates and Update Dates'
date: 2023-07-25 15:24 -0700
tags:
- the blog
- jekyll
---
You may have noticed another change on the blog --- one that should also be visible to those reading via RSS. Posts now have dates with times --- no longer will every post appear at midnight --- and can have update dates as well.

First, I went through every post and added a `date` field in the YAML metadata at the top of the file. To find the edit dates, I ran `git log -- <POST>` for each post (e.g., `git log -- _posts/2023-07-06-split-tunneling-with-tailscale-and-wireguard-on-macos.md`). This showed me the commits that touched each post, letting me see the initial post date, and any update dates for posts which had been updated. Those updated posts got a custom `last_updated` field in the YAML metadata.[^1]

[^1]: I also created Neovim snippets for inserting the current date and time in the format that Jekyll expects. You can see how they're defined [in my dotfiles repo](https://github.com/Samasaur1/dotfiles/blob/851e4164c907264f125c0ae8658bdde16d373960/nvim/snippets/all.lua), but the gist of it is:

    ```lua
    local date = function() return {os.date('%Y-%m-%d')} end
    local time = function() return {os.date('%H:%M %z')} end
    ```

Now that the post and update date have been set for every post, we have to use them. I had been using {% raw %}`{{ page.date | date_to_string }}`{% endraw %} (which for this post generates "{{ page.date | date_to_string }}") for both the lists of posts and each post page --- but only for the initial post date. I like this date format for the post lists, so I just needed to add the update date if it exists:

{% raw %}
```diff
diff --git a/_includes/post.html b/_includes/post.html
index f0b2472..86d8166 100644
--- a/_includes/post.html
+++ b/_includes/post.html
@@ -1,7 +1,7 @@
 <{{ include.tag | default: "h3" }}>
   <a href="{{ post.url }}">{{ post.title }}</a>&nbsp;
   <span style="font-size: 50%;">
-    <span class="text-muted">{{ post.date | date_to_string }}</span>
+    <span class="text-muted">{{ post.date | date_to_string }}&nbsp;</span>
   </span>
   <span style="font-size: 55%;">
     {% if post.tags[0] %}
@@ -19,6 +19,11 @@
       {% endfor %}
     {% endif %}
   </span>
+  {% if post.last_updated %}
+    <span style="font-size: 50%;">
+      <span class="text-muted">&nbsp;updated {{ post.last_updated | date_to_string }}</span>
+    </span>
+  {% endif %}
 </{{ include.tag | default: "h3" }}>

 {{ post.excerpt }}
```
{% endraw %}

I also had to add the update date to each post page, but I want to change the format before I do that. Currently, it looks the same as on the list of posts, but I want it to include post time as well (which will also apply to the entries in the RSS feed).

First, I changed to using:

{% raw %}
```liquid
{{ page.last_updated | date: "%d %b %Y %l:%M %p" }}
```
and the corresponding
```liquid
{% if page.last_updated %}
  updated {{ page.last_updated | date: "%d %b %Y %l:%M %p" }}
{% endif %}
```
{% endraw %}

These produce dates of the format "{{ page.date | date: "%d %b %Y %l:%M %p" }}". Having set `timezone: America/Los_Angeles` in `_config.yml`, these always produce dates in Pacific time.

I had a kind of crazy idea to make the hardcoded dates be in Pacific time, but use JavaScript to automatically convert the dates to the local time zone. To do this, I added a `data-utc` attribute to a `<span>` enclosing the Pacific time date, and a script tag underneath, like so:

{% raw %}
```html
<span data-utc="{{ page.date | date: "%FT%T%z" }}" id="post-date">{{ page.date | date: "%d %b %Y %l:%M %p" }}</span>
<script type="text/javascript">
  el = document.getElementById("post-date");
  d = new Date(el.attributes["data-utc"].value);
  _date = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format;
  _time = new Intl.DateTimeFormat("en-US", { timeStyle: "short" }).format;
  el.innerHTML = _date(d) + " " + _time(d);
  el.removeAttribute("data-utc");
</script>
```
{% endraw %}

Currently, this sets the date and time to your local timezone, without telling you that it's doing so, and without giving you an option to leave it in Pacific time. I am planning to add a checkbox (with a cookie to remember it across posts and across visits) that decides between using the site's time zone and using the local time zone.
