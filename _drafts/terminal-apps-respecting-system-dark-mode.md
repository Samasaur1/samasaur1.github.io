---
layout: post
title: 'Terminal Apps Respecting System Dark Mode'
tags:
- macos
- neovim
- alacritty
- swift
---
This article is dedicated to Alex, for this glowing review and proving the inspiration to finish this post.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="{{ "/assets/images/blog/terminal-apps-respecting-system-dark-mode/endorsement-dark.png" | relative_url }}">
  <source media="(prefers-color-scheme: light)" srcset="{{ "/assets/images/blog/terminal-apps-respecting-system-dark-mode/endorsement-light.png" | relative_url }}">
  <img alt="endorsement" src="{{ "/assets/images/blog/terminal-apps-respecting-system-dark-mode/endorsement-light.png" | relative_url }}">
</picture>

Since macOS Mojave (10.14) in 2018, macOS has had a system-wide Dark Mode. In macOS Catalina (10.15) (2019), Apple introduced automatic shifting between light and dark modes based on a schedule or sunrise/sunset[^1].

[^1]: While researching which versions of macOS introduced dark mode, I discovered that macOS Ventura (13) apparently will no longer shift into/out of dark mode "until your Mac has been idle for at least a minute," and won't shift at all if "an app is preventing the display from sleeping" ([Apple Support article](https://support.apple.com/guide/mac-help/use-a-light-or-dark-appearance-mchl52e1c2d2/13.0/mac/13.0)). ~~Just another reason not to upgrade~~ I've actually upgraded after writing the first draft of this article, and I don't notice the delay in practice.

If you've ever used the stock macOS Terminal.app with no customization, you may have noticed that the default "Basic" profile does in fact shift with dark mode:

![default macos terminal profile shifting in and out of dark mode]({{ "/assets/images/blog/terminal-apps-respecting-system-dark-mode/default.gif" | relative_url }})

but as soon as you configure anything — font, colors, anything at all — it no longer shifts:

![customized macos terminal profile failing to shift into dark mode]({{ "/assets/images/blog/terminal-apps-respecting-system-dark-mode/customized.gif" | relative_url }})

I Do Not Like This.

As it so happens, I'm no longer using Terminal.app (primarily for its lack of 24-bit truecolor support or support for the OSC52 escape code) and I am instead using [my own fork of Alacritty](https://github.com/Samasaur1/alacritty/tree/2b7def0f774e5cfb0b4ed06b5f9d8ffd73f8bf2a). While Alacritty also doesn't support shifting by default, it _does_ support both a feature called "live config reload" (where the configuration file is reloaded upon changes, even if the app is open) and an IPC socket API.

I also want to have my Neovim installation shift with light and dark mode, because even on a light terminal emulator, Neovim puts everything on a dark background.

***

So now we know what we want to do. The next question is how to do it.

## the overarching system

macOS allows you to add "observers" for system "notifications". These aren't the notifications that the user would see in Notification Center, but rather for system events (such as undo/redo, waking from sleep, changes to the Contacts database, when a game controller connects, when the user changes their preferred units in Health, when the music player's queue changes, when the clipboard changes, or more[^morenotifications]). Among the notifications you can observe is one that fires whenever the system appearance changes. We'll listen for that event, and then run a series of commands every time our callback is triggered.

