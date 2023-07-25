---
layout: post
title: 'Creating a tag include'
date: 2023-07-25 09:19 -0700
tags:
- the blog
- jekyll
---
As I said in [my post about tag pages]({% post_url 2023-07-20-a-page-for-every-tag %}), Jekyll allows you to have includes that accept parameters. In that post, I created an include for blog posts in a list. You may also remember that that article included examples of tags (such as {% include tag.html name="the blog" %}). The way that I did that was using another include, one that I created while writing that post and will explain in this post. After all, it's much easier to say:

{% raw %}
```liquid
{% include tag.html name="the blog" %}
```
than
```liquid
{% for tag in site.data.tags %}{%if tag.name == "the blog" %}{% assign css-class = "badge-info" %}{% if tag.class %}{% assign css-class = tag.class %}{% endif %}{% capture link %}/tags/{{ tag.name | replace: " ", "-" }}{% endcapture %}<a href="{{ link | relative_url }}" class="badge {{ css-class }}">{{ tag.name }}</a>{% endif %}{% endfor %}
```
{% endraw %}

This was mostly a straightforward process, so I won't go into too much detail. I created `_includes/tag.html` with these contents:
{% raw %}
```liquid
{% for tag in site.data.tags %}{%if tag.name == include.name %}{% assign css-class = "badge-info" %}{% if tag.class %}{% assign css-class = tag.class %}{% endif %}{% capture link %}/tags/{{ tag.name | replace: " ", "-" }}{% endcapture %}<a href="{{ link | relative_url }}" class="badge {{ css-class }}">{{ tag.name }}</a>{% endif %}{% endfor %}
```
{% endraw %}
Note that I am expecting the include "parameter" to be `name`, as you can see since I compare `tag.name` to `include.name`.

Now that I had the include, I could replace every occurrence of this:
{% raw %}
```liquid
{% capture link %}/tags/{{ tag | replace: " ", "-" }}{% endcapture %}
<a href="{{ link | relative_url }}" class="badge {{ css-class }}">{{ tag }}</a>
```
{% endraw %}
with this:
{% raw %}
```liquid
{% include tag.html name=tag %}
```
{% endraw %}
This worked for `_layouts/post.html` and `_includes/post.html`, but `blog.html` looked like this:

{% raw %}
```liquid
{% capture link %}/tags/{{ tag[0] | replace: " ", "-" }}{% endcapture %}
<a href="{{ link | relative_url }}" class="badge {{ css-class }}">{{ tag[0] }}</a>
```
{% endraw %}
and saying {% raw %}`{% include tag.html name=tag[0] %}`{% endraw %} caused errors, so I replaced it with this:
{% raw %}
```liquid
{% assign t = tag[0] %}
{% include tag.html name=t %}
```
{% endraw %}
There was one final problem, and that was spacing around the included tag. It would look something like this: (blah blah blah&nbsp;&nbsp;{% include tag.html name="the blog" %} ). To fix this, I read [this documentation page](https://shopify.github.io/liquid/basics/whitespace/) and changed the include to look like this:

{% raw %}
```liquid
{%- for tag in site.data.tags %}{%if tag.name == include.name %}{% assign css-class = "badge-info" %}{% if tag.class %}{% assign css-class = tag.class %}{% endif %}{% capture link %}/tags/{{ tag.name | replace: " ", "-" }}{% endcapture %}<a href="{{ link | relative_url }}" class="badge {{ css-class }}">{{ tag.name }}</a>{% endif %}{% endfor -%}
```
{% endraw %}
(note the {% raw %}`{%-` and `-%}`{% endraw %} at the start and end), which fixed the issue.
