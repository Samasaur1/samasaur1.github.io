---
layout: post
title: 'Adding Comments to the Blog'
date: 2023-07-28 11:26 -0700
tags:
- the blog
- jekyll
- rust
- nixos
---
If you're browsing my blog via the website and not solely through the RSS feed, you may have noticed something new at the bottom of every post. That's right, the blog now supports comments! While that's as simple as a toggle checkbox in some sites, due to this blog being a "static site", it was much more involved.

Let's compare the process for "dynamic" sites vs the process that a comment on this site goes through:

On a dynamic site, when the comment form is submitted, the form `action` is another page on the same site, one that runs a server-side langauge (such as a PHP page). This page reads the form fields, saves the comment to disk (in a database, perhaps, or as separate files, or some other method), and then either displays a page or redirects the user. This means that, if the site has no comment moderation enabled, the comment can be shown immediately, to everyone viewing the page.

On my static site, I can neither run server-side code, nor can I edit or save files. So instead, the form `action` reaches out to another server I am running, which uses the GitHub API to create a new branch which makes no changes other than adding the comment, and then opens a pull request with that change. I then get a notification, and can go look at the comment, deciding whether or not to approve it. If I do approve it (merging the pull request), the site rebuilds, displaying the comment.

{:.callout.callout-note}
> ##### Note
> This is not really a maintainable moderation strategy at scale. If the number of comments gets too large, I could modify my server to perform automated moderation before either making the PR or adding the comment itself. For the moment, though, I am fine dealing with the pull requests.
> 
> Even a manageable amount of comments for me to moderate could put a fair amount of stress on GitHub Actions, if I were to merge them in one by one (since the site would be rebuilt for every comment commit to `main`, even though they would quickly be superseded by the next merge. To avoid this issue, I can perform these merges locally to merge multiple branches at once by doing an "octopus merge", or I can merge them and put `[skip ci]` in the title to not rebuild until the last one is merged.

Okay, so now we have a general overview of the process. On to the implementation details. First, I added functionality to the Jekyll site to display the comments, as well as providing a form to submit new comments. For this part, I owe a great deal to [Damien Guard's GitHub repo](https://github.com/damieng/jekyll-blog-comments) which provides three Jekyll includes and instructions for using them. For the most part, I used these includes directly without making any changes of my own. They are as follows:

`_includes/comment.html`
: which displays one comment

`_includes/comments.html`
: which displays all the comments for a post

`_includes/comment-new.html`
: which provides the new comment form

First, let's look at `_includes/comment.html`:

{% raw %}
```liquid
{% if comment.url %}
<a href="{{ comment.url }}" rel="nofollow">
  <img alt="Gravatar for {{ comment.name | xml_escape }}" src="https://secure.gravatar.com/avatar/{{ comment.gravatar }}?s=64&amp;d=retro&amp;r=pg" srcset="https://secure.gravatar.com/avatar/{{ comment.gravatar }}?s=128&amp;d=retro&amp;r=pg 2x" class="avatar avatar-64 photo" height="64" width="64">
</a>
{% else %}
<img alt="Gravatar for {{ comment.name | xml_escape }}" src="https://secure.gravatar.com/avatar/{{ comment.gravatar }}?s=64&amp;d=retro&amp;r=pg" srcset="https://secure.gravatar.com/avatar/{{ comment.gravatar }}?s=128&amp;d=retro&amp;r=pg 2x" class="avatar avatar-64 photo" height="64" width="64">
{% endif %}

<blockquote id="{{ comment.id }}">
  <div class="comment-body">{{ comment.message | escape | markdownify }}</div>
  <cite>
    {% if comment.url %}
      <a href="{{ comment.url }}" rel="nofollow">{{ comment.name | xml_escape }}</a>&nbsp;{% if comment.url == site.url %}<span class="badge badge-info" style="font-style: normal;">Author</span>{% endif %}
    {% else %}
      {{ comment.name | xml_escape }}
    {% endif %}
    &ndash;
    <span class="text-muted" title="{{ comment.date | date_to_rfc822 }}">
      {{ comment.date | date: '%B' }}
      {% assign d = comment.date | date: "%-d" %}
      {% case d %}
        {% when '1' or '21' or '31' %}{{d}}st,
        {% when '2' or '22' %}{{d}}nd,
        {% when '3' or '23' %}{{d}}rd,
        {% else %}{{d}}th,
      {% endcase %}
      {{ comment.date | date: '%Y' }}
      {% comment %}
        <!-- TODO: time -->
        at
        {{ comment.date | date: '%Y' }}
      {% endcomment %}
    </span>
  </cite>
</blockquote>
```
{% endraw %}

I added the `escape` filter to `<div class="comment-body">{{ comment.message | escape | markdownify }}</div>`, because it was allowing things like `<script>alert("hi")</script>`. Although I'd rather be over-safe than under-safe, I think I will eventually change this back, because it also escapes the `>` in Markdown quotes, even though that is safe when not a full HTML tag[^sanitization]. I also added the `&nbsp;{% if comment.url == site.url %}<span class="badge badge-info" style="font-style: normal;">Author</span>{% endif %}`, which displays an <span class="badge badge-info">Author</span> badge on comments by the post author (me!). I am planning to keep this badge around, but I may migrate it to a CSS pseudoelement, and may change author checking back to being by email rather than by website[^emailvswebsite]. I also added the TODO about showing the comment time. The reason I didn't implement this is because I want it to also support the optional conversion to the local time zone that I'm working on in another branch right now.

[^sanitization]: I don't  want to do this client-side, because malicious users can easy bypass that. I think the best approach is to do sanitization in the server that accepts the form submissions, before it creates the pull requests.
[^emailvswebsite]: I changed this originally because when it checked by email, I had to have my email in the `author` definition, which puts it in the RSS feed, and at the time that was not something I wanted.

Next, `_includes/comments.html`:

{% raw %}
```liquid
{% capture default_slug %}{{ page.slug | default: (page.title | slugify) }}{% endcapture %}
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
  </ol>
</div>
{% endif %}
{% if page.commenting == 'open' %}
{% include comment-new.html %}
{% endif %}
```
{% endraw %}

The only change I made here was to again check for the post author by site rather than by email, which again will probably change back at some point.

Finally, `_includes/comment-new.html`:

{% raw %}
```html
<h3>Respond to this</h3>
<form action="/fake" method="post" id="commentform" class="form-horizontal">
  <fieldset id="commentfields">
    <input name="redirect" type="hidden" value="{{ site.url }}{{ page.url }}#post-comments">
    <input name="post_id" type="hidden" value="{{ slug }}">
    <input name="comment-site" type="hidden" value="{{ site.url }}">
    <textarea style="width: 100%;" name="message" id="message" placeholder="Continue the discussion."></textarea>

    <label for="name">Name/alias <span>(Required, displayed)</span></label>
    <input type="text" name="name" id="name" placeholder="Name" />

    <label for="email">Email <span>(Required, not shown)</span></label>
    <input type="text" name="email" id="email" placeholder="myemail@somedomain.com" />

    <label for="url">Website <span>(Optional, displayed)</span></label>
    <input type="text" name="url" id="url" placeholder="https://mywebsite.com" />

    <button onclick="setupForm()" type="button" class="btn btn-primary" id="commentbutton">Leave response</button>
  </fieldset>
</form>
<script>
    function setupForm() {
      var status = document.getElementById('commentstatus')
      status.innerText = ''

      var requiredIds = [ 'message', 'email', 'name']
      var missing = requiredIds.filter(id => document.getElementById(id).value.length < 3)
      if (missing.length > 0) {
        status.innerText = 'Some required fields are missing - (' + missing.join(', ') + ')'
        return
      }

      var button = document.getElementById('commentbutton')
      if (button.innerText != 'Confirm comment') {
        button.innerText = 'Confirm comment'
        return
      }

      var form = document.getElementById('commentform')
      form.action = '{{ site.comments.receiver }}'
      button.innerText = 'Posting...'
      button.disabled = true
      form.submit()
      var fields = document.getElementById('commentfields')
      fields.disabled = true
    }
  </script>
<div id="commentstatus" style="clear:both" class="status"></div>
```
{% endraw %}

The only changes that I made here were to the `<input name="redirect" type="hidden" value="{{ site.url }}{{ page.url }}#post-comments">` line, which previously looked like `<input name="redirect" type="hidden" value="{{ site.url }}/thanks">`, and to add `style="width: 100%"` to the `textarea`. These changes made sure the user was redirected to an actual page on my site and made the comment area look a little better. They're both temporary changes, I think, because I want to make sure to tell visitors that their comment needs to wait for approval, and I want to style the comment form nicely.

And then I had to make changes to `_layouts/post.html` to actually include the comments:

{% raw %}
```diff
diff --git a/_layouts/post.html b/_layouts/post.html
index fe33a2d..4d5e873 100644
--- a/_layouts/post.html
+++ b/_layouts/post.html
@@ -41,4 +41,8 @@ layout: default
   </p>
   <hr style="border: 1px solid;"/>
   {{ content }}
+  <hr style="border: 1px solid;"/>
+  <div id="post-comments">
+  {% include comments.html %}
+  </div>
 </div>
```
{% endraw %}

which you can see [at the bottom of this page](#post-comments). And also make the following changes to `_config.yml`:

```diff
diff --git a/_config.yml b/_config.yml
index 194442a..7f02e38 100644
--- a/_config.yml
+++ b/_config.yml
@@ -15,6 +15,7 @@ defaults:
     values:
       author: sam
       # layout: default
+      commenting: open

 #excerpt_separator: <!--more-->

@@ -31,3 +32,8 @@ timezone: America/Los_Angeles
 url: https://samasaur1.github.io
 title: samasaur1.github.io
 description: samasaur1.github.io
+
+emptyArray: []
+
+comments:
+  receiver: https://comments.blog.samasaur.com
```

{:.callout.callout-note}
> ##### Changing `_config.yml` while running `jekyll serve`
> The only place I can find a mention of it is on [the tutorial page on collections](https://jekyllrb.com/docs/step-by-step/09-collections/), but **`jekyll serve` does not reload changes made to `_config.yml` automatically**. If you're like me and run `bundle exec jekyll serve --draft --host 0.0.0.0` once at the beginning of a session working on your site and then forget about it, and are then confused why things aren't working, try restarting the jekyll serve command[^callouts].

[^callouts]: Noticing a lot of callouts in this post? I just set them up (post upcoming) and I'm having fun with them! They probably don't appear properly in your RSS reader, though.

***

Okay, so the Jekyll part is done. Now we need to have a server that accepts these form submissions and turns them into GitHub pull requests containing new comment files. There's a service called [Staticman](https://staticman.net) that can do this for you, or there is [an Azure Function App by the same person who made the includes](https://github.com/Azure-Functions/jekyll-blog-comments), but I decided to create my own. I wanted something that would be fast and have low resource usage (since I was planning to run it on one of my Mac Minis), so I decided to do it in Rust. Knowing that I wanted it to run on one of the Mac Minis, I decided to have it set up to run on Nix from the get-go.

The [initial commit](https://github.com/Samasaur1/jekyll-comments/commit/5e112fa99be34c2f90ab0b3266ce7cd04727e708) of the server I ended up writing is an amalgamation of many different things. I generated a new Cargo project with CLion, added the `flake.nix` from [Remote-Text/remote-text-server@86e0caa](https://github.com/Remote-Text/remote-text-server/commit/86e0caaeb83f35dfccd749bb4741b8b5753ac2b7) (itself copied from RssBot with minor changes), copied the `default.nix` from remote-text-server (itself generated by running `nix --max-jobs 16 run github:nix-community/nix-init -- -u "https://github.com/Remote-Text/remote-text-server" default.nix`), removed remote-text-server's dependencies from `default.nix`, recomputed the hash of `Cargo.lock` by running `nix run .` and updating the hash in `default.nix`, and finally committed, resulting in a fixed commit that produced the output "Hello, world!" --- and which you can run on systems with Nix installed as simply as:

<pre>
<span class="user-select-none"><strong><span class="text-danger">[sam]</span><span class="text-primary">(~)</span></strong>$ </span><kbd class="user-select-all">nix run github:Samasaur1/jekyll-comments/5e112fa99be34c2f90ab0b3266ce7cd04727e708</kbd>
Hello, world!</pre>

A little more details on some of those steps:

1. Generating a new Cargo project with CLion.

    This is the straightforward step out of them all. CLion generated `src/main.rs`:

    ```rust
    fn main() {
        println!("Hello, world!");
    }
    ```

    and `Cargo.toml`:

    ```toml
    [package]
    name = "jekyll-comments"
    version = "0.1.0"
    edition = "2021"

    # See more keys and their definitions at https://doc.rust-lang.org/cargo/reference/manifest.html

    [dependencies]
    ```

2. `flake.nix`

    The contents of `flake.nix` are:

    ```nix
    {
      description = "The server-side software for Remote Text";

      outputs = { nixpkgs, ... }:
        let
          forAllSystems = gen:
            nixpkgs.lib.genAttrs nixpkgs.lib.systems.flakeExposed
            (system: gen nixpkgs.legacyPackages.${system});
        in {
          packages = forAllSystems (pkgs: { default = pkgs.callPackage ./. { }; });

          formatter = nixpkgs.lib.genAttrs nixpkgs.lib.systems.flakeExposed
            (system: nixpkgs.legacyPackages.${system}.nixfmt);
        };
    }
    ```

    As you can see, I changed the `description` from a description of RssBot to a description of remote-text-server, but forgot to update it for jekyll-comments. In general, this file declares the jekyll-comments package and a formatter[^formatter] for each system that Nix supports.

    [^formatter]: This allows me to run `nix fmt` when in the flake directory to format nix files. Personally, I've started using `fd -e nix -0 | xargs -0 -n 1 nix fmt` to format every Nix file at once.

3. `default.nix`

    Here's the `default.nix` from remote-text-server:

    ```nix
    { lib
    , rustPlatform
    , pkg-config
    , libgit2
    , openssl
    , zlib
    , stdenv
    , darwin
    }:

    rustPlatform.buildRustPackage rec {
      pname = "remote-text-server";
      version = (builtins.fromTOML (builtins.readFile ./Cargo.toml)).package.version;

      src = ./.;

      cargoHash = "sha256-g6QiGH9eqC/mrGzeZOJ5wqm5V5D2xsDm4OOyzmE4sqM=";

      nativeBuildInputs = [
        pkg-config
      ];

      buildInputs = [
        libgit2
        openssl
        zlib
      ] ++ lib.optionals stdenv.isDarwin [
        darwin.apple_sdk.frameworks.IOKit
        darwin.apple_sdk.frameworks.Security
      ];

      env = {
        OPENSSL_NO_VENDOR = true;
        VERGEN_IDEMPOTENT = true;
      };

      meta = with lib; {
        description = "The server-side software for Remote Text";
        homepage = "https://github.com/Remote-Text/remote-text-server";
        license = with licenses; [ ];
        maintainers = with maintainers; [ ];
      };
    }
    ```

4. Remove remote-text-server dependencies

    I chopped out a bunch of lines that only applied to remote-text-server and formatted the file, resulting in:

    ```nix
    { lib, rustPlatform, stdenv, darwin }:

    rustPlatform.buildRustPackage rec {
      pname = "remote-text-server";
      version = (builtins.fromTOML (builtins.readFile ./Cargo.toml)).package.version;

      src = ./.;

      cargoHash = "sha256-g6QiGH9eqC/mrGzeZOJ5wqm5V5D2xsDm4OOyzmE4sqM=";

      buildInputs = [ ] ++ lib.optionals stdenv.isDarwin [
        darwin.apple_sdk.frameworks.IOKit
        darwin.apple_sdk.frameworks.Security
      ];

      env = {
        VERGEN_IDEMPOTENT = true;
      };

      meta = with lib; {
        description = "The server-side software for Remote Text";
        homepage = "https://github.com/Remote-Text/remote-text-server";
        license = with licenses; [ ];
        maintainers = with maintainers; [ ];
      };
    }
    ```

    I actually started the process of reading both the package name and version from `Cargo.toml`, but forgot to change the `pname = ` and `version = `, so you'll see:

    ```nix
    let cargoToml = (builtins.fromTOML (builtins.readFile ./Cargo.toml)).package;
    ```

    at the top of the file, even though I don't use it.

5. Recompute hash

    Running `nix build` or `nix run` produces the output:

    ```
    last 10 log lines:
    > ERROR: cargoHash or cargoSha256 is out of date
    >
    > Cargo.lock is not the same in /private/tmp/nix-build-jekyll-comments-0.1.0.drv-0/jekyll-comments-0.1.0-vendor.tar.gz
    >
    > To fix the issue:
    > 1. Set cargoHash/cargoSha256 to an empty string: `cargoHash = "";`
    > 2. Build the derivation and wait for it to fail with a hash mismatch
    > 3. Copy the "got: sha256-..." value back into the cargoHash field
    >    You should have: cargoHash = "sha256-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX=";
    >
    For full logs, run 'nix log /nix/store/fvzlv1mfhjwi1rlpvzca991ik8k23jvj-jekyll-comments-0.1.0.drv'.
    ```

    Edit `default.nix` as the error tells you to, then run `nix build` or `nix run` again. You'll see the warning `warning: found empty hash, assuming 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='`, and the error log:

    ```
    error: hash mismatch in fixed-output derivation '/nix/store/jjj7wd4mfjimx40i2pz8g9i27ff36vrk-jekyll-comments-0.1.0-vendor.tar.gz.drv':
             specified: sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
                got:    sha256-VlEamDg5c1Hc03z5/7YWekY23ufkWCgyeOfAOtYjuFY=
    ```

    Copy that hash, and put it in `default.nix` in place of the original hash. `nix build `and `nix run` should now succeed.[^storepaths]

    [^storepaths]: The Nix store paths in the outputs I've shown above were generated on the latest version, so they may not be the store paths that were actually output when I was making the initial commit.

So that's the initial commit. After that, I actually thought out my program _before_ I started writing code --- something that my dad always recommends. So I spent the next four commits adding the dependencies that I would need, making sure to update the `Cargo.lock` hash in `default.nix` every time that I added a dependency so that `nix build` and `nix run` would continue to work. Finally, it was time to actually write the server code.

I started with the `axum` example code:

```rust
use axum::{
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;

#[tokio::main]
async fn main() {
    // initialize tracing
    tracing_subscriber::fmt::init();

    // build our application with a route
    let app = Router::new()
        // `GET /` goes to `root`
        .route("/", get(root))
        // `POST /users` goes to `create_user`
        .route("/users", post(create_user));

    // run our app with hyper
    // `axum::Server` is a re-export of `hyper::Server`
    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    tracing::debug!("listening on {}", addr);
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}

// basic handler that responds with a static string
async fn root() -> &'static str {
    "Hello, World!"
}

async fn create_user(
    // this argument tells axum to parse the request body
    // as JSON into a `CreateUser` type
    Json(payload): Json<CreateUser>,
) -> impl IntoResponse {
    // insert your application logic here
    let user = User {
        id: 1337,
        username: payload.username,
    };

    // this will be converted into a JSON response
    // with a status code of `201 Created`
    (StatusCode::CREATED, Json(user))
}

// the input to our `create_user` handler
#[derive(Deserialize)]
struct CreateUser {
    username: String,
}

// the output to our `create_user` handler
#[derive(Serialize)]
struct User {
    id: u64,
    username: String,
}
```
(which actually didn't work for me, since it attempted to use `tracing_subscriber` despite it not being imported).

The initial version of the server that I wrote is [available online here](https://github.com/Samasaur1/jekyll-comments/blob/b4b6be233cace660595ed9c16e7ff9f504c7fd37/src/main.rs), so I'll instead describe the current version of the code (commit [`029d278`](https://github.com/Samasaur1/jekyll-comments/blob/029d2787e26c2e5048259b52365c14418156f894/src/main.rs)).

We start by parsing the port to listen on from the command-line arguments. Doing this first allows us to support the `-h` flag without having a `GITHUB_TOKEN` set in the environment. The actual parsing line is simple:

```rust
let port = Args::parse().port;
```

but requires that the following struct be defined:

```rust
#[derive(Parser, Debug)]
struct Args {
    #[arg(short, long, default_value_t = 10113)]
    port: u16
}
```

Then we connect to the GitHub API. First, we fetch the token from the environment:


```rust
let token = match std::env::var("GITHUB_TOKEN") {
    Ok(token_string) => token_string,
    Err(_) => {
        eprintln!("GITHUB_TOKEN must be set and be valid Unicode");
        exit(1);
    }
};
```

There are two ways to fetch environment variables in Rust. The first, which I used above, returns a `Result<String, VarError>`. It gives you a string if the environment variable exists and is valid Unicode, returning an error otherwise. The second method, `std::env::var_os`, returns an `Option<OsString>`, returning `None` if the environment variable doesn't exist, or an `OsString` if it does, regardless of whether it is valid Unicode. Since I don't need to distinguish the token being unset or being invalid Unicode, I used the first option.

Once we have the token, we actually connect:

```rust
let crab = match octocrab::Octocrab::builder()
    .personal_token(token)
    .build() {
    Ok(crab) => crab,
    Err(_) => {
        eprintln!("Unable to connect to GitHub");
        exit(1);
    }
};
```

and then launch the axum server, as in the example:

```rust
let app = Router::new()
    .route("/", post(|x| create_comment(x, crab)));

// run our app with hyper
// `axum::Server` is a re-export of `hyper::Server`
let addr = SocketAddr::from(([0, 0, 0, 0], port));
// tracing::debug!("listening on {}", addr);
println!("listening on {}", addr);
axum::Server::bind(&addr)
    .serve(app.into_make_service())
    .await
    .unwrap();
```

The actual logic is all in the `create_comment` function:

```rust
async fn create_comment(Form(payload): Form<Comment>, crab: Octocrab) -> Redirect {
    // -- snip --
}
```

It starts by creating an ID for this comment, and then sanitizing the post ID:

```rust
println!("received comment {:?}", payload);
let uuid = Uuid::new_v4();
let invalid_post_id_chars = Regex::new(r"[^a-zA-Z0-9-]").unwrap();
let post_id = invalid_post_id_chars.replace_all(payload.post_id.as_str(), "");
// At the moment I am not checking to see if the passed post_id is a valid post, just whether it is safe.
println!("uuid: {uuid}");
println!("post: {post_id}");
```

That regular expression matches any character that is not a lowercase or uppercase ASCII letter, or a digit 0-9, or the literal character `-`. These are the only characters I use in my post filenames.

Then it creates the new branch:
```rust
let branch_name = format!("comment/{post_id}/{uuid}");
let repos = crab.repos("Samasaur1", "samasaur1.github.io");
let sha = match repos.get_ref(&Reference::Branch("main".to_string())).await.unwrap().object {
    Object::Commit { sha, url} => sha,
    Object::Tag { sha, url } => sha,
    _ => { panic!() }
};
println!("got main ref");
repos.create_ref(&Reference::Branch(branch_name.clone()), sha).await.unwrap();
```

and creates the content of the file:

```rust
let mut file_contents = format!("\
id: {uuid}
name: |-
  {}
email: |-
  {}
gravatar: {:x}
", &payload.name.replace("\n", " "), &payload.email.replace("\n", " "), md5::compute(&payload.email));
if let Some(url) = payload.website {
    file_contents.push_str(format!("url: |-\n  {}\n", url.replace("\n", " ")).as_str());
}
let now = OffsetDateTime::now_utc();
file_contents.push_str(format!("date: {}\n", now.format(&well_known::Iso8601::DEFAULT).unwrap()).as_str());
file_contents.push_str("message: |-2\n");
let lines = payload.message.split("\n");
for line in lines {
    file_contents.push_str(format!("  {line}\n").as_str());
}
```

Note the measures that I am taking to ensure safety. We know that the UUID is safe, since it is generated by the server. We replace all newlines in the name and email with spaces, and then put them in YAML block scalars, ensuring that they don't screw with the generated YAML. The gravatar field is also safe, since it is generated by the server as well. The URL, if it exists, also has its newlines replaced with spaces before being put in a block scalar. The date field is also safe, as it is generated by the server. The message field is allowed to have newlines in it, so I ensure that there are always two spaces before each line to ensure that it is parsed as one string.

In writing this, I've realized this was a colossally stupid idea. There are without a doubt multiple YAML serializing crates, and I should just have used some of them. However, even if the method I'm using is exploitable, the generated file is still submitted as a pull request, so I can moderate generated files.

Next, we use the GitHub API to create the generated file on the new branch:

```rust
let file_update = repos
    .create_file(
        format!("_data/comments/{}/{uuid}.yml", post_id),
        format!("Add comment on {}", post_id),
        file_contents)
    .branch(&branch_name)
    .author(CommitAuthor {
        //TODO: asciify?
        name: payload.name,
        email: payload.email,
    })
    .commiter(CommitAuthor {
        name: "Samasaur".to_string(),
        email: "73031317+Samasaur@users.noreply.github.com".to_string(),
    })
    .send()
    .await
    .unwrap();
println!("created file on branch");
```

and create the pull request:

```rust
crab.pulls("Samasaur1", "samasaur1.github.io")
    .create(format!("Add comment on {}", post_id), branch_name, "main")
    .send().await.unwrap();
```

Finally, we redirect the user.

```rust
let asciify = Regex::new(r"[^[:ascii:]]").unwrap();
Redirect::to(&*asciify.replace_all(payload.redirect.as_str(), ""))
```

***

Now we have the code, and we need to set it up to run as a service. Initially, I did this in the same manner as RssBot, which I'll describe below:

My `flake.nix` looked like this:

```nix
{
  description = "My NixOS configurations";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";

    rssbot.url = "github:Samasaur1/rssbot";
    rssbot.inputs.nixpkgs.follows = "nixpkgs";

    nix-index-database.url = "github:Mic92/nix-index-database";
    nix-index-database.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs = inputs@{ self, nixpkgs, rssbot, nix-index-database, ... }: {
    nixosConfigurations =
      (nixpkgs.lib.genAttrs [ "blinky" "pinky" "inky" "clyde" ] (host:
        nixpkgs.lib.nixosSystem {
          system = "x86_64-linux";
          modules = [
            ./common.nix
            ./ghosts-common.nix
            (./. + "/${host}")
            nix-index-database.nixosModules.nix-index
          ];
          specialArgs = { inherit inputs; };
        })) // {
          lighthouse = nixpkgs.lib.nixosSystem {
            system = "x86_64-linux";
            modules = [ ./common.nix ./lighthouse ];
            specialArgs = { inherit inputs; };
          };
        };

    formatter = nixpkgs.lib.genAttrs nixpkgs.lib.systems.flakeExposed
      (system: nixpkgs.legacyPackages.${system}.nixfmt);
  };
}
```

Note the `rssbot` in `inputs`. The `output` block may seem a little daunting, but what it does is generate a `nixosSystem` for each of `"blinky" "pinky" "inky" "clyde"` where each has the modules `./common.nix`, `./ghosts-common.nix`, `nix-index-database`, and a module that is their hostname (e.g., `blinky` has a module `./blinky`). It then also appends to this list of systems the nixosSystem called `lighthouse`, which is my Google Cloud VM.

If we look at `blinky/default.nix`:

```nix
{ config, pkgs, ... }:

{
  imports = [ ./hardware-configuration.nix ./rssbot.nix ];
  networking.hostName = "blinky";

  # boot.loader.systemd-boot.enable = true;
  # boot.loader.efi.canTouchEfiVariables = true;
  boot.loader = {
    efi.canTouchEfiVariables = true;
    systemd-boot = {
      enable = true;
      configurationLimit = 3;
    };
  };

  environment.systemPackages = with pkgs; [ apfs-fuse ];

  users.motdFile = ./ghost;

  networking.firewall.allowedTCPPorts = [ 3030 ];
}
```
we'll see that it imports `./rssbot.nix`. So let's look at that, `blinky/rssbot.nix`:

```nix
{ config, pkgs, lib, inputs, ... }:

# The RssBot service runs RssBot, a Discord bot that watches RSS feeds.
#
# It expects /etc/rssbot-env to exist and contain DISCORD_TOKEN=<token>.
# Refer to RssBot's README for more information.

{
  systemd.services.rssbot = {
    description = "RssBot";

    script = ''
      cd $STATE_DIRECTORY
      ${inputs.rssbot.packages.${pkgs.system}.default}/bin/rssbot
    '';

    serviceConfig = {
      DynamicUser = true;
      EnvironmentFile = "/etc/rssbot-env";
      StateDirectory = "rssbot";

      Environment = [ "PYTHONUNBUFFERED=1" "VERBOSE=1" ];

      PrivateDevices = true;
      PrivateMounts = true;
      PrivateUsers = true;
      ProtectControlGroups = true;
      ProtectHome = true;
      ProtectHostname = true;
      ProtectKernelLogs = true;
      ProtectKernelModules = true;
      ProtectKernelTunables = true;
    };

    wantedBy = [ "multi-user.target" ];
    after = [ "network-online.target" ];
    wants = [ "network-online.target" ];
  };
}
```

It's fairly straightforward. While I initially installed jekyll-comments in the same way, I didn't really like the fact that I had to do the systemd service configuration in my NixOS config. Nix flakes can provide NixOS modules the in the same way that they can provide packages, which would let me enable jekyll-comments in my NixOS config as if it was a service in nix pkg.

To do so, we modify jekyll-comment's `flake.nix` to look like this:

```nix
{
  description = "The server-side software for Remote Text";

  outputs = { nixpkgs, ... }:
    let
      forAllSystems = gen:
        nixpkgs.lib.genAttrs nixpkgs.lib.systems.flakeExposed
        (system: gen nixpkgs.legacyPackages.${system});
    in {
      packages = forAllSystems (pkgs: { default = pkgs.callPackage ./. { }; });

      nixosModules.default = import ./module.nix;

      formatter = nixpkgs.lib.genAttrs nixpkgs.lib.systems.flakeExposed
        (system: nixpkgs.legacyPackages.${system}.nixfmt);
    };
}
```

(adding the `nixosModules.default` line). Then we create `./module.nix`, which looks like this:

```nix
{ config, lib, pkgs, ... }:

with lib;

let cfg = config.services.jekyll-comments;

in {
  options.services.jekyll-comments = {
    enable = mkEnableOption "jekyll-comments";
    port = mkOption {
      type = types.port;
      default = 10113;
      example = 46264;
      description = "The port to listen on";
    };
    openFirewall = mkOption {
      type = types.bool;
      default = true;
      example = false;
      description = "Whether to automatically open the port the server runs on";
    };
  };

  config = mkIf cfg.enable {
    systemd.services.jekyll-comments = {
      description = "Jekyll Comments Server";

      # TODO: should have package option or put it in pkgs or something idr too sleepy
      script = let package = pkgs.callPackage ./. {}; in ''
        cd $STATE_DIRECTORY
        ${package}/bin/jekyll-comments --port ${toString cfg.port}
      '';

      serviceConfig = {
        DynamicUser = true;
        EnvironmentFile = "/etc/jekyll-comments-env";
        StateDirectory = "jekyll-comments";

        PrivateDevices = true;
        PrivateMounts = true;
        PrivateUsers = true;
        ProtectControlGroups = true;
        ProtectHome = true;
        ProtectHostname = true;
        ProtectKernelLogs = true;
        ProtectKernelModules = true;
        ProtectKernelTunables = true;
      };

      wantedBy = [ "multi-user.target" ];
      after = [ "network-online.target" ];
      wants = [ "network-online.target" ];
    };
    networking.firewall.allowedTCPPorts = mkIf cfg.openFirewall [ cfg.port ];
  };
}
```

This is more complicated. Essentially, this file is a function that takes `config`, `lib`, `pkgs`, and any number of unnamed arguments, and produces an "attribute set" (think dictionary/map/associative array). The only keys that I am setting are `options` and `config` (although I set many subkeys).

You use the `options` key to define the options that people using this module can set. I defined three options, so an end user could have something like this:
```nix
services.jekyll-comments = {
  enable = true;
  port = 12345;
  openFirewall = false;
};
```

The `config` key is where you define the changes actually made to the system configuration. As you can see, it is all wrapped in `mkIf cfg.enable`, which ensures that importing this module doesn't make any changes unless the user enables it. Imagine if every service in nixpkgs was automatically enabled! As you can see, this service configuration looks almost identical to the RssBot service configuration, but it uses the configured port, and also opens that port in the firewall if not disabled.

Now that the NixOS module is defined in jekyll-comments, I could include it in my NixOS config. Add

```nix
jekyll-comments.url = "github:Samasaur1/jekyll-comments";
jekyll-comments.inputs.nixpkgs.follows = "nixpkgs";
```
to the `inputs` section of your `flake.nix`, and then update `blinky/default.nix`:

```nix
{ config, pkgs, lib, inputs, ... }:

{
  imports = [ ./hardware-configuration.nix ./rssbot.nix inputs.jekyll-comments.nixosModules.default ];
  networking.hostName = "blinky";

  # boot.loader.systemd-boot.enable = true;
  # boot.loader.efi.canTouchEfiVariables = true;
  boot.loader = {
    efi.canTouchEfiVariables = true;
    systemd-boot = {
      enable = true;
      configurationLimit = 3;
    };
  };

  services.jekyll-comments = {
    enable = true;
    port = (import ../jekyll-comments.nix).ports.internal;
  };

  environment.systemPackages = with pkgs; [ apfs-fuse ];

  users.motdFile = ./ghost;

  networking.firewall.allowedTCPPorts = [ 3030 ];
}
```

Observe how importing the NixOS module from the jekyll-comments flake allowed me to set `services.jekyll-comments`.

The reason I set the port to `(import ../jekyll-comments.nix).ports.internal` is because of how I have my public-facing services set up. I have to reference the internal port twice, and I want to have a single source of truth rather than forget to update it in some places. I have an upcoming post on how I host services that will go into more detail.

Once I set it up so that https://comments.blog.samasaur.com pointed to the running jekyll-comments server, that was it! Comments were enabled! You can go ahead and try them out right down here: ↓