[^morenotifications]: This was an essentially random list of notifications. You can see a larger but not full list [at the Apple docs](https://developer.apple.com/documentation/foundation/nsnotification/name)

<!-- If you google how to do this, most of the results you'll find will point you to the old, undocumented way of listening for this event (and you may see some Objective-C example code). However, since 2018, when Dark Mode was first introduced in macOS Mojave 10.14, there is a newer, better way to do it. I do support both, though: -->
If you google how to do this, most of the results you'll find will point you to the (pre-dark mode!) old, undocumented way of listening for this event (and you may see some Objective-C example code). However, when Dark Mode was introduced, a newer, better way was added (and documented):

```swift
if #available(macOS 10.14, *) {
    print("Registering appearance change callback")
    observation = NSApplication.shared.observe(\.effectiveAppearance) { (app, _) in
        try! callback()
    }
} else {
    print("Registering legacy theme change callback")
    DistributedNotificationCenter.default.addObserver(
            forName: Notification.Name("AppleInterfaceThemeChangedNotification"),
            object: nil,
            queue: nil) { (notification) in
        try! callback()
    }
}
```
When using the newer method, note how I store the observation in `observation`. You must keep a reference to the observation if you want it to actually observe.

Also note the `callback()` function, which is defined like so:
```swift
public static func callback() throws {
    let dir = ProcessInfo.processInfo.environment["XDG_CONFIG_DIR", default: "~/.config"]
    print("[callback] Reading from \(dir)")
    let url = URL(fileURLWithPath: dir.replacingOccurrences(of: "~", with: FileManager.default.homeDirectoryForCurrentUser.absoluteString)).appendingPathComponent("dmn").appendingPathComponent("commands.json")
    let data = try Data(contentsOf: url)
    print("[callback] Read contents of \(url)")
    let commands: [Command] = try JSONDecoder().decode([Command].self, from: data)
    print("[callback] Decoded \(commands.count) command(s) to run")

    let isDark = UserDefaults.standard.string(forKey: "AppleInterfaceStyle") == "Dark"

    for command in commands {
        print("[callback] Running command `\(command.executable)` with argument(s) '\(command.arguments.joined(separator: "', '"))'")
        shell(command.executable, args: command.arguments.map { $0.replacingOccurrences(of: "{}", with: isDark ? "dark" : "light")})
    }
}
```
It reads a JSON file in `~/.config/dmn/commands.json` (or respects your `$XDG_CONFIG_DIR` if set), which is a list of commands to run every time the theme changes. Mine looks like this:
```json
[
    {
        "executable": "/Users/sam/.local/bin/nvim-ctrl",
        "arguments": ["set background={}"]
    },
    {
        "executable": "/usr/bin/env",
        "arguments": ["/Users/sam/.local/bin/alacritty-color-switcher"]
    },
    {
        "executable": "/usr/bin/env",
        "arguments": ["/Users/sam/.local/bin/nvim-starting-color-switcher"]
    },
    {
        "executable": "/Users/sam/.local/bin/lvim-ctrl",
        "arguments": ["set background={}"]
    },
    {
        "executable": "/Users/sam/.local/bin/cheat-starting-color-switcher",
        "arguments": []
    },
]
```

Next, let's look at the `shell` function:

```swift
@discardableResult
func shell(_ exec: String, args: [String]) -> Int32 {
    let task = Process()
    let isDark = UserDefaults.standard.string(forKey: "AppleInterfaceStyle") == "Dark"
    var env = ProcessInfo.processInfo.environment
    env["DARKMODE"] = isDark ? "1" : "0"
    env["MODE"] = isDark ? "dark" : "light"
    task.environment = env
    task.launchPath = exec
    task.arguments = args
    task.standardError = FileHandle.standardError
    task.standardOutput = FileHandle.standardOutput
    task.launch()
    task.waitUntilExit()
    return task.terminationStatus
}
```

We check whether we're in light or dark mode, set some environment variables, and then run whatever the command is. Note that the way I'm currently checking for dark mode is not ideal, but there is [an open ticket](https://github.com/Samasaur1/dmn/issues/1) to use the officially supported method.

Finally, we register our callback on system wake from sleep (since the computer can shift themes while the computer is sleeping, which does not send notifications but is visible when the computer wakes:

```swift
NSWorkspace.shared.notificationCenter.addObserver(
        forName: NSWorkspace.didWakeNotification,
        object: nil,
        queue: nil) { (notification) in
    try! callback()
}
NSApplication.shared.run()
```
and then begin the Cocoa main loop with `NSApplication.shared.run()`. Without this line, the program would exit immediately.

<!-- This is **the** most effective way to  -->

***

#### running as a service

This works great when I'm running it, but I don't want to leave a window running all the time. Instead, I'd like it to run as a background service, ideally restarting if it ever crashes. On macOS, the way you do this is with a LaunchAgent, which is a user-scoped service. LaunchAgents are configured with `.plist` files, and the one for this program looks like this:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
"http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.samasaur.dmn</string>
    <key>KeepAlive</key>
    <true/>
    <key>StandardErrorPath</key>
    <string>/tmp/dmn-stderr.log</string>
    <key>StandardOutPath</key>
    <string>/tmp/dmn-stdout.log</string>
    <key>Program</key>
    <string>/Users/sam/.local/bin/dmn</string>
</dict>
</plist>
```

In all honesty, I have no idea how I enabled this service. Check `man launchctl`, and good luck.

***

## addendum: scripts for specific commands

Remember my personal `commands.json`? Let's take a look in more detail:

```json
[
    {
        "executable": "/Users/sam/.local/bin/nvim-ctrl",
        "arguments": ["set background={}"]
    },
    {
        "executable": "/usr/bin/env",
        "arguments": ["/Users/sam/.local/bin/alacritty-color-switcher"]
    },
    {
        "executable": "/usr/bin/env",
        "arguments": ["/Users/sam/.local/bin/nvim-starting-color-switcher"]
    },
    {
        "executable": "/Users/sam/.local/bin/lvim-ctrl",
        "arguments": ["set background={}"]
    },
    {
        "executable": "/Users/sam/.local/bin/cheat-starting-color-switcher",
        "arguments": []
    },
]
```

#### active neovim and lunarvim instances

The `nvim-ctrl` and `lvim-ctrl` scripts both fall into this category. They connect to every running Neovim/LunarVim instance using the RPC API, and run one command, which is specified in `commands.json` as `set background={}`, where `{}` is replaced with either `dark` or `light`. The source code for those scripts is available [on my GitHub](https://github.com/Samasaur1/nvim-ctrl)[^lvim].

[^lvim]: The LunarVim one is slightly changed to find LunarVim instances instead of Neovim instances.

The other three scripts all look more or less like this:
```bash
#!/usr/bin/env bash
#
case "$DARKMODE" in
    1) a="mocha" ;;
    0) a="latte" ;;
    *) echo "Unknown setting" ;;
esac

sed -i "" -e "s#^colors: \*.*#colors: *catppuccin-${a}#g" /Users/sam/.config/alacritty/alacritty.yml
```
(this is `alacritty-color-switcher`). They all replace one line of some config file. The Alacritty one also affects running Alacritty instances, due to live config reload, while the other two scripts affect config files that are only read when the corresponding program starts up.

and it's very easy to add more scripts as needed.
