---
layout: post
tags:
  - swift
  - homebrew
---
One of the biggest difficulties with creating Swift command-line tools is that they're difficult to distribute. Even if you create a Homebrew tap and formula for them, users need Swift or Xcode. Homebrew's solution to this process is bottles — most of what you have installed via Homebrew is probably bottled — but they only bottl eformula in homebrew/core. How do we bottle our own?

Here's what I did with [SimpleSwiftServer]({{ "/projects/simpleswiftserver" | relative_url }}):

1. Get to a point where you can run <kbd>brew install simpleswiftserver</kbd>. This should build from source — this will help you get to a bottle. I have a [Homebrew tap](https://github.com/Samasaur1/homebrew-core) and SimpleSwiftServer has scripts for updating the formula. I may write a post later about how to set this up on your own.
2. Make sure the formula is **uninstalled**. <kbd>brew uninstall simpleswiftserver</kbd>.
3. <kbd>brew install --build-bottle simpleswiftserver</kbd>. This will install but not run post-install steps to prepare for bottling (to be honest I'm not sure what those steps are — I probably could have skipped 2 and 3).
4. <kbd>brew bottle --root-url="https://github.com/Samasaur1/SimpleSwiftServer/releases/download/v4.3.0" --no-rebuild simpleswiftserver</kbd>. This actually a) creates the "bottle"; and b) gives you the `bottle do` block to put in the formula. The URL I passed is a link to the GitHub release for version 4.3.0 (at the time of writing, the latest version) of SimpleSwiftServer. Note: before I had created the release, the link did not point anywhere. That's fine. This will produce the following output:
<pre>
<strong><span class="text-danger">[sam]</span><span class="text-primary">(~/Desktop/</span></strong>$ <kbd>brew bottle --root-url="https://github.com/Samasaur1/SimpleSwiftServer/releases/download/v4.3.0" --no-rebuild simpleswiftserver</kbd>
<span class="text-primary">==></span> <strong>Bottling simpleswiftserver--4.3.0.big_sur.bottle.tar.gz...</strong>
./simpleswiftserver--4.3.0.big_sur.bottle.tar.gz
  bottle do
    root_url "https://github.com/Samasaur1/SimpleSwiftServer/releases/download/v4.3.0"
    cellar :any_skip_relocation
    sha256 "89076d75263eddd39f057088dcadca93b851dc935c9747d038e53e4b08d4b1d9" => :big_sur
  end</pre>
5. Stick the `bottle do` block into your formula.
6. Upload the `.bottle.tar.gz` file to the GitHub release. **I had to remove one of the two hyphens** — I'm not sure if that's always true, but I'd do it now.
7. <kbd>brew uninstall simpleswiftserver</kbd> so that you can test the bottle.
8. <kbd>brew install simpleswiftserver</kbd>. It should use the bottle!

***

However, I'm on Big Sur, and I wanted to make this available to earlier OS versions. I (apparently) had VirtualBox on my computer, but it couldn't boot. My thought is to get either GitHub Actions or Travis CI to build this bottle on earlier versions — plus, then I can automate it.
