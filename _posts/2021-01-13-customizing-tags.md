---
layout: post
title: 'Customizing Tags'
date: 2021-01-13 12:32 -0500
tags:
  - the blog
  - jekyll
---
Today we're taking a look at the tags on posts, and allowing me to customize them. The one specific goal we have in mind is making language tags that match the language color on GitHub and on the [projects page]({{ "/projects" | relative_url }}).

To start, let's take a look at the post layout before this change ([on GitHub](https://github.com/Samasaur1/samasaur1.github.io/blob/473bf355327ff96eddeaa6c94862bfdf134e80c7/_layouts/post.html)):

{% raw %}
```
---
layout: default
---
<div id="post-main-content">
<h1 class="mb-0 pb-0">{{ page.title }}</h1>
<p class="mt-0 pt-0 text-muted">
{{ page.date | date_to_string }}
  {% if page.tags[0] %}
    &nbsp;&nbsp;
    {% for tag in page.tags %}
      <a href="{{ "/tags/" | append: tag | relative_url }}" class="badge badge-info">{{ tag }}</a>
      {% comment %}{% unless forloop.last %}, {% endunless %}{% endcomment %}
    {% endfor %}
  {% endif %}
</p>
<hr style="border: 1px solid;"/>
{{ content }}
</div>
```
{% endraw %}

I can't highlight all the langauges appearing in this excerpt (for some reason), so I'll highlight different bits. Note the HTML layout:

{% raw %}
```html
---
layout: default
---
<div id="post-main-content">
<h1 class="mb-0 pb-0">{{ page.title }}</h1>
<p class="mt-0 pt-0 text-muted">
{{ page.date | date_to_string }}
  {% if page.tags[0] %}
    &nbsp;&nbsp;
    {% for tag in page.tags %}
      <a href="{{ "/tags/" | append: tag | relative_url }}" class="badge badge-info">{{ tag }}</a>
      {% comment %}{% unless forloop.last %}, {% endunless %}{% endcomment %}
    {% endfor %}
  {% endif %}
</p>
<hr style="border: 1px solid;"/>
{{ content }}
</div>
```
{% endraw %}

`post-main-content` provides padding for the post div. The `h1` and `p` are the title and date, with Bootstrap classes to put them closer together. We have the Liquid loop for the tags, and then after closing the `<p>` tag, we have a styled `<hr>` that separates the title & tags from the content.

If we take a look at the Liquid-highlighted version:

{% raw %}
```liquid
---
layout: default
---
<div id="post-main-content">
<h1 class="mb-0 pb-0">{{ page.title }}</h1>
<p class="mt-0 pt-0 text-muted">
{{ page.date | date_to_string }}
  {% if page.tags[0] %}
    &nbsp;&nbsp;
    {% for tag in page.tags %}
      <a href="{{ "/tags/" | append: tag | relative_url }}" class="badge badge-info">{{ tag }}</a>
      {% comment %}{% unless forloop.last %}, {% endunless %}{% endcomment %}
    {% endfor %}
  {% endif %}
</p>
<hr style="border: 1px solid;"/>
{{ content }}
</div>
```
{% endraw %}

we see where the variables are inserted, and a few things worth noting specifically. First, note the {% raw %}`{% if page.tags[0] %}`{% endraw %}. This makes sure that we don't produce anything if the post has no tags. Because we're reading from YAML, this is apparently the best way to check if there are any tags. We add `&nbsp;`s for spacing, and then loop through the tags, linking each one to its own URL (that goes nowhere) and applying the `badge-info` CSS class. That's what provides the teal coloring.

You may also notice the liquid-commented section that would put commas between the tags — that's only there as a historical vestige, and now it's on GitHub, so we're removing it. Also, the {% raw %}`{{ content }}`{% endraw %} is replaced with the content of each post.

***

So that's what we *had*. Now, what do we want? I wanted to be able to customize the colors of some tags, while keeping a default color as well. My instinct to solve this was to create a Jekyll data file. So I created `_data/tags.yml`, with this content:
```yml
- name: swift
  class: badge-swift
```
The name is the tag name, and the class is the CSS class to apply. Because I'm using Bootstrap, if I apply `badge badge-info` to something it looks like this:
```html
<span class="badge badge-info">example</span>
```
<span class="badge badge-info">example</span>

