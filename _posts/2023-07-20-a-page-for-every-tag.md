---
layout: post
title: 'A Page for Every Tag'
date: 2023-07-20 14:25 -0700
last_updated: 2023-07-20 15:42 -0700
tags:
- the blog
- jekyll
---
I have wanted to have a page for each tag essentially since I set up this blog. The idea was that you would be able to click on any tag on any post, and you would be sent to a page that provides a short description of the subject, and shows you all the posts on my blog with that tag. However, for _over two years_ this feature has been missing. No longer.

Before we dive into the changes I made, let's first look at the status of my site pre-changes. That's [commit 80f6add](https://github.com/Samasaur1/samasaur1.github.io/tree/80f6addc006c32502872847b73d065120885e9f1).

First, let's consider the [main blog page](https://github.com/Samasaur1/samasaur1.github.io/blob/80f6addc006c32502872847b73d065120885e9f1/blog.html). There are two conceptual parts of this file that are worth considering. First, the list of posts:

{% raw %}
```liquid
<ul>
  {% for post in site.posts %}
    <li>
      <h3>
        <a href="{{ post.url }}">{{ post.title }}</a>&nbsp;
        <span style="font-size: 50%;">
          <span class="text-muted">{{ post.date | date_to_string }}</span>
        </span>
        <span style="font-size: 55%;">
          {% if post.tags[0] %}
            {% for tag in post.tags %}
              {% assign css-class = "badge-secondary" %}
              {% for site_tag in site.data.tags %}
                {% if site_tag.name == tag %}
                  {% assign css-class = site_tag.class %}
                {% endif %}
              {% endfor %}
              <a href="{{ "/tags/" | append: tag | relative_url }}" class="badge {{ css-class }}">{{ tag }}</a>
            {% endfor %}
          {% endif %}
        </span>
      </h3>

      {{ post.excerpt }}
    </li>
  {% endfor %}
</ul>
```
{% endraw %}

Fairly straightforward: it iterates through all the posts in the blog, displaying the post title with a link to the full post, displaying the post date, the tag block that I'll talk about in a second, and then an excerpt from the post.

The tag block is a little more complicated than the rest. It works by checking if the current post _has_ any tags in the first place. If so, it iterates through the tags on the post. For each, it sets a variable called `css-class` to `badge-secondary` --- the default tag style. Then, it iterates through all the tags defined in the site, and if it finds one that matches the current tag on the post that it's considering, it overwrites the `css-class` variable to use the style defined on the site tag. Then it creates the HTML element for the tag, including a link to the tag page and the computed tag style.

This works in tandem with the list of tags defined for the site, in [`_data/tags.yml`](https://github.com/Samasaur1/samasaur1.github.io/blob/80f6addc006c32502872847b73d065120885e9f1/_data/tags.yml):

```yml
- name: swift
  class: badge-swift
- name: jekyll
  class: badge-danger
- name: java
  class: badge-java
- name: rust
  class: badge-rust
- name: tex
  class: badge-tex
- name: latex
  class: badge-tex
- name: kotlin
  class: badge-kotlin
- name: gradle
  class: badge-gradle
- name: python
  class: badge-python
- name: nixos
  class: badge-nix
```

This data file of tags is also used for the second part of the main blog page, which is the list of posts by tag:

{% raw %}
```liquid
<h2>Posts By Tag</h2>
{% for tag in site.tags %}
  {% assign css-class = "badge-secondary" %}
  {% for site_tag in site.data.tags %}
    {% if site_tag.name == tag[0] %}
      {% assign css-class = site_tag.class %}
    {% endif %}
  {% endfor %}
  <a href="{{ "/tags/" | append: tag[0] | relative_url }}" class="badge {{ css-class }}">{{ tag[0] }}</a>
  <ul>
    {% for post in tag[1] %}
      <li><a href="{{ post.url }}">{{ post.title }}</a></li>
    {% endfor %}
  </ul>
{% endfor %}
```
{% endraw %}

Note that both `site.tags` and `site.data.tags` exist. The latter is generated from the YAML file in `_data/tags.yml` as seen above. The former, according to [the docs](https://jekyllrb.com/docs/posts/#tags), is a list of all tags used on the site, which contains both the name of the tag and all posts with that tag:

> All tags registered in the current site are exposed to Liquid templates via `site.tags`. Iterating over `site.tags` on a page will yield another array with two items, where the first item is the name of the tag and the second item being an array of posts with that tag.

Once you understand that, it's fairly straightforward. For every tag used on the site, compute the CSS class to apply by comparing it to the tags defined in `_data/tags.yml`. Then create a link to the tag page for that tag, and under it show a list of all posts with that tag.

Great! ...except the links to the tag pages (from both parts of the main blog page) give 404 errors.

***

The first issue I faced was generating the pages for the tags. "Sam," you may say, "that's the entire point of the article." To be more clear, I don't mean nice-looking pages for the tags, or even ugly-looking pages. To start, we need to be able to generate blank pages for each tag, just to ensure that the pages exist. I googled[^1] "jekyll generate pages from data" and found [this plugin](https://github.com/avillafiorita/jekyll-datapage_gen). I added it to the site:

[^1]: from [Wikipedia](https://en.wikipedia.org/wiki/Google_(verb)):
    > To prevent genericizing and potential loss of its trademark, Google has discouraged use of the word as a verb, particularly when used as a synonym for general web searching.

    so I choose to use it deliberately

<blockquote style="border-left-color: red; background-color: #ffaaaa; padding-top: 0.5em; padding-bottom: 0.5em;">
    <!-- https://www.svgrepo.com/svg/379925/alert-error -->
    <h5><strong><img style="width: 2em;" src="{{ "/assets/images/error.svg" | relative_url }}"/>&nbsp;&nbsp;This plugin does not work using the classic GitHub Pages deployment strategy.</strong></h5>
    <p>Initially, GitHub Pages sites were built when changes were pushed to a specific branch. There are a number of limitations on this deployment model, most notably that GitHub limits the plugins that can be used. The plugin I am using in this post is not one of the supported plugins, so using it with the classic deployment strategy will not work properly.</p>
    <p>As of last year, GitHub also supports deploying GitHub Pages sites using GitHub Actions. However, sites that were already configured to use branch-based deployment, such as mine, were not automatically migrated. If this applies to you as well, and you would like to use plugins that are not supported by the classic deployment strategy, you will need to migrate to the GitHub Actions deployment strategy.</p>
    <p>See <a href="https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site">the GitHub documentation on publishing sources</a> for more information.</p>
</blockquote>

```diff
diff --git a/_config.yml b/_config.yml
index 5cf94a6..0467c97 100644
--- a/_config.yml
+++ b/_config.yml
@@ -5,6 +5,7 @@ collections:
 plugins:
   - jekyll-feed
   - jekyll-seo-tag
+  - jekyll-datapage-generator

 defaults:
   -
@@ -16,3 +17,10 @@ defaults:
       # layout: default

 #excerpt_separator: <!--more-->
+
+page_gen_dirs: false
+page_gen:
+  - data: tags
+    template: tag
+    dir: tags
+    name: name
```

and added a tag layout (`_layouts/tag.html`):

{% raw %}
```liquid
---
layout: default
---
{{ page.title }}
```
{% endraw %}

This _almost_ generates a page for each tag. The plugin that I used reads from `site.data.tags` (since I set `data: tags` in `_config.yml`), not `site.tags`. As we saw above, while `site.tags` includes every tag used on the site, `site.data.tags` only includes the tags I list in the `_data/tags.yml` file. So we have to update that file:

```diff
diff --git a/_data/tags.yml b/_data/tags.yml
index cc1d542..87aab6b 100644
--- a/_data/tags.yml
+++ b/_data/tags.yml
@@ -18,3 +19,25 @@
   class: badge-python
 - name: nixos
   class: badge-nix
+- name: frc
+- name: the blog
+- name: swift package manager
+- name: macos
+- name: neovim
+- name: sudo
+- name: shell
+- name: discord
+- name: rss
+- name: rssbot
+- name: refind
+- name: catppuccin
+- name: svg
+- name: imagemagick
+- name: ssh
+- name: gnupg
+- name: tailscale
+- name: wireguard
+- name: vpn
+- name: homebrew
+- name: macports
+- name: alacritty
```

Now a page is technically generated for each tag. However, we still have some issues. You may have noticed that the `_data/tags.yml` file _used_ to have every tag have both a `name` and a `class`, but that the new tags in the file only have a `name`. If you guessed that this would cause problems, you'd be right. Every tag that used to be using the default CSS class (and therefore the default tag color) now has no color at all, and does not match the other tags.

Remember this excerpt from the list of posts?

{% raw %}
```liquid
{% if post.tags[0] %}
  {% for tag in post.tags %}
    {% assign css-class = "badge-secondary" %}
    {% for site_tag in site.data.tags %}
      {% if site_tag.name == tag %}
        {% assign css-class = site_tag.class %}
      {% endif %}
    {% endfor %}
    <a href="{{ "/tags/" | append: tag | relative_url }}" class="badge {{ css-class }}">{{ tag }}</a>
  {% endfor %}
{% endif %}
```
{% endraw %}

Apply this change:

{% raw %}
```diff
   {% for site_tag in site.data.tags %}
     {% if site_tag.name == tag[0] %}
-      {% assign css-class = site_tag.class %}
+      {% if site_tag.class %}
+        {% assign css-class = site_tag.class %}
+      {% endif %}
     {% endif %}
   {% endfor %}
```
{% endraw %}

and get this result:

{% raw %}
```liquid
{% if post.tags[0] %}
  {% for tag in post.tags %}
    {% assign css-class = "badge-secondary" %}
    {% for site_tag in site.data.tags %}
      {% if site_tag.name == tag %}
        {% assign css-class = site_tag.class %}
        {% if site_tag.class %}
          {% assign css-class = site_tag.class %}
        {% endif %}
      {% endif %}
    {% endfor %}
    <a href="{{ "/tags/" | append: tag | relative_url }}" class="badge {{ css-class }}">{{ tag }}</a>
  {% endfor %}
{% endif %}
```
{% endraw %}

which only overwrites the default CSS class if the current tag is configured (in `_data/tags.yml`) to have a custom color. Be sure to make this change in `_layouts/post.html` as well.

We have another change to make in both `_layouts/post.html` and the list of posts. Tags with a space in their name (for example, {% include tag.html name="the blog" %}) have the URLs for their generated pages converted to kebab case (e.g., `/tags/the-blog`). However, all the links assume that the URLs use spaces (e.g., `/tags/the blog`). We solve this problem like so:

{% raw %}
```diff
-      <a href="{{ "/tags/" | append: tag | relative_url }}" class="badge {{ css-class }}">{{ tag }}</a>
+      {% capture link %}/tags/{{ tag | replace: " ", "-" }}{% endcapture %}
+      <a href="{{ link | relative_url }}" class="badge {{ css-class }}">{{ tag }}</a>
```
{% endraw %}

Looking at it now, I'm pretty sure it could have remained one line, but it would look like this:

{% raw %}
```liquid
<a href="{{ "/tags/" | append: tag | replace: " ", "-" | relative_url }}" class="badge {{ css-class }}">{{ tag }}</a>
```
{% endraw %}

and I think it's clearer what's happening the way I decided to do it.

And that's enough for a very basic version of tag pages! At this point, they're super basic --- just the tag name --- but they're there.

***

However, I didn't stop there. I made a couple more changes, which I'll list below (in no particular order[^2]).

[^2]: I'm actually doing this in `git diff` order, based on the order that my changes show up when running `git diff 80f6add 24d7deb` in my site repository. That might be alphabetical by filename?

First, the tag pages always used the name of the tag as defined in `_data/tags.yml`. This is always lowercase, because I want the tags to be lowercase when they appear on posts and in the post list. However, I might want them to _not_ appear in lowercase on their own tag page[^3]. One example of this is macOS, which should appear on tags as {% include tag.html name="macos" %} but should be correctly capitalized on its tag page. To make this happen, I used the `title_expr` field that the plugin allows me to set in `_config.yml`:

[^3]: It would probably  be a better idea to set the tags to their non-lowercase name in `_data/tags.yml` and convert them to lowercase on demand when desired, but the solution I have _works_, so I'm not going to touch it for now.

> `title_expr` is an optional Ruby expression used to generate the page title. The expression can reference fields of the data being read using the `record` hash (e.g., `record['first_name'] + "_" + record['last_name']`). _Optional, but if set, it overrides `title`._

(from [the plugin README](https://github.com/avillafiorita/jekyll-datapage_gen#usage)[^4])

[^4]: Note that this excerpt from the plugin README is actually incorrectly formatted on GitHub. It's a `.org` file, but apparently either GitHub or the `.org` spec doesn't allow code blocks inside italics, so the last `title` shows up as `~title~`

```diff
diff --git a/_config.yml b/_config.yml
index 5cf94a6..ec722e8 100644
--- a/_config.yml
+++ b/_config.yml
@@ -16,3 +17,12 @@ defaults:
       # layout: default

 #excerpt_separator: <!--more-->
 
 page_gen_dirs: false
 page_gen:
   - data: tags
     template: tag
     dir: tags
     name: name
+    title_expr: |-
+      record.fetch("displayname", record["name"])
```

Note the YAML "block scalar" (`|-`). This specific block scalar keeps newlines as newlines and chomps newlines at the end of the string. I use [this wonderful site](https://yaml-multiline.info/) for reference.

What this entry _does_ is use the `displayname` field for each entry in the `_data/tags.yml` file, falling back to the `name` field if `displayname` is not set. It sets the Liquid variable {% raw %}`{{ page.title }}`{% endraw %} but does not change the filename. If we update `_data/tags.yml` to add the `displayname` field for the macOS entry:

```yml
- name: nixos
  class: badge-nix
- name: the blog
- name: swift package manager
- name: macos
  displayname: macOS
  description: |-
    apple's desktop platform. my posts about it generally fall into one of two categories: tracking down bugs or doing complex configuration
- name: neovim
- name: shell
```

the tag page will now correctly use `macOS` instead of `macos`.

Notice the `description` field (again using a YAML block scalar). This is the next thing I added, which allows me to have a description for a tag that shows up on that tag page. Update the tag page to look like so:

{% raw %}
```liquid
---
layout: default
---
<div id="tag-info">
  <h2>{{ page.title }}</h2>
  {% if page.description %}
    <p>{{ page.description }}</p>
  {% endif %}
</div>
<hr/>
```
{% endraw %}

and it will show the tag description if it exists.

Next, I wanted to add the list of posts to each tag page. I realized, however, that I want essentially the same format as the main blog page, and it felt silly to recreate the wheel. So instead, I extracted the post list to a Jekyll "include". Remove this code from `blog.html`:

{% raw %}
```diff
diff --git a/blog.html b/blog.html
index d986f51..3d606b2 100644
--- a/blog.html
+++ b/blog.html
@@ -14,29 +14,7 @@ title: Samasaur1 | Blog
 <ul>
   {% for post in site.posts %}
     <li>
-      <h3>
-        <a href="{{ post.url }}">{{ post.title }}</a>&nbsp;
-        <span style="font-size: 50%;">
-          <span class="text-muted">{{ post.date | date_to_string }}</span>
-        </span>
-        <span style="font-size: 55%;">
-          {% if post.tags[0] %}
-            {% for tag in post.tags %}
-              {% assign css-class = "badge-secondary" %}
-              {% for site_tag in site.data.tags %}
-                {% if site_tag.name == tag %}
-                  {% if site_tag.class %}
-                    {% assign css-class = site_tag.class %}
-                  {% endif %}
-                {% endif %}
-              {% endfor %}
-              <a href="{{ "/tags/" | append: tag | relative_url }}" class="badge {{ css-class }}">{{ tag }}</a>
-            {% endfor %}
-          {% endif %}
-        </span>
-      </h3>
-
-      {{ post.excerpt }}
+      {% include post.html %}
     </li>
   {% endfor %}
 </ul>
```
{% endraw %}

and create `_includes/post.html`:

{% raw %}
```liquid
<{{ include.tag | default: "h3" }}>
  <a href="{{ post.url }}">{{ post.title }}</a>&nbsp;
  <span style="font-size: 50%;">
    <span class="text-muted">{{ post.date | date_to_string }}&nbsp;</span>
  </span>
  <span style="font-size: 55%;">
    {% if post.tags[0] %}
      {% for tag in post.tags %}
        {% assign css-class = "badge-secondary" %}
        {% for site_tag in site.data.tags %}
          {% if site_tag.name == tag %}
            {% if site_tag.class %}
              {% assign css-class = site_tag.class %}
            {% endif %}
          {% endif %}
        {% endfor %}
        {% capture link %}/tags/{{ tag | replace: " ", "-" }}{% endcapture %}
        <a href="{{ link | relative_url }}" class="badge {{ css-class }}">{{ tag }}</a>
      {% endfor %}
    {% endif %}
  </span>
</{{ include.tag | default: "h3" }}>

{{ post.excerpt }}
```
{% endraw %}

You may see that `blog.html` had each entry in an `<h3>` element, and that that is not the same in the include. Apparently, [Jekyll includes can be passed parameters](https://jekyllrb.com/docs/includes/#passing-parameters-to-includes), so this include accepts a parameter called `tag` that is the enclosing tag to use, and it uses [Liquid's `default` filter](https://shopify.github.io/liquid/filters/default/) to use `<h3>` when no tag is passed.

In addition to simplifying `blog.html`, this new include can be used on the tag pages. Update `_layouts/tag.html` to add the list of posts with that tag:

{% raw %}
```liquid
---
layout: default
---
<div id="tag-info">
  <h2>{{ page.title }}</h2>
  {% if page.description %}
    <p>{{ page.description }}</p>
  {% endif %}
</div>
<hr/>
<div id="tag-posts">
  <h2>recent posts:</h2>
  <ul>
    {% for post in site.posts %}
      {% if post.tags contains page._name %}
        <li>{% include post.html tag="h4" %}</li>
      {% endif %}
    {% endfor %}
  </ul>
</div>
```
{% endraw %}

I can't actually find any documentation on `page._name`, but I discovered it by temporarily putting {% raw %}`{{ page }}`{% endraw %} in `_layouts/tag.html`. It appears that `page.name` is, for example, `macos.html`, while `page._name` is `macos` --- which will match the tag name. Possibly it exists because `page.name` would originally have been set to the tag name (for the same reason that `page.description` is sourced from `_data/tags.yml`), but then `page.name` is overwritten by Jekyll, so its value is shifted to `page._name`? Just a theory, though.

Regardless, note how we iterate through every post, filtering them to only display the posts that include this tag, and then we use the new include we created, setting `tag` to `h4` to make them smaller than on the main blog page.

The final content change that I made was to remove the ugly "Posts By Tag" part of the main blog page. I wiped it out entirely and replaced it with:

{% raw %}
```liquid
<h2>Tags</h2>
<ul>
  {% for tag in site.tags %}
    {% assign css-class = "badge-secondary" %}
    {% for site_tag in site.data.tags %}
      {% if site_tag.name == tag[0] %}
        {% if site_tag.class %}
          {% assign css-class = site_tag.class %}
        {% endif %}
      {% endif %}
    {% endfor %}
    <li>
      {% capture link %}/tags/{{ tag[0] | replace: " ", "-" }}{% endcapture %}
      <a href="{{ link | relative_url }}" class="badge {{ css-class }}">{{ tag[0] }}</a>
      ({{ tag[1] | size }})
    </li>
  {% endfor %}
</ul>
```
{% endraw %}

which _does_ still list all the tags, but doesn't list their posts (since you can now click on them to see that!). It does, however, list the _number_ of posts for each tag, using {% raw %}`{{ tag[1] | size }}`{% endraw %}.

There were of course some stylistic changes that I haven't listed here (most notably in the tag page). If you're interested, you can run `git diff 80f6add 24d7deb` or [view the PR on GitHub](https://github.com/Samasaur1/samasaur1.github.io/pull/26).

Two final notes:

1. If you're using an RSS reader and are confused about these tags I'm talking about (since I don't believe my RSS feed is set up to use them), do check out this post on my site! I can't speak for all RSS readers, but the one I use at the moment (NetNewsWire) does not show syntax highlighting for code blocks, nor does it style tags correctly. (feel free to ignore me if you're fine with that, though).

2. In writing this post I did find another Jekyll plugin, <https://github.com/pattex/jekyll-tagging>. I haven't checked it out, but it might allow you to generated a page per entry in `site.tags`, rather than `site.data.tags`, which would let you skip the maintenance step I have to do, which is adding an entry to `_data/tags.yml` every time I use a new tag.
