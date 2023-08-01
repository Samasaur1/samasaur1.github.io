---
layout: post
title: 'Callouts have been added to the blog'
date: 2023-08-01 13:42 -0700
tags:
- the blog
- css
---
As you have probably already notcied, my blog now supports callouts (also sometimes called admonitions). They're a neat little feature that looks a little like a blockquote (especially on my blog). You can take a look at the Obsidian page for them [here](https://help.obsidian.md/Editing+and+formatting/Callouts), but on my blog, they look like this:

{:.callout.callout-info}
> ##### Callout title
> Callout contents.
> 
> Can be multiline, and _include_ **styling**. This callout is of type `info` (defined by me), which specifies the icon and coloration.

{:.callout.callout-note}
> ##### Callouts can be title-only (this one is of type `note`)

{:.callout.callout-error}
> or don't even need a title at all.
>
> If they don't have a title, though, they lose their icon (as you can see with this callout of type `error`).

Compare this to a blockquote:
> which looks like this

***

I originally added callouts because I needed to add a warning to [my post on adding a page for every tag]({% post_url 2023-07-20-a-page-for-every-tag %}), since I published it forgetting to make a note that the classic GitHub Pages deployment strategy didn't work with the plugin I added. Because I wanted to update the post quickly, I wrote the original callout using raw HTML and inline CSS styling:

```html
<blockquote style="border-left-color: red; background-color: #ffaaaa; padding-top: 0.5em; padding-bottom: 0.5em;">
    <h5><strong><img style="width: 2em;" src="/assets/images/error.svg"/>&nbsp;&nbsp;This plugin does not work using the classic GitHub Pages deployment strategy.</strong></h5>
    <p>Initially, GitHub Pages sites were built when changes were pushed to a specific branch. There are a number of limitations on this deployment model, most notably that GitHub limits the plugins that can be used. The plugin I am using in this post is not one of the supported plugins, so using it with the classic deployment strategy will not work properly.</p>
    <p>As of last year, GitHub also supports deploying GitHub Pages sites using GitHub Actions. However, sites that were already configured to use branch-based deployment, such as mine, were not automatically migrated. If this applies to you as well, and you would like to use plugins that are not supported by the classic deployment strategy, you will need to migrate to the GitHub Actions deployment strategy.</p>
    <p>See <a href="https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site">the GitHub documentation on publishing sources</a> for more information.</p>
</blockquote>
```
which renders like this:
<blockquote style="border-left-color: red; background-color: #ffaaaa; padding-top: 0.5em; padding-bottom: 0.5em;">
    <h5><strong><img style="width: 2em;" src="/assets/images/error.svg"/>&nbsp;&nbsp;This plugin does not work using the classic GitHub Pages deployment strategy.</strong></h5>
    <p>Initially, GitHub Pages sites were built when changes were pushed to a specific branch. There are a number of limitations on this deployment model, most notably that GitHub limits the plugins that can be used. The plugin I am using in this post is not one of the supported plugins, so using it with the classic deployment strategy will not work properly.</p>
    <p>As of last year, GitHub also supports deploying GitHub Pages sites using GitHub Actions. However, sites that were already configured to use branch-based deployment, such as mine, were not automatically migrated. If this applies to you as well, and you would like to use plugins that are not supported by the classic deployment strategy, you will need to migrate to the GitHub Actions deployment strategy.</p>
    <p>See <a href="https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site">the GitHub documentation on publishing sources</a> for more information.</p>
</blockquote>
This worked --- in that I liked how it looked --- but I craved the simplicity of Obsidian callouts, which let you simply do:

```
> [!error] Callout title
> Callout text
```
I didn't _quite_ get it that nice, because I was not willing to write a Jekyll plugin in Ruby, which seems like the only way to modify the Markdown parser, but I am now able to say:

```markdown
{:.callout.callout-error}
> ##### **This plugin does not work using the classic GitHub Pages deployment strategy**
> 
> Initially, GitHub Pages sites were built when changes were pushed to a specific branch. There are a number of limitations on this deployment model, most notably that GitHub limits the plugins that can be used. The plugin I am using in this post is not one of the supported plugins, so using it with the classic deployment strategy will not work properly.
> 
> As of last year, GitHub also supports deploying GitHub Pages sites using GitHub Actions. However, sites that were already configured to use branch-based deployment, such as mine, were not automatically migrated. If this applies to you as well, and you would like to use plugins that are not supported by the classic deployment strategy, you will need to migrate to the GitHub Actions deployment strategy.
> 
> See [the GitHub documentation on publishing sources](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) for more information.
```

which renders like this:

