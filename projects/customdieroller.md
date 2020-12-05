---
layout: project
title: Samasaur1 | Projects | Custom Die Roller
sidebar:
  - title: About the app
  - title: Usage
  - title: Privacy
  - title: Support
    children:
      - title: Known Issues
---
# Custom Die Roller <a href="{{proj.appstore_url}}"><img src="/assets/images/appstore-get-ios.svg"/></a>
### About the app
Ever out and about and you need some dice? Forgot your dice set when playing D&D? Custom Die Roller is an easy-to-use yet powerful way to roll some virtual dice. From a simple d6 to arbitrarily complex expressions in dice notation, the app can handle it all. Plus — visualize the probability distribution of your expression with the built-in bell curve!

<span class="badge badge-primary" style="font-size:110%;">New</span>
Probabilities computation is now, according to our tests, up to 1000x faster — and because this computation is done when rolling a set of dice for the first time, this speed increase propagates to rolling as well!

### Usage
Drag the arrow right from the left side of the screen or tap on it to bring up the add dice menu. Tap on a die to add it, or drag it onto the main area. You can scroll up and down within the add menu — adding a modifier is hidden at the bottom.

To hide the menu, tap on the arrow, or drag it back offscreen.

You can always reposition dice in the main area by dragging them around. To remove a die, drag it off the bottom of the screen, or drag it back into the menu.

To clear all dice onscreen, click the <span class="text-danger badge badge-light">Clear</span> button.

You can also edit the dice onscreen by tapping on the text at the bottom. It will auto-update when you add or remove dice or modifiers, but if you click on it, you can edit it directly. It uses dice notation, so `2d6 + 3` is the sum of two six-sided dice, plus 5 more.

When you are ready to roll, click <span class="text-primary badge badge-light" style="font-size:95%;">Roll!</span>. This will bring up the roll view, where you can see the probabilty distribution form the dice combination you selected, your roll result, and the dice you rolled. You can also re-roll directly from here.

##### Roll View
The main part of this view is the probability distribution. Each column is a possible result — the height of the column shows you the likelihood of that result. Above each column, there is a number in light gray. That tells you the number of ways there are to roll that result. Below each column, there is a number in black. That tells you the value of that result (what you rolled). The result that you rolled will have its bottom number in bold, and the column will be green.

If you have a large number of possible results, they may not all appear at once. Try scrolling sideways.

Above the probability distribution, you will see anothe rnumber. That is another way to see the actual result that you rolled.

Above all of that, you can see a <span class="text-danger badge badge-light" style="font-size:95%;">Close</span> button, which will exit roll view, the dice that you rolled (in dice notation), and a <span class="text-primary badge badge-light" style="font-size:95%;">Reroll!</span> button, which will re-roll your current selection of dice.

### Privacy
We don't collect any information while you use our app. If you chose to share analytics data with developers when setting up your device, we may recieve anonymized data if the app crashes, but that's it.

### Support
We're sorry you've encountered some issues with our app. Please email us at [developer@gauck.com](mailto:developer@gauck.com) and we'll see what we can do to help!
<br/><span class="text-muted" style="font-size:90%">We'll try to check that email regularly, but if you don't hear back form us within a few days, [email me directly](mailto:30577766+Samasaur1@users.noreply.github.com) or leave a review on the app.</span>

##### Known Issues
* Adding too many dice causes the app to crash when clicking "Roll!"
  * This is [a known issue in DiceKit](https://github.com/Samasaur1/DiceKit/issues/91), the backing library. The crash occurss when calculating probabilities, but we do that whenever the user clicks roll. As of right now, the best workaround is to break the roll into parts and add them together.