When I was working on the project list, I created a few `badge-*` classes of my own to mimic language colors on GitHub (as the Bootstrap `badge-*` classes are only coloring):
```scss
// language colors from https://github.com/ozh/github-colors
.badge-swift {
  background-color: #ffac45;
  color: #111111;
}
.badge-python {
  background-color: #3572A5;
  color: #ffffff;
}
.badge-java {
  background-color: #b07219;
  color: #ffffff;
}
.badge-kotlin {
  background-color: #F18E33;
  color: #ffffff;
}
```

So `badge-swift` actually already works. For example:
```html
<span class="badge badge-swift">Swift</span>
```
<span class="badge badge-swift">Swift</span>

We just need to take this data file and use it when "rendering" tags (I don't actually *do* the rendering, that's the user's browser, but it feels like the right word).

***

One of the benefits of using Jekyll is that it's very easy for me to run a local version of the site to test it. In my cloned version of the repository, I can run <kbd>bundle exec jekyll serve</kbd>,[^1] go to `localhost:4000`, *e voilá*. So I could stick various Liquid/Jekyll tags/filters/variables and see their output.

The first thing I did was stick {% raw %}`{{ site.data.tags }}`{% endraw %} right after the two `&nbsp;`s, showing me what was in that variable. At this point in the process (where we've just created the tags data file), it outputs this:
```ruby
{"name"=>"swift", "class"=>"badge-swift"}
```
Currently (i.e., as of the most recent update to the site), it outputs this:
```ruby
{{ site.data.tags }}{% comment %}This will output the most recently updated site's tags, as it's not surrounded by liquid raw tags{% endcomment %}
```
That shows just what we expected: a dictionary(/map/object). Keep in mind that this will be an array of dictionaries, but there's only one element right now.

I knew that whatever we did, it would need to be *inside* the Liquid for loop, because we need to process for each tag on the article. My first thought was to check if `site.data.tags` contained `tag` (recall that `tag` is from the loop):
{% raw %}
```liquid
{% for tag in page.tags %}
  <a href="{{ "/tags/" | append: tag | relative_url }}" class="badge badge-info">{{ tag }}</a>
{% endfor %}
```
{% endraw %}

Using the Liquid `contains` filter/tag (I really don't know what they're called) is false when used like so:
{% raw %}
```liquid
{% if site.data.tags contains tag %}true{% else %}false{% endif %}
```
{% endraw %}
even if we add the Swift tag, which makes sense if you think about it, because `site.data.tags` contains one object which has a `name` field matching our tag, but doesn't match directly. I tried the following:
{% raw %}
```liquid
{% if site.data.tags | map: "name" contains tag %}true{% else %}false{% endif %}
```
{% endraw %}
This was true for both. I'm still not sure *why* this said true for both, but it doesn't really matter to me — I just took a different approach.

Instead of using `contains`, I just looped over `site.data.tags` like so:
{% raw %}
```liquid
{% for tag in page.tags %}
  {% for site_tag in site.data.tags %}
    {% if site_tag.name == tag %}
      {{ site_tag.class }}
    {% endif %}
  {% endfor %}
  <a href="{{ "/tags/" | append: tag | relative_url }}" class="badge badge-info">{{ tag }}</a>
{% endfor %}
```
{% endraw %}
Recall that the outer for loop already existed. This produces the CSS class we want, but not in the right place. I simply assigned it to a Liquid variable:
{% raw %}
```liquid
{% for tag in page.tags %}
  {% for site_tag in site.data.tags %}
    {% if site_tag.name == tag %}
      {% assign css-class = site_tag.class %}
    {% endif %}
  {% endfor %}
  {{ css-class }}
  <a href="{{ "/tags/" | append: tag | relative_url }}" class="badge badge-info">{{ tag }}</a>
{% endfor %}
```
{% endraw %}
This produces the same output (because I'm outputting the variable), but I could easily put it in the `<a>` tag. Not yet, though — what happens for non-matching tags? I said I wanted a default.

My solution was just to predefine `css-class`, like so:
{% raw %}
```liquid
{% for tag in page.tags %}
  {% assign css-class = "badge-info" %}
  {% for site_tag in site.data.tags %}
    {% if site_tag.name == tag %}
      {% assign css-class = site_tag.class %}
    {% endif %}
  {% endfor %}
  {{ css-class }}
  <a href="{{ "/tags/" | append: tag | relative_url }}" class="badge badge-info">{{ tag }}</a>
{% endfor %}
```
{% endraw %}
This now has a default but can be overwritten — just like we wanted. The only remaining step is to use it as a CSS class, by replacing the `<a>` tag line with this:
{% raw %}
```liquid
<a href="{{ "/tags/" | append: tag | relative_url }}" class="badge {{ css-class }}">{{ tag }}</a>
```
{% endraw %}
and remove the lone {% raw %}`{{ css-class }}`{% endraw %} line, resulting in this `_layouts/post.html` file:
{% raw %}
```
---
layout: default
---
<div id="post-main-content">
<h1 class="mb-0 pb-0">{{ page.title }}</h1>
<p class="mt-0 pt-0 text-muted">
{{ page.date | date_to_string }}
  {% if page.tags[0] %}
    &nbsp;&nbsp;
    {% for tag in page.tags %}
      {% assign css-class = "badge-info" %}
      {% for site_tag in site.data.tags %}
        {% if site_tag.name == tag %}
          {% assign css-class = site_tag.class %}
        {% endif %}
      {% endfor %}
      <a href="{{ "/tags/" | append: tag | relative_url }}" class="badge {{ css-class }}">{{ tag }}</a>
    {% endfor %}
  {% endif %}
</p>
<hr style="border: 1px solid;"/>
{{ content }}
</div>
```
```html
---
layout: default
---
<div id="post-main-content">
<h1 class="mb-0 pb-0">{{ page.title }}</h1>
<p class="mt-0 pt-0 text-muted">
{{ page.date | date_to_string }}
  {% if page.tags[0] %}
    &nbsp;&nbsp;
    {% for tag in page.tags %}
      {% assign css-class = "badge-info" %}
      {% for site_tag in site.data.tags %}
        {% if site_tag.name == tag %}
          {% assign css-class = site_tag.class %}
        {% endif %}
      {% endfor %}
      <a href="{{ "/tags/" | append: tag | relative_url }}" class="badge {{ css-class }}">{{ tag }}</a>
    {% endfor %}
  {% endif %}
</p>
<hr style="border: 1px solid;"/>
{{ content }}
</div>
```
```liquid
---
layout: default
---
<div id="post-main-content">
<h1 class="mb-0 pb-0">{{ page.title }}</h1>
<p class="mt-0 pt-0 text-muted">
{{ page.date | date_to_string }}
  {% if page.tags[0] %}
    &nbsp;&nbsp;
    {% for tag in page.tags %}
      {% assign css-class = "badge-info" %}
      {% for site_tag in site.data.tags %}
        {% if site_tag.name == tag %}
          {% assign css-class = site_tag.class %}
        {% endif %}
      {% endfor %}
      <a href="{{ "/tags/" | append: tag | relative_url }}" class="badge {{ css-class }}">{{ tag }}</a>
    {% endfor %}
  {% endif %}
</p>
<hr style="border: 1px solid;"/>
{{ content }}
</div>
```
{% endraw %}
or as an image, to see it all colored at once (I really need to figure that out):
<img src="{{ "/assets/images/blog/colorized-post-html-customizing-tags.png" | relative_url }}" alt="colorized image of the above code" width="100%"/>
<!-- ![colorized image of the above code]({{ "/assets/images/blog/colorized-post-html-customizing-tags.png" | relative_url }}) -->

I've been testing along the way with the `swift` tag on thie article, but it's not about Swift, so I'm going to take it off. This does unfortunately mean that I won't have an example as of now, but alas!

There are a few things still left to do:
* Blog tags still all show up in "info teal" on the main blog page. The code we've just written could likely be moved there with little difficulty.
* Customization of tag pages / tag descriptions?

Unitl next time!

***

[^1]: If you want it to be accessible on more than just that computer (e.g., for testing on mobile devices), I found this to work: <kbd>bundle exec jekyll serve --host 0.0.0.0</kbd>. You'd then go to `[your computer's local IP address]:4000` on the mobile device.
