---
layout: post
title: 'SSH Multiplexing'
tags:
- nixos
- ssh
- macos
---
I often have multiple SSH sessions into the same machine open at the same time. Maybe it's so that I can run an intense program and a system monitor (e.g., btop) at the same time, or to view logs while doing something else, but since I refuse to use `screen` or `tmux` (since I want to be able to use the standard window manager behavior for my terminal windows), I've been opening multiple connections at once. This is not ideal.

Since OpenSSH version 3.9 (August 18, 2004), multiplexing has been supported. This allows multiple SSH sessions to the same host to share the same TCP connection and SSH authentication, vastly reducing startup time and overhead.

<!-- ```
Benchmark 1: ssh -o "ControlMaster=no" beacon true
  Time (mean ± σ):     681.5 ms ±  15.5 ms    [User: 83.4 ms, System: 10.7 ms]
  Range (min … max):   642.0 ms … 696.0 ms    10 runs
```

```
Benchmark 1: ssh beacon true
  Time (mean ± σ):     102.2 ms ±   3.3 ms    [User: 7.2 ms, System: 5.4 ms]
  Range (min … max):    97.9 ms … 106.7 ms    10 runs
``` -->

As best I can tell, enabling SSH multiplexing makes all subsequent connections over five times faster[^benchmarkcommand]:
```
Benchmark 1: ssh -o "ControlMaster=no" beacon true
  Time (mean ± σ):     677.2 ms ±   7.7 ms    [User: 82.5 ms, System: 11.2 ms]
  Range (min … max):   659.7 ms … 688.8 ms    10 runs

Benchmark 2: ssh -o "ControlMaster=auto" beacon true
  Time (mean ± σ):     123.0 ms ± 101.5 ms    [User: 9.6 ms, System: 6.1 ms]
  Range (min … max):    93.8 ms … 640.3 ms    28 runs

  Warning: Statistical outliers were detected. Consider re-running this benchmark on a quiet system without any interferences from other programs. It might help to use the '--warmup' or '--prepare' options.

Summary
  ssh -o "ControlMaster=auto" beacon true ran
    5.51 ± 4.54 times faster than ssh -o "ControlMaster=no" beacon true
```

[^benchmarkcommand]: These were ran with the command `hyperfine 'ssh -o "ControlMaster=no" beacon true' --warmup 1 'ssh -o "ControlMaster=auto" beacon true'`, where `beacon` is a host defined in my SSH config file

https://en.wikibooks.org/wiki/OpenSSH/Cookbook/Multiplexing
https://serverfault.com/questions/710357/enabling-ssh-multiplexing-for-a-series-of-commands-then-closing-it