{:.callout.callout-error}
> ##### **This plugin does not work using the classic GitHub Pages deployment strategy**
> 
> Initially, GitHub Pages sites were built when changes were pushed to a specific branch. There are a number of limitations on this deployment model, most notably that GitHub limits the plugins that can be used. The plugin I am using in this post is not one of the supported plugins, so using it with the classic deployment strategy will not work properly.
> 
> As of last year, GitHub also supports deploying GitHub Pages sites using GitHub Actions. However, sites that were already configured to use branch-based deployment, such as mine, were not automatically migrated. If this applies to you as well, and you would like to use plugins that are not supported by the classic deployment strategy, you will need to migrate to the GitHub Actions deployment strategy.
> 
> 
> See [the GitHub documentation on publishing sources](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) for more information.

Note: at the time of writing, both versions of that error warning should appear identical. If the second one has changed, then I have reworked how callouts appear on my site.

This uses a non-standard feature of Markdown called ["inline attribute lists"](https://kramdown.gettalong.org/syntax.html#block-ials), which Kramdown (the default Jekyll markdown parser) supports. The `{:.callout.callout-error}` line at the beginning of the Markdown block quote adds the CSS classes `callout` and `callout-error` to that block quote. I styled `callout` and `callout-error` in `_sass/main.scss`:

```scss
blockquote.callout {
    padding-top: 0.5em;
    padding-bottom: 0.5em;
}
blockquote.callout.callout-error {
    border-left-color: red;
    background-color: #ffaaaa;
}
```

This looks great, but does not apply the icon. I wanted to be able to have the icon appear without having to put in it every time I wanted to use a callout. This is really what Jekyll markdown plugins are for, but as I said, I didn't want to write one. Instead I tried to add a child element to blockquote elements with these two CSS classes. However, this did not work, so instead, I added a `:before` CSS pseudoelement to the `h5` element in the blockquote:

```scss
blockquote.callout > h5 {
    margin-left: 2.25em;
    margin-bottom: 0.5em;
    line-height: 2em;
}
blockquote.callout > h5:before {
    content: "";
    background-size: cover;
    width: 2em;
    height: 2em;
    display: block;
    position: absolute;
    left: 4rem;
}
blockquote.callout.callout-error > h5:before {
    // https://www.svgrepo.com/svg/379925/alert-error
    background-image: url('/assets/images/error.svg');
}
```
This works pretty well. It'd be more of a concern if other people were using this technique to make callouts without understanding the underlying CSS, since if you forget to add an `h5` element, there will be no icon. In fact, as I've described it above, you can actually add multiple copies of the icon by adding multiple `h5` elements in the blockquote, since the CSS above applies to all `h5` elements that are direct children of blockquotes with the callout classes.

To prevent multiple uses of icons, we could just add the `:first-of-type` pseudoselector. However, I also want to prevent including the icon midway through the callout, so we can instead use `:first-child`, which carries the same "first" logic that prevents multiple icons, but also ensures that the icon is only displayed if the `h5` element is the first element in the blockquote.

So our final CSS looks like this:

```scss
blockquote.callout {
    padding-top: 0.5em;
    padding-bottom: 0.5em;
}
blockquote.callout > h5:first-child {
    margin-left: 2.25em;
    margin-bottom: 0.5em;
    line-height: 2em;
}
blockquote.callout > h5:first-child:before {
    content: "";
    background-size: cover;
    width: 2em;
    height: 2em;
    display: block;
    position: absolute;
    left: 4rem;
}
blockquote.callout.callout-error {
    border-left-color: red;
    background-color: #ffaaaa;
}
blockquote.callout.callout-error > h5:first-child:before {
    // https://www.svgrepo.com/svg/379925/alert-error
    background-image: url('/assets/images/error.svg');
}
blockquote.callout.callout-note {
    border-left-color: #fcba03;
    background-color: #ffddaa;
}
blockquote.callout.callout-note > h5:first-child:before {
    // https://www.svgrepo.com/svg/509175/note
    background-image: url('/assets/images/note.svg');
}
blockquote.callout.callout-info {
    border-left-color: #17a2b8;
    background-color: #aaffff;
}
blockquote.callout.callout-info > h5:first-child:before {
    // https://www.svgrepo.com/svg/458755/info-alt
    background-image: url('/assets/images/info.svg');
}
```

I'm very greatful to the wonderful [CSS Diner](https://flukeout.github.io/), without which writing these CSS selectors would be far too complex for me.

I may end up writing some sort of Jekyll hook that allows me to write callouts using `> [!callout-type]`, but the current state of them is good enough for me, at least right now.
