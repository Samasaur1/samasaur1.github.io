---
layout: post
title: 'Reworking Tag Badges'
date: 2023-08-07 15:46 -0700
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

The Bootstrap badge classes did more than just that coloring. Obviously, the `.badge` class did a lot of styling, but we're just going to skip that since we can use it directly. The other styling done in the `.badge-<whatever>` classes, however, we need to replicate. I went digging through the Boostrap source code for the version I'm using (currently 4.5.3), and here's what I found:

```scss
@each $color, $value in $theme-colors {
  .badge-#{$color} {
    @include badge-variant($value);
  }
}
```
(from [`scss/_badge.scss`](https://github.com/twbs/bootstrap/blob/v4.5.3/scss/_badge.scss)[^badgecss])

[^badgecss]: This file also defines the styling on `.badge`, if you're curious

It looks like this is generating styling for each class in the `$theme-colors` dictionary. I don't really care what they have in there, as I can see that it defines a `.badge-<whatever>` by including `badge-variant`.

`badge-variant` is defined in [`scss/mixins/_badge.scss`](https://github.com/twbs/bootstrap/blob/v4.5.3/scss/mixins/_badge.scss):

```scss
@mixin badge-variant($bg) {
  color: color-yiq($bg);
  background-color: $bg;

  @at-root a#{&} {
    @include hover-focus() {
      color: color-yiq($bg);
      background-color: darken($bg, 10%);
    }

    &:focus,
    &.focus {
      outline: 0;
      box-shadow: 0 0 0 $badge-focus-width rgba($bg, .5);
    }
  }
}
```

As we can see, the `$bg` variable is the background color of the badge (which is the main color that we care about). The _foreground_ color --- the color of the text --- is defined by the `color-yiq` function. Bootstrap's [docs](https://getbootstrap.com/docs/4.0/getting-started/theming/) say:

> One additional function we include in Bootstrap is the color contrast function, `color-yiq`. It utilizes the [YIQ color space](https://en.wikipedia.org/wiki/YIQ) to automatically return a light (`#fff`) or dark (`#111`) contrast color based on the specified base color. This function is especially useful for mixins or loops where you’re generating multiple classes.

Essentially, this function determines whether to use white or black foreground text based on the background color. For example, the {% include tag.html name="python" %} tag uses a white foreground color, because using a black foreground color (as in <a href="/tags/python" class="badge badge-python" style="color: black;">python</a>) would make it harder to read, and for tags like {% include tag.html name="gradle" %}, it would be near-impossible (<a href="/tags/gradle" class="badge badge-gradle" style="color: black;">gradle</a>)

Using this function sounds better to me than manually specifying both foreground and background colors, so we'll remember to use this. Next, we look at the rest of `badge-variant`, and see that the badges are set to darken by 10% when hovered over or focused, but to not change the foreground text color[^hover-focus]. They're also doing something with focus, which I didn't really look into and decided to just copy as-is. This gives us:

[^hover-focus]: If you're curious, `hover-focus` is defined [here](https://github.com/twbs/bootstrap/blob/v4.5.3/scss/mixins/_hover.scss) as:

    ```scss
    @mixin hover-focus() {
      &:hover,
      &:focus {
        @content;
      }
    }
    ```

```scss
.badge-swift {
    $bg: #F05138;
    $fg: color-yiq($bg);
    background-color: $bg;
    color: $fg;

    @at-root a#{&} {
        &:hover, &:focus {
            color: $fg;
            background-color: darken($bg, 10%);
        }

        &:focus, &.focus {
            outline: 0;
            box-shadow: 0 0 0 .2rem rgba($bg, .5);
            // box-shadow: 0 0 0 $badge-focus-width rgba($bg, .5);
        }
    }
}
```

This looks great, but there are a few problems with it:

1. `color-yiq` doesn't work

    Remember when I said that Bootstrap defined the `color-yiq` function? Yeah, that means it isn't available to me by default. Theoretically you should be able to import some Bootstrap SCSS files to get access to them, but I didn't want to figure this out, so I just copied and pasted from the Bootstrap source:

    ```scss
    @function color-yiq($color, $dark: $yiq-text-dark, $light: $yiq-text-light) {
      $r: red($color);
      $g: green($color);
      $b: blue($color);

      $yiq: calc((($r * 299) + ($g * 587) + ($b * 114)) / 1000);

      @if ($yiq >= $yiq-contrasted-threshold) {
        @return $dark;
      } @else {
        @return $light;
      }
    }
    ```
    This in turn relied on some variables defined in Bootstrap, which I also found and copy-pasted:

    ```scss
    // Taken from Bootstrap 4.5.3
    $white:    #fff !default;
    $gray-100: #f8f9fa !default;
    $gray-200: #e9ecef !default;
    $gray-300: #dee2e6 !default;
    $gray-400: #ced4da !default;
    $gray-500: #adb5bd !default;
    $gray-600: #6c757d !default;
    $gray-700: #495057 !default;
    $gray-800: #343a40 !default;
    $gray-900: #212529 !default;
    $black:    #000 !default;

    // The yiq lightness value that determines when the lightness of color changes from "dark" to "light". Acceptable values are between 0 and 255.
    $yiq-contrasted-threshold:  150 !default;

    // Customize the light and dark text colors for use in our YIQ color contrast function.
    $yiq-text-dark:             $gray-900 !default;
    $yiq-text-light:            $white !default;
    ```

2. Looping over defined tags

    You'll notice that the example I gave above was for a specific tag, rather than looping over all the tags and generating them. I wanted to centralize all the definitions related to tags into `_data/tags.yml`, rather than some being defined there (name, description, etc) and some in a random CSS file (colors). In order to be able to do this, I wanted to be loop through tags with Jekyll, rather than via a SCSS loop. I changed the class definition to this:

    {% raw %}
    ```scss
    {% for tag in site.data.tags %}
        .badge-{{tag.name}} {
            $bg: #{{tag.color}};
            $fg: color-yiq($bg);
            background-color: $bg;
            color: $fg;

            @at-root a#{&} {
                &:hover, &:focus {
                    color: $fg;
                    background-color: darken($bg, 10%);
                }

                &:focus, &.focus {
                    outline: 0;
                    box-shadow: 0 0 0 .2rem rgba($bg, .5);
                    // box-shadow: 0 0 0 $badge-focus-width rgba($bg, .5);
                }
            }
        }
    {% endfor %}
    ```
    {% endraw %}

    This also required that I define tags' colors in `_data/tags.yml`, although I could also _remove_ the `class` keys from that file.

    When I was trying to find a place to put this, I ran into a couple issues. First, I tried putting it in `_sass/main.scss`, but that didn't work — the Liquid includes were not replaced before Sass tried to read the file, and so I got Sass errors. I think this problem was actually twofold — first, I don't think that Jekyll parses anything in `_sass/` at all, and second, I was including the `_sass/main.scss` file from another `.scss` file, so Sass again parsed it before Liquid did. Next, I tried to put it in either `/assets/css/badges.css` or `/assets/css/badges.scss` and include those from `/assets/css/styles.scss`, which is the only stylesheet of mine included from my HTML pages. However, I also got SCSS errors when doing that. Eventually I just moved the Jekyll loop into `/assets/css/styles.scss`, because that's the only SCSS file of mine that's processed by Jekyll before it's processed by SCSS.[^bad]

    [^bad]: What I'm really learning from this is that my site's CSS is poorly architectured

3. Tags with the default badge style

    I also have some tags where I haven't customized their color, and I want them to use the default tag style for my blog (`badge-info`). To handle this, I simply added a check for `tag.color` before creating the CSS class (and while I was at it, also allowed overriding the auto-computed foreground color):

    {% raw %}
    ```scss
    {% for tag in site.data.tags %}
        {% if tag.color %}
            .badge-{{tag.name}} {
                $bg: #{{tag.color}};
                {% if tag.override_foreground_color %}
                    $fg: #{{tag.override_foreground_color}};
                {% else %}
                    $fg: color-yiq($bg);
                {% endif %}
                background-color: $bg;
                color: $fg;

                @at-root a#{&} {
                    &:hover, &:focus {
                        color: $fg;
                        background-color: darken($bg, 10%);
                    }

                    &:focus, &.focus {
                        outline: 0;
                        box-shadow: 0 0 0 .2rem rgba($bg, .5);
                        // box-shadow: 0 0 0 $badge-focus-width rgba($bg, .5);
                    }
                }
            }
        {% endif %}
    {% endfor %}
    ```
    {% endraw %}

I also had to update the tag include. It went from:

{% raw %}
```liquid
{%- for tag in site.data.tags %}
    {%if tag.name == include.name %}
        {% assign css-class = "badge-info" %}
        {% if tag.class %}
            {% assign css-class = tag.class %}
        {% endif %}
        {% capture link %}/tags/{{ tag.name | replace: " ", "-" }}{% endcapture %}
        <a href="{{ link | relative_url }}" class="badge {{ css-class }}">{{ tag.name }}</a>
    {% endif %}
{% endfor -%}
```
{% endraw %}

to:

{% raw %}
```liquid
{%- for tag in site.data.tags %}
    {%if tag.name == include.name %}
        {% assign css-class = "badge-info" %}
        {% if tag.color %}
            {% assign css-class = "badge-" | append: tag.name %}
        {% endif %}
        {% capture link %}/tags/{{ tag.name | replace: " ", "-" }}{% endcapture %}
        <a href="{{ link | relative_url }}" class="badge {{ css-class }}">{{ tag.name }}</a>
    {% endif %}
{% endfor -%}
```
{% endraw %}

(spacing added for clarity)

This was essentially just changing `tag.class` to `tag.color` or `"badge-" | append: tag.name`, depending on the context. And now all the tag badges are consistent!
