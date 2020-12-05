---
layout: project
title: Samasaur1 | Projects | RPG-card-generator
sidebar:
  - title: Install
    children:
      - title: Requirements
      - title: Homebrew
      - title: Mint
      - title: Manual Install
  - title: Usage
  - title: Uninstall
---
# RPG-card-generator
Generate JSON for use with [**@crobi**](https://github.com/crobi)'s [rpg-cards](https://github.com/crobi/rpg-cards). Pick from a library of pre-made cards, or create your own interactively using templates.
### Install
##### Requirements
RPG-card-generator does not come pre-compiled, so you'll need Swift 4.0 or later in order to build it. (This version of Swift comes with Xcode 9 or later).

To download Xcode, get it [from the Mac App Store](https://apps.apple.com/us/app/xcode/id497799835) or download it [from the Apple Developer portal](https://developer.apple.com/download/more/) (requires sign-in).

Alternatively, download Swift [from Swift.org](https://swift.org/download/), using Homebrew, swiftenv, or via some other method.
##### [Homebrew](https://brew.sh/)
Installation:
<pre class="user-select-all">
<code><span class="user-select-none">$ </span>brew install Samasaur1/core/rpg-card-generator</code></pre>
Updating:
<pre class="user-select-all">
<code><span class="user-select-none">$ </span>brew upgrade rpg-card-generator</code></pre>
##### [Mint](https://github.com/yonaskolb/mint)
**Note:** Installing with mint will leave the tool name as `RPG-card-generator`, not `cardgen`.

Installation:
<pre class="user-select-all">
<code><span class="user-select-none">$ </span>mint install Samasaur1/RPG-card-generator</code></pre>
Updating:
<pre class="user-select-all">
<code><span class="user-select-none">$ </span>mint install RPG-card-generator</code></pre>
##### Manual Install
Installation & updating:
```
$ git clone https://github.com/Samasaur1/RPG-card-generator.git
$ cd RPG-card-generator
$ swift build -c release
$ sudo mv .build/release/RPGCardGenerator /usr/local/bin/cardgen
```
Build and run directly:
```
$ git clone https://github.com/Samasaur1/RPG-card-generator.git
$ cd RPG-card-generator
$ swift run RPG-card-generator
```

### Usage
  <pre>
<strong><span class="text-danger">[sam]</span><span class="text-primary">(~/Desktop/samasaur1.github.io)</span></strong>$ <kbd>cardgen</kbd>
<kbd>help</kbd>
The available commands are:
quit, create, add, new, list, help, library

<kbd>add</kbd>

<strong>Premade cards:</strong> (custom cards are listed before RPGSTDLIB cards)
Potion of Healing
Potion of Healing
Arcane Bond
Spell Attacks
Potion of Healing
Acid Splash
Alarm
Arcane Mark
Bleed
Burning Hands
Charm Person
Dancing Lights
Daze
Detect Magic
Detect Poison
Detect Secret Doors
Disrupt Undead
Feather Fall
Flare
Ghost Sound
Light
Mage Armor
Mage Hand
Magic Missile
Mending
Message
Open/Close
Prestidigitation
Ray of Frost
Read Magic
Resistance
Scorching Ray
Shield
Sleep
Summon Monster I
Summon Monster I (List)
Touch of Fatigue
Greatsword
Longbow
Crossbow Bolts (10)
Bull's Strength
Enlarge Person
Reduce Person
Shocking Grasp
Acid Arrow
Acid Fog
Alter Self
Analyze Dweomer

Choose a card or type a term to search for
If the input doesn't match a card, it will search
<kbd>Magic Missile</kbd>
Added 'Magic Missile'
<kbd>list</kbd>
JSON so far:

[
  {
    "tags" : [
      "spell",
      "level1"
    ],
    "contents" : [
      "subtitle | 1st level evocation",
      "rule",
      "property | Casting Time | 1 standard action",
      "property | Components | V, S",
      "property | Range | medium (100 ft. + 10 ft./level)",
      "property | Target | up to five creatures, no two of which can be more than 15 ft. apart",
      "property | Duration | instantaneous",
      "property | Saving Throw | none",
      "property | Spell Resistance | yes",
      "rule",
      "fill",
      "text | You shoot (a) magic missile(s) that deals &lt;b&gt;1d4+1&lt;/b&gt; damage.
        The missile hits anyone without total cover or concealment.",
      "fill",
      "section | At higher levels",
      "text | +1 missile every 2 levels (max 5 at level 9). These can target separate targets."
    ],
    "title_size" : "16",
    "title" : "Magic Missile",
    "icon_back" : "robe",
    "count" : 1,
    "color" : "black",
    "icon" : "white-book-1"
  }
]

Cards:
Magic Missile

<kbd>quit</kbd>
Do you want to save?
<kbd>yes</kbd>
Output filename?
<kbd>output.json</kbd>
<strong><span class="text-danger">[sam]</span><span class="text-primary">(~/Desktop/samasaur1.github.io)</span></strong>$</pre>
You'll then have `output.json` in your current working directory, and can upload it to [**@crobi**](https://github.com/crobi)'s [rpg-cards](https://github.com/crobi/rpg-cards). (an instance is available [here](https://rpg-cards.vercel.app/) and another is available [here](https://crobi.github.io/rpg-cards/generator/generate.html))

###### Notes:
* RPG-card-generator's installation methods all use different names, and don't all result in the same tool name.
* The project name (RPG-card-generator) and the desired tool name (cardgen) are different.
* The standard library is not installed with any installation method. ([homebrew](https://github.com/Samasaur1/homebrew-core/issues/1))
* Visit the [issues](https://github.com/Samasaur1/REPL/issues) page to see the status of these issues.

### Uninstall
REPL doesn't leave anything behind, so you can use the normal uninstall method:
<pre class="user-select-all">
<code><span class="user-select-none">$ </span>brew uninstall rpg-card-generator</code></pre>
<pre class="user-select-all">
<code><span class="user-select-none">$ </span>mint uninstall RPG-card-generator</code></pre>
<pre class="user-select-all">
<code><span class="user-select-none">$ </span>sudo rm /usr/local/bin/cardgen</code></pre>
