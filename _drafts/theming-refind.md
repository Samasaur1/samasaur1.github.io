---
layout: post
title: 'Theming rEFInd'
tags:
- refind
- catppuccin
- nixos
- svg
- imagemagick
---
I have a collection of very old (pre-2010) Mac Minis, two of which are currently set up (dual-booting macOS and NixOS). The reason I kept the macOS partition is really just based on my superstition and the belief that _if_ the Linux distro goes totally kaput, I'll be able to rescue the machine from the macOS partition.

I'm using [the rEFInd boot manager](https://www.rodsbooks.com/refind/index.html) on both of these computers. This may not be the ideal choice — since NixOS doesn't support it directly, so I have to go rEFInd → systemd-boot → NixOS — but it has superstitial, sentimental, and actually practical value! There was a NixOS update a bit ago that broke systemd-boot on nixos-unstable-small (which is the channel I was using), so if I hadn't had the rEFInd layer of indirection, I'm not sure what I would have done. I don't think the broken systemd-boot was able to boot from USBs, so probably the macOS firmware bootloader? Anyway, I have rEFInd on these machines.

Yesterday I was looking through the [Catppuccin](https://catppuccin.com/) themes. I already had it set up for the JetBrains IDEs, Neovim, Alacritty, `bat`, and possibly a couple of other things, but they support a LOT of projects. Among them is [a theme for rEFInd](https://github.com/catppuccin/refind). This was the first time I'd heard of rEFInd being themable, but it sounded great (and looked great, too!).

So I tried following the instructions on the theme page:

<pre>
<code><span class="user-select-none">[sam] $ </span>sudo su root</code>
<code><span class="user-select-none">[root] # </span>mkdir -p /boot/EFI/refind/themes</code>
<code><span class="user-select-none">[root] # </span>cd /boot/EFI/refind/themes</code>
<code><span class="user-select-none">[root] # </span>git clone https://github.com/catppuccin/refind</code>
<code><span class="user-select-none">[root] # </span>cd ..</code>
<code><span class="user-select-none">[root] # </span>echo "include themes/refind/mocha.conf" >> refind.conf</code>
</pre>

(this is not exactly what the page says; I've converted the textual instructions into shell commands, and I've chosen "mocha" for my flavor). Also, for the record, this was with commit `60dbd37a804b52f814e901cfc953be3c4019e981` of the theme.

If you try this and reboot, it will _not_ work. There is one big reason for why this doesn't work. Let's take a look at `themes/refind/mocha.conf`:


```conf
# Refind Catppuccin Theme (mocha)

# Hide user interface elements for personal preference or to increase
# security:
#  banner      - the rEFInd title banner (built-in or loaded via "banner")
#  label       - boot option text label in the menu
#  singleuser  - remove the submenu options to boot Mac OS X in single-user
#                or verbose modes; affects ONLY MacOS X
#  safemode    - remove the submenu option to boot Mac OS X in "safe mode"
#  hwtest      - the submenu option to run Apple's hardware test
#  arrows      - scroll arrows on the OS selection tag line
#  hints       - brief command summary in the menu
#  editor      - the options editor (+, F2, or Insert on boot options menu)
#  all         - all of the above
# Default is none of these (all elements active)
#
hideui singleuser,hints,arrows,label,badges,safemode,hwtest

# Set the name of a subdirectory in which icons are stored. Icons must
# have the same names they have in the standard directory. The directory
# name is specified relative to the main rEFInd binary's directory. If
# an icon can't be found in the specified directory, an attempt is made
# to load it from the default directory; thus, you can replace just some
# icons in your own directory and rely on the default for others.
# Default is "icons".
#
icons_dir themes/rEFInd-catppuccin/assets/mocha/icons

# Use a custom title banner instead of the rEFInd icon and name. The file
# path is relative to the directory where refind.efi is located. The color
# in the top left corner of the image is used as the background color
# for the menu screens. Currently uncompressed BMP images with color
# depths of 24, 8, 4 or 1 bits are supported, as well as PNG images.
#
banner themes/rEFInd-catppuccin/assets/mocha/background.png

# Tells rEFInd whether to display banner images pixel-for-pixel (noscale)
# or to scale banner images to fill the screen (fillscreen). The former is
# the default.
#
banner_scale fillscreen

# Custom images for the selection background. There is a big one (144 x 144)
# for the OS icons, and a small one (64 x 64) for the function icons in the
# second row. If only a small image is given, that one is also used for
# the big icons by stretching it in the middle. If only a big one is given,
# the built-in default will be used for the small icons.
#
# Like the banner option above, these options take a filename of an
# uncompressed BMP image file with a color depth of 24, 8, 4, or 1 bits,
# or a PNG image. The PNG format is required if you need transparency
# support (to let you "see through" to a full-screen banner).
#
selection_big   themes/rEFInd-catppuccin/assets/mocha/selection_big.png
selection_small themes/rEFInd-catppuccin/assets/mocha/selection_small.png

# Which non-bootloader tools to show on the tools line, and in what
# order to display them:
#  shell           - the EFI shell (requires external program; see rEFInd
#                    documentation for details)
#  gptsync         - the (dangerous) gptsync.efi utility (requires external
#                    program; see rEFInd documentation for details)
#  apple_recovery  - boots the Apple Recovery HD partition, if present
#  mok_tool        - makes available the Machine Owner Key (MOK) maintenance
#                    tool, MokManager.efi, used on Secure Boot systems
#  about           - an "about this program" option
#  exit            - a tag to exit from rEFInd
#  shutdown        - shuts down the computer (a bug causes this to reboot
#                    EFI systems)
#  reboot          - a tag to reboot the computer
#  firmware        - a tag to reboot the computer into the firmware's
#                    user interface (ignored on older computers)
# Default is shell,apple_recovery,mok_tool,about,shutdown,reboot,firmware
#
showtools shutdown
```

You may see the issue: all the file paths seem to assume that you have cloned the repository into a directory named `rEFInd-catppuccin`, even though the repository name (and therefore the default directory name) is simply `refind`. That's an easy enough fix — simply replace all instances of `rEFInd-catppuccin` with `refind` in `themes/refind/{latte,frappe,macchiato,mocha}.conf`

***

The next issue is not with the theme, but with my setup. As I said earlier, rEFInd doesn't directly support booting into NixOS due to the "generations" that the OS supports. So I have a systemd-boot entry, which the theme hasn't provided a new icon for. The theme also removes the "hidden tags" option, which means that I can't hide the NixOS entry that appears, even though it crashes whenever I try to boot directly to it from rEFInd. Furthermore, that entry just has the generic Linux icon (Tux, the penguin, just sitting there), as the theme also doesn't provide a NixOS icon.

The solutions to these problems, in no particular order, were as follows:

To restore the hidden tags option:
<pre>
<code><span class="user-select-none">[sam] $ </span>sudo su root</code>
<code><span class="user-select-none">[root] # </span>cd /boot/EFI/refind</code>
<code><span class="user-select-none">[root] # </span>echo "showtools shutdown,hidden_tags" >> refind.conf</code>
</pre>

Note that the `showtools shutdown,hidden_tags` line must go AFTER the `include` line for the theme, as the last set value overrides all previously set values.

The other two issues were both missing icons. After some failures with Preview, and then some more with GIMP, here's what I got to work (and look good):

1. Find an image. For ssytemd-boot, I took the "standalone logomark" from <https://brand.systemd.io>, while for NixOS, I found a version of the icon online. **Note: I specifically wanted SVGs of the images, to make coloring easier and to delay rasterization as long as possible in order to preserve resolution.**
2. Clean up the SVG. The nice thing about SVGs is that you can edit them directly, as text — I used Neovim. You'll want to remove any backgrounds, gradients, etc., and note all the colors that you want to replace. For example, here's the systemd-book logomark as I downloaded it:

    ```xml
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="200">
        <path fill="#fff" d="M0 0h300v200H0z"/>
        <g transform="translate(30.667 -1141.475) scale(1.33333)">
            <path d="M25 911.61v39h15v-6h-9v-27h9v-6zm114 0v6h9v27h-9v6h15v-39z" style="line-height:normal;font-variant-ligatures:normal;font-variant-position:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-alternates:normal;font-feature-settings:normal;text-indent:0;text-align:start;text-decoration-line:none;text-decoration-style:solid;text-decoration-color:#000;text-transform:none;text-orientation:mixed;white-space:normal;shape-padding:0;isolation:auto;mix-blend-mode:normal;solid-color:#000;solid-opacity:1" color="#000" font-weight="400" font-family="sans-serif" overflow="visible" fill="#201a26"/>
            <path d="M92.5 931.11l27-15v30z" fill="#30d475"/>
            <circle cx="70.002" cy="931.111" r="13.5" fill="#30d475"/>
        </g>
    </svg>
    ```

    I removed the first path line, and noted the colors `#30D475` and `#201A26`. It was more work to clean up the NixOS logo I found, but the end goal is to have it look more or less like this.

3. Replace the colors. I have the `sd` command installed, so it was as easy as (for the systemd example above) <kbd>sd '30D475' '4c4f69' file.svg; sd '201A26' '4c4f69' file.svg</kbd>. That's the color for the mocha flavor of catppuccin, if I recall correctly.
4. Convert from SVG to PNG. I used the following ImageMagick command: <kbd>convert -background none file.svg -resize 256x256 -gravity center -extent 256x256 file.png</kbd>. This worked great for the systemd icon, but it made the NixOS icon too big. So instead I used <kbd>convert -background none file.svg -resize 170x170-gravity center -extent 256x256 file.png</kbd>, to keep the same canvas size (256x256) but shrink the actual image inside that canvas (adding more padding, essentially).

<!-- This version (below) would select the entirety of the <kbd> lines when clicking in them
4. Convert from SVG to PNG. I used the following ImageMagick command: <kbd class="user-select-all">convert -background none file.svg -resize 256x256 -gravity center -extent 256x256 file.png</kbd>. This worked great for the systemd icon, but it made the NixOS icon too big. So instead I used <kbd class="user-select-all">convert -background none file.svg -resize 170x170-gravity center -extent 256x256 file.png</kbd>, to keep the same canvas size (256x256) but shrink the actual image inside that canvas (adding more padding, essentially). -->

That's all it took!

<img src="{{ "/assets/images/blog/theming-refind/final.jpeg" | relative_url }}" width="100%"/>
