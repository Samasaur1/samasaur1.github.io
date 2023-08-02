---
layout: post
title: 'Reworking Tag Badges'
# date: 
tags:
- the blog
- jekyll
- css
- scss
---
Up until just recently, you may have noticed a curious phenomenon about tag badges on my blog. Some tags, such as {% include tag.html name="jekyll" %}, would have their background color darken on hover, but keep the text the same, while others, such as {% include tag.html name="swift" %}, would keep their background color the same, while the text turned blue like links do[^fixed]. The key factor that affected whether or not they would exhibit this behavior was whether they used a CSS class that I defined, or one that was defined in Bootstrap itself. The {% include tag.html name="jekyll" %} tag, for example, was using the Bootstrap `badge-danger` class, while the {% include tag.html name="swift" %} tag was using a custom class. I wanted all the tag badges to behave like the ones defined by Bootstrap (darken background and leave text alone), so I decided to investigate.

[^fixed]: Of course, now that I've fixed the problem, it's not visible.

The custom classes were straightforward, especially since I was the one who wrote them. They all looked like this:

```css
.badge-swift {
    background-color: #F05138;
    color: #ffffff;
}
```

and since I tagged each badge with both `badge` and `badge-swift` (or the corresponding CSS class for that tag), they would turn out mostly fine. This is because Bootstrap deliberately puts most of the styling in the `.badge` class, so that that styling doesn't need to be repeated.

The Bootstrap 
