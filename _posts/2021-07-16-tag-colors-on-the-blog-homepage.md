---
layout: post
tags:
  - the blog
  - jekyll
---
Right now, when you're on a post, the tags (at least the ones that have colors) are correctly colored:

<img src="{{ "/assets/images/blog/post-title-with-colored-tag.png" | relative_url }}" alt="Post title with colored tag" width="100%"/>

However, when you look at that same post from the blog homepage, they're not colored:

<img src="{{ "/assets/images/blog/post-title-with-uncolored-tag.png" | relative_url }}" alt="Post title with uncolored tag" width="100%"/>

This is rather annoying, and seems like it should be relatively simple to fix. Let's get down to it.

First, we need to figure out where that `java` tag is being colorized in the first place. If we check `_layouts/post.html`, we find this:
{% raw %}
```liquid
{% for tag in page.tags %}
  {% assign css-class = "badge-info" %}
  {% for site_tag in site.data.tags %}
    {% if site_tag.name == tag %}
      {% assign css-class = site_tag.class %}
    {% endif %}
  {% endfor %}
  <a href="{{ "/tags/" | append: tag | relative_url }}" class="badge {{ css-class }}">{{ tag }}</a>
{% endfor %}
```
{% endraw %}
which seems to be using `badge-info` for all tags that aren't in `site.data.tags`; for those, it uses `site_tag.class` (`site_tag` being the tag in `site.data.tags` that matches the current tag on the post). If we look in `_data/tags.yml`, we find this:
```yaml
- name: swift
  class: badge-swift
- name: jekyll
  class: badge-danger
- name: java
  class: badge-java
```
which appears to be mapping these tags to CSS classes that already exist (I created the `badge-swift` and `badge-java` classes for the project langauge badges, while the `badge-danger` class comes with Bootstrap).

***

Now to figure out why these aren't being applied on the blog homepage. If we look on `blog.html`, we see this:
{% raw %}
```liquid
{% for tag in post.tags %}
  <a href="{{ "/tags/" | append: tag | relative_url }}" class="badge badge-info">{{ tag }}</a>
{% endfor %}
```
{% endraw %}
Seems like I just forgot to adjust the code here when I added colors in the first place. Changing that excerpt to this:
{% raw %}
```liquid
{% for tag in post.tags %}
  {% assign css-class = "badge-info" %}
  {% for site_tag in site.data.tags %}
    {% if site_tag.name == tag %}
      {% assign css-class = site_tag.class %}
    {% endif %}
  {% endfor %}
  <a href="{{ "/tags/" | append: tag | relative_url }}" class="badge {{ css-class }}">{{ tag }}</a>
{% endfor %}
```
{% endraw %}
and voilà!

<img src="{{ "/assets/images/blog/post-title-blog-homepage-with-colored-tag.png" | relative_url }}" alt="Post title with colored tag" width="100%"/>

***

But I think that we want the "Posts By Tag" section, even if it's unfinished, to also use these colors. For now, let's just convert these headings into their tag badges, which will use the colors as well. Heading back to `blog.html`:
{% raw %}
```liquid
<h2>Posts By Tag</h2>
{% for tag in site.tags %}
  <h4>{{ tag[0] }}</h4>
  <ul>
    {% for post in tag[1] %}
      <li><a href="{{ post.url }}">{{ post.title }}</a></li>
    {% endfor %}
  </ul>
{% endfor %}
```
```html
<h2>Posts By Tag</h2>
{% for tag in site.tags %}
  <h4>{{ tag[0] }}</h4>
  <ul>
    {% for post in tag[1] %}
      <li><a href="{{ post.url }}">{{ post.title }}</a></li>
    {% endfor %}
  </ul>
{% endfor %}
```
{% endraw %}
(still can't highlight more than one language at a time). Anyway, we see the {% raw %}`<h4>{{ tag[0] }}</h4>`{% endraw %} section, which is what we want to change. Doing the same thing we've just done, we get:
{% raw %}
```liquid
<h2>Posts By Tag</h2>
{% for tag in site.tags %}
  {% assign css-class = "badge-info" %}
  {% for site_tag in site.data.tags %}
    {% if site_tag.name == tag %}
      {% assign css-class = site_tag.class %}
    {% endif %}
  {% endfor %}
  <h4 class="badge {{ css-class }}">{{ tag[0] }}</h4>
  <ul>
    {% for post in tag[1] %}
      <li><a href="{{ post.url }}">{{ post.title }}</a></li>
    {% endfor %}
  </ul>
{% endfor %}
```
```html
<h2>Posts By Tag</h2>
{% for tag in site.tags %}
  {% assign css-class = "badge-info" %}
  {% for site_tag in site.data.tags %}
    {% if site_tag.name == tag %}
      {% assign css-class = site_tag.class %}
    {% endif %}
  {% endfor %}
  <h4 class="badge {{ css-class }}">{{ tag[0] }}</h4>
  <ul>
    {% for post in tag[1] %}
      <li><a href="{{ post.url }}">{{ post.title }}</a></li>
    {% endfor %}
  </ul>
{% endfor %}
```
{% endraw %}
This does **NOT** work. Here's why:
{% raw %}
<pre>
&lt;h2&gt;Posts By Tag&lt;/h2&gt;
{% for tag in site.tags %}
  {% assign css-class = "badge-info" %}
  {% for site_tag in site.data.tags %}
    {% if site_tag.name == <strong style="color: red;">tag</strong> %}
      {% assign css-class = site_tag.class %}
    {% endif %}
  {% endfor %}
  &lt;h4 class="badge {{ css-class }}"&gt;{{ <strong style="color: red;">tag[0]</strong> }}&lt;/h4&gt;
  &lt;ul&gt;
    {% for post in tag[1] %}
      &lt;li&gt;&lt;a href="{{ post.url }}"&gt;{{ post.title }}&lt;/a&gt;&lt;/li&gt;
    {% endfor %}
  &lt;/ul&gt;
{% endfor %}</pre>
{% endraw %}
In this case, `tag` is from `site.tags`, **not** `site.data.tags`. This means that it is provided by Jekyll, not me, and that it is an array with the first element being the tag name and the second being a list of posts with that tag. That's why the second use of tag (the one that I didn't just insert) is using `tag[0]` to show the tag name. So if we change to this:
{% raw %}
```liquid
<h2>Posts By Tag</h2>
{% for tag in site.tags %}
  {% assign css-class = "badge-info" %}
  {% for site_tag in site.data.tags %}
    {% if site_tag.name == tag[0] %}
      {% assign css-class = site_tag.class %}
    {% endif %}
  {% endfor %}
  <h4 class="badge {{ css-class }}">{{ tag[0] }}</h4>
  <ul>
    {% for post in tag[1] %}
      <li><a href="{{ post.url }}">{{ post.title }}</a></li>
    {% endfor %}
  </ul>
{% endfor %}
```
```html
<h2>Posts By Tag</h2>
{% for tag in site.tags %}
  {% assign css-class = "badge-info" %}
  {% for site_tag in site.data.tags %}
    {% if site_tag.name == tag[0] %}
      {% assign css-class = site_tag.class %}
    {% endif %}
  {% endfor %}
  <h4 class="badge {{ css-class }}">{{ tag[0] }}</h4>
  <ul>
    {% for post in tag[1] %}
      <li><a href="{{ post.url }}">{{ post.title }}</a></li>
    {% endfor %}
  </ul>
{% endfor %}
```
{% endraw %}
we get exactly what we want. Of course, they should also probably link to the tag pages, but as those don't exist yet, I'll just stick in a TODO and call it a success.
